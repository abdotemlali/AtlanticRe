"""
Router FastAPI — Prédictions 2030 (Axe 2 / Modélisation Afrique).
Préfixe : /api/predictions/axe2
Accès public — identique à public_overview.py.

Pipeline hybride (notebook axe2_atlanticre_predictions_2030.ipynb, étapes 0–10) :

  Étape 0 : Chargement panel (33 pays × 2015-2024) + features (logs, lags, kaopen dummies, population, regional means)
  Étape 1 : Population — CAGR géométrique 2018-2024 (clip [0%, 4.5%])
  Étape 2a: Inflation — AR(1) mean-reversion par pays
  Étape 2b: Integration + FDI — AR(1) mean-reversion par pays
  Étape 2c: gdp_growth — Ridge hiérarchique (FE pays + interactions ρ_i) + blending Axco
  Étape 3 : gdpcap — FE-OLS + RidgeCV + ARIMA résidus + identité comptable + blending Axco
  Étape 4 : polstab, regqual — Gaussian Process (RBF + WhiteKernel)
  Étape 5 : nv_penetration — FE-OLS + RidgeCV + ARIMA résidus
  Étape 6 : vie_penetration — FE-OLS + RidgeCV + ARIMA résidus (utilise nv_penet_lag)
  Étape 7 : nv_sp — AR(2) + RidgeCV + XGBoost résidus + drift continental
  Étape 8 : Dérivées (nv_primes, nv_densite, vie_primes, vie_densite, gdp)
  Étape 9 : Conformal Prediction (walk-forward 5 splits → q80, q95)
  Étape 10: Tests de cohérence (bornes, IC, alignement Axco)

Le résultat est mis en cache de façon persistante (SQLite via SQLAlchemy) au
premier appel et hydraté en mémoire pour les requêtes suivantes. /refresh
purge l'entrée DB et force le recalcul.
"""
from __future__ import annotations

import glob
import io
import json
import logging
import os
import threading
import time
import warnings
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import SessionLocal, get_db
from models.predictions_cache_model import PredictionsCache

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions/axe2", tags=["Prédictions Axe 2"])


# ════════════════════════════════════════════════════════════════════════════
# CONSTANTES PIPELINE (notebook verbatim)
# ════════════════════════════════════════════════════════════════════════════

YEARS_HIST = list(range(2015, 2025))   # 2015..2024
YEARS_PRED = list(range(2025, 2031))   # 2025..2030
ALL_YEARS = YEARS_HIST + YEARS_PRED

REGIONS = {
    "Afrique du Nord":   ["Algérie", "Égypte", "Maroc", "Tunisie"],
    "Afrique de l'Ouest": ["Bénin", "Burkina Faso", "Cap-Vert", "Côte d'Ivoire",
                            "Ghana", "Mali", "Mauritanie", "Niger", "Nigeria", "Sénégal", "Togo"],
    "Afrique Centrale":  ["Cameroun", "Congo", "Gabon", "RDC", "Tchad"],
    "Afrique de l'Est": ["Burundi", "Éthiopie", "Kenya", "Madagascar", "Mozambique", "Ouganda", "Tanzanie"],
    "Afrique Australe":  ["Angola", "Botswana", "Malawi", "Maurice", "Namibie", "Zambie"],
}
PAYS_TO_REGION = {pays: reg for reg, pays_list in REGIONS.items() for pays in pays_list}

# Étape 1 — Population
CAGR_WINDOW = (2018, 2024)
POP_GROWTH_MIN, POP_GROWTH_MAX = 0.0, 0.045

# Étape 2a — Inflation
INFL_MIN, INFL_MAX = -2.0, 60.0
INFL_RHO_MIN, INFL_RHO_MAX = 0.0, 0.95
INFL_MU_WINDOW = list(range(2018, 2025))

# Étape 2b — Exogènes
EXOG_MU_WINDOW = list(range(2018, 2025))
INTEG_MIN, INTEG_MAX = 0.0, 1.0
INTEG_RHO_MIN, INTEG_RHO_MAX = 0.0, 0.85
FDI_MIN, FDI_MAX = -5.0, 30.0
FDI_RHO_MIN, FDI_RHO_MAX = 0.0, 0.85

# Étape 2c — gdp_growth
GDP_GROWTH_MIN, GDP_GROWTH_MAX = -5.0, 12.0
RHO_MIN, RHO_MAX = -0.5, 0.95
MU_WINDOW_GROWTH = list(range(2018, 2025))
MU_GROWTH_CLIP = (1.0, 8.5)
MU_GROWTH_DEFAULT = 4.2

BRENT_HIST = {2014: 99.0, 2015: 52.4, 2016: 43.7, 2017: 54.2, 2018: 71.0,
              2019: 64.3, 2020: 41.8, 2021: 70.9, 2022: 100.9,
              2023: 82.5, 2024: 80.5}
BRENT_PROJ_FLAT = float(np.mean([BRENT_HIST[y] for y in range(2020, 2025)]))
BRENT_LAG1 = {y: BRENT_HIST[y - 1] for y in range(2015, 2025)}
for _yr in YEARS_PRED:
    BRENT_LAG1[_yr] = BRENT_PROJ_FLAT

BLEND_WEIGHTS = {2025: (0.10, 0.90), 2026: (0.30, 0.70), 2027: (0.50, 0.50)}

# Étape 3 — gdpcap
LOG_RESID_CLAMP = 0.0008

# Étape 4 — WGI
WGI_BOUNDS = (-2.5, 2.5)
WGI_MAX_CHANGE_PER_YEAR = 0.15

# Étape 5 — nv_penetration
NV_PENET_MIN, NV_PENET_MAX = 0.01, 5.0

# Étape 6 — vie_penetration
VIE_PENET_MIN, VIE_PENET_MAX = 0.001, 10.0

# Étape 7 — nv_sp
NV_SP_MIN, NV_SP_MAX = 5.0, 95.0
CONTINENTAL_SP_TREND = -0.29

# Mapping DB (UPPER-EN) → FR canonique (PAYS_33)
DB_COUNTRY_MAP = {
    "ALGERIE": "Algérie", "ANGOLA": "Angola", "BENIN": "Bénin",
    "BOTSWANA": "Botswana", "BURKINA FASO": "Burkina Faso", "BURUNDI": "Burundi",
    "CAMEROON": "Cameroun", "CAPE VERDE": "Cap-Vert", "CHAD": "Tchad",
    "CONGO": "Congo", "EGYPT": "Égypte", "ETHIOPIA": "Éthiopie",
    "GABON": "Gabon", "GHANA": "Ghana", "IVORY COAST": "Côte d'Ivoire",
    "KENYA": "Kenya", "MADAGASCAR": "Madagascar", "MALAWI": "Malawi",
    "MALI": "Mali", "MAURITANIE": "Mauritanie", "MAURITIUS": "Maurice",
    "MOROCCO": "Maroc", "MOZAMBIQUE": "Mozambique", "NAMIBIA": "Namibie",
    "NIGER": "Niger", "NIGERIA": "Nigeria", "SENEGAL": "Sénégal",
    "SOUTH AFRICA": "Afrique du Sud",
    "TANZANIA,UNITED REP.": "Tanzanie", "TANZANIA, UNITED REP.": "Tanzanie",
    "TANZANIA": "Tanzanie",
    "TOGO": "Togo", "TUNISIE": "Tunisie", "UGANDA": "Ouganda",
    "ZAIRE": "RDC", "DR CONGO": "RDC", "ZAMBIA": "Zambie",
}


def _normalize_pays(raw: str | None) -> str | None:
    if raw is None:
        return None
    return DB_COUNTRY_MAP.get(raw, DB_COUNTRY_MAP.get(raw.upper(), raw))


# Mapping Axco EN → FR
AXCO_COUNTRY_MAP = {
    "Algeria": "Algérie", "Angola": "Angola", "Benin": "Bénin", "Botswana": "Botswana",
    "Burkina Faso": "Burkina Faso", "Burundi": "Burundi", "Cameroon": "Cameroun",
    "Cape Verde": "Cap-Vert", "Chad": "Tchad",
    "Congo, Democratic Republic of the": "RDC", "Congo, Republic of the": "Congo",
    "Egypt": "Égypte", "Ethiopia": "Éthiopie", "Ivory Coast": "Côte d'Ivoire",
    "Gabon": "Gabon", "Ghana": "Ghana", "Kenya": "Kenya", "Madagascar": "Madagascar",
    "Malawi": "Malawi", "Mali": "Mali", "Mauritania": "Mauritanie", "Mauritius": "Maurice",
    "Morocco": "Maroc", "Mozambique": "Mozambique", "Namibia": "Namibie", "Niger": "Niger",
    "Nigeria": "Nigeria", "Senegal": "Sénégal", "Tanzania": "Tanzanie", "Togo": "Togo",
    "Tunisia": "Tunisie", "Uganda": "Ouganda", "Zambia": "Zambie",
}

# Métadonnées variables exposées au frontend
TARGET_VARS = ["nv_penetration", "vie_penetration", "nv_sp",
                "gdpcap", "gdp_growth", "polstab", "regqual"]
DERIVED_VARS = ["nv_primes", "nv_densite", "vie_primes", "vie_densite", "gdp"]
ALL_VARS = TARGET_VARS + DERIVED_VARS

VARIABLE_META: dict[str, dict] = {
    "nv_penetration": {
        "label": "Pénétration Non-Vie", "unite": "%", "sens_favorable": "hausse",
        "dimension": "non_vie", "modele": "FE-OLS+Ridge+ARIMA",
    },
    "vie_penetration": {
        "label": "Pénétration Vie", "unite": "%", "sens_favorable": "hausse",
        "dimension": "vie", "modele": "FE-OLS+Ridge+ARIMA",
    },
    "nv_sp": {
        "label": "Ratio S/P Non-Vie", "unite": "%", "sens_favorable": "baisse",
        "dimension": "non_vie", "modele": "AR2+Ridge+XGBoost",
    },
    "gdpcap": {
        "label": "PIB par habitant", "unite": "USD", "sens_favorable": "hausse",
        "dimension": "macro", "modele": "FE-OLS+Ridge+ARIMA",
    },
    "gdp_growth": {
        "label": "Croissance PIB", "unite": "%", "sens_favorable": "hausse",
        "dimension": "macro", "modele": "Ridge-Hierarchique",
    },
    "polstab": {
        "label": "Stabilité Politique", "unite": "indice", "sens_favorable": "hausse",
        "dimension": "gouvernance", "modele": "GaussianProcess",
    },
    "regqual": {
        "label": "Qualité Réglementaire", "unite": "indice", "sens_favorable": "hausse",
        "dimension": "gouvernance", "modele": "GaussianProcess",
    },
    "nv_primes": {
        "label": "Primes Non-Vie", "unite": "Mn USD", "sens_favorable": "hausse",
        "dimension": "non_vie", "modele": "Derived",
    },
    "nv_densite": {
        "label": "Densité Non-Vie", "unite": "USD/hab", "sens_favorable": "hausse",
        "dimension": "non_vie", "modele": "Derived",
    },
    "vie_primes": {
        "label": "Primes Vie", "unite": "Mn USD", "sens_favorable": "hausse",
        "dimension": "vie", "modele": "Derived",
    },
    "vie_densite": {
        "label": "Densité Vie", "unite": "USD/hab", "sens_favorable": "hausse",
        "dimension": "vie", "modele": "Derived",
    },
    "gdp": {
        "label": "PIB Total", "unite": "Mn USD", "sens_favorable": "hausse",
        "dimension": "macro", "modele": "Derived",
    },
}


# ════════════════════════════════════════════════════════════════════════════
# CHARGEMENT DONNÉES (SQLite + Axco)
# ════════════════════════════════════════════════════════════════════════════

def _load_panel_from_db() -> pd.DataFrame:
    """Charge le panel 2015-2024 depuis SQLite et applique les transformations de l'étape 0."""
    from core.database import SessionLocal
    from models.external_db_models import (
        ExtMarcheNonVie, ExtMarcheVie, ExtGouvernance, ExtMacroeconomie
    )

    db = SessionLocal()
    try:
        nv_rows = [
            {"Pays": _normalize_pays(r.pays), "Year": r.annee,
             "nv_primes": r.primes_emises_mn_usd,
             "nv_croissance": r.croissance_primes_pct,
             "nv_penetration": r.taux_penetration_pct,
             "nv_sp": r.ratio_sp_pct,
             "nv_densite": r.densite_assurance_usd}
            for r in db.query(ExtMarcheNonVie).all()
        ]
        vie_rows = [
            {"Pays": _normalize_pays(r.pays), "Year": r.annee,
             "vie_primes": r.primes_emises_mn_usd,
             "vie_croissance": r.croissance_primes_pct,
             "vie_penetration": r.taux_penetration_pct,
             "vie_densite": r.densite_assurance_usd}
            for r in db.query(ExtMarcheVie).all()
        ]
        macro_rows = [
            {"Pays": _normalize_pays(r.pays), "Year": r.annee,
             "gdp_growth": r.gdp_growth_pct,
             "gdpcap": r.gdp_per_capita,
             "gdp": r.gdp_mn,
             "inflation": r.inflation_rate_pct,
             "integration": r.integration_regionale_score,
             "current_account": r.current_account_mn}
            for r in db.query(ExtMacroeconomie).all()
        ]
        gouv_rows = [
            {"Pays": _normalize_pays(r.pays), "Year": r.annee,
             "fdi": r.fdi_inflows_pct_gdp,
             "polstab": r.political_stability,
             "regqual": r.regulatory_quality,
             "kaopen": r.kaopen}
            for r in db.query(ExtGouvernance).all()
        ]
    finally:
        db.close()

    df_nv = pd.DataFrame(nv_rows)
    df_vie = pd.DataFrame(vie_rows)
    df_macro = pd.DataFrame(macro_rows)
    df_gouv = pd.DataFrame(gouv_rows)

    df = df_macro.merge(df_nv, on=["Pays", "Year"], how="inner")
    df = df.merge(df_vie, on=["Pays", "Year"], how="inner")
    df = df.merge(df_gouv, on=["Pays", "Year"], how="inner")

    df = df[df["Pays"] != "Afrique du Sud"].copy()

    df["region"] = df["Pays"].map(PAYS_TO_REGION)
    df = df[df["region"].notna()].copy()

    df = df.sort_values(["Pays", "Year"]).reset_index(drop=True)

    df["log_nv_penetration"] = np.log(df["nv_penetration"].clip(lower=1e-4))
    df["log_vie_penetration"] = np.log(df["vie_penetration"].clip(lower=1e-4))
    df["log_gdpcap"] = np.log(df["gdpcap"].clip(lower=1))
    df["log_nv_primes"] = np.log(df["nv_primes"].clip(lower=1e-4))

    lag_cols = ["gdpcap", "log_gdpcap", "polstab", "regqual", "inflation",
                "nv_penetration", "log_nv_penetration",
                "vie_penetration", "log_vie_penetration",
                "nv_sp", "log_nv_primes", "gdp_growth"]
    for col in lag_cols:
        df[f"{col}_lag1"] = df.groupby("Pays")[col].shift(1)
    df["nv_sp_lag2"] = df.groupby("Pays")["nv_sp"].shift(2)

    df["vie_croissance_w"] = df["vie_croissance"].clip(-50, 100)
    df["nv_croissance_w"] = df["nv_croissance"].clip(-50, 100)

    df["kaopen_group"] = pd.cut(df["kaopen"], bins=[-np.inf, -1.0, 0.5, np.inf],
                                 labels=["ferme", "semi_ouvert", "ouvert"])
    kaopen_dummies = pd.get_dummies(df["kaopen_group"], prefix="kaopen", drop_first=True)
    df = pd.concat([df, kaopen_dummies], axis=1)

    df["population"] = df["gdp"] / df["gdpcap"]

    regional_means = df.groupby(["region", "Year"])[
        ["nv_penetration", "vie_penetration", "gdpcap", "polstab", "regqual"]
    ].mean().reset_index()
    regional_means = regional_means.rename(columns={
        "nv_penetration": "reg_nv_penet_mean",
        "vie_penetration": "reg_vie_penet_mean",
        "gdpcap": "reg_gdpcap_mean",
        "polstab": "reg_polstab_mean",
        "regqual": "reg_regqual_mean",
    })
    df = df.merge(regional_means, on=["region", "Year"], how="left")

    return df


def _load_axco() -> tuple[bool, str | None, dict, dict]:
    """Charge le fichier Axco si présent. Retourne (loaded, filename, gdp_growth_anchor, gdpcap_anchor)."""
    axco_dir = os.environ.get(
        "AXCO_DATA_DIR",
        r"C:\Users\SMAIKI\AtlanticRe\data\external"
    )
    pattern = os.path.join(axco_dir, "Axco-Navigator-Data-Pivot-*.xlsx")
    matches = sorted(glob.glob(pattern))
    if not matches:
        logger.info("Axco Navigator : absent (pattern %s) — modèle ML pur", pattern)
        return False, None, {}, {}

    axco_path = matches[0]
    filename = os.path.basename(axco_path)
    try:
        df_axco_raw = pd.read_excel(axco_path, sheet_name=0, header=3)
    except Exception as exc:
        logger.warning("Axco Navigator : erreur lecture %s — %s", axco_path, exc)
        return False, None, {}, {}

    df_axco_raw = df_axco_raw[pd.to_numeric(df_axco_raw["Year"], errors="coerce").notna()].copy()
    df_axco_raw["Year"] = df_axco_raw["Year"].astype(int)
    df_axco_ref = df_axco_raw[df_axco_raw["Year"].isin([2025, 2026, 2027])].copy()
    df_axco_ref["Pays_FR"] = df_axco_ref["Country"].map(AXCO_COUNTRY_MAP)

    gdp_growth_anchor: dict = {}
    gdpcap_anchor: dict = {}

    for pays_fr in df_axco_ref["Pays_FR"].dropna().unique():
        gdp_growth_anchor[pays_fr] = {}
        gdpcap_anchor[pays_fr] = {}
        sub = df_axco_ref[df_axco_ref["Pays_FR"] == pays_fr]
        for _, row in sub.iterrows():
            yr = int(row["Year"])
            gg = np.nan
            for col_name in ["Annual Real GDP Growth (%)", "GDP Growth (%)", "Real GDP Growth (%)"]:
                if col_name in row.index and not pd.isna(row[col_name]):
                    gg = float(row[col_name])
                    break
            gc = np.nan
            for col_name in ["GDP Per Capita", "GDP per Capita", "GDP Per Capita (USD)"]:
                if col_name in row.index and not pd.isna(row[col_name]):
                    gc = float(row[col_name])
                    break
            if not pd.isna(gg):
                gdp_growth_anchor[pays_fr][yr] = gg
            if not pd.isna(gc):
                gdpcap_anchor[pays_fr][yr] = gc

    logger.info("Axco Navigator chargé : %s (%d pays mappés)",
                filename, len(gdp_growth_anchor))
    return True, filename, gdp_growth_anchor, gdpcap_anchor


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1 — POPULATION
# ════════════════════════════════════════════════════════════════════════════

def _step1_population(df: pd.DataFrame, pays_33: list[str]) -> dict:
    pop_pred: dict = {}
    for pays in pays_33:
        df_p = df[df["Pays"] == pays].sort_values("Year")
        pop_pred[pays] = {}
        for yr in YEARS_HIST:
            v = df_p[df_p["Year"] == yr]["population"].values
            if len(v) > 0 and not pd.isna(v[0]):
                pop_pred[pays][yr] = float(v[0])

        yr_a, yr_b = CAGR_WINDOW
        pop_a = pop_pred[pays].get(yr_a)
        pop_b = pop_pred[pays].get(yr_b)
        if pop_a and pop_b and pop_a > 0:
            cagr = (pop_b / pop_a) ** (1.0 / (yr_b - yr_a)) - 1.0
        else:
            years_avail = sorted(pop_pred[pays].keys())
            if len(years_avail) >= 2:
                ya, yb = years_avail[0], years_avail[-1]
                cagr = (pop_pred[pays][yb] / pop_pred[pays][ya]) ** (1.0 / (yb - ya)) - 1.0
            else:
                cagr = 0.025
        cagr = float(np.clip(cagr, POP_GROWTH_MIN, POP_GROWTH_MAX))

        if 2024 not in pop_pred[pays]:
            continue
        pop_prev = pop_pred[pays][2024]
        for yr in YEARS_PRED:
            pop_next = pop_prev * (1.0 + cagr)
            pop_pred[pays][yr] = float(pop_next)
            pop_prev = pop_next

    return pop_pred


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2a — INFLATION
# ════════════════════════════════════════════════════════════════════════════

def _ar1_mr_project(
    df: pd.DataFrame, pays_33: list[str],
    col: str, mu_window: list[int],
    val_min: float, val_max: float,
    rho_min: float, rho_max: float,
    mu_default: float = 0.0,
    rho_default: float = 0.5,
) -> dict:
    pred: dict = {}
    for pays in pays_33:
        df_p = df[df["Pays"] == pays].sort_values("Year")
        s = df_p[df_p["Year"].isin(mu_window)][col].dropna()
        mu = float(s.mean()) if len(s) > 0 else float(df_p[col].mean())
        if pd.isna(mu):
            mu = mu_default

        df_fit = df_p.dropna(subset=[col])
        df_fit = df_fit.assign(lag=df_fit[col].shift(1)).dropna()
        if len(df_fit) >= 5:
            x = (df_fit["lag"].values - mu).reshape(-1, 1)
            y = (df_fit[col].values - mu)
            try:
                rho = float(np.linalg.lstsq(x, y, rcond=None)[0][0])
            except Exception:
                rho = rho_default
        else:
            rho = rho_default
        rho = float(np.clip(rho, rho_min, rho_max))

        pred[pays] = {}
        for yr in YEARS_HIST:
            v = df_p[df_p["Year"] == yr][col].values
            pred[pays][yr] = float(v[0]) if len(v) > 0 and not pd.isna(v[0]) else mu

        if 2024 not in pred[pays]:
            continue
        prev = pred[pays][2024]
        for yr in YEARS_PRED:
            nxt = rho * (prev - mu) + mu
            nxt = float(np.clip(nxt, val_min, val_max))
            pred[pays][yr] = nxt
            prev = nxt
    return pred


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2c — gdp_growth (Ridge hiérarchique + Axco blending)
# ════════════════════════════════════════════════════════════════════════════

def _step2c_gdp_growth(
    df: pd.DataFrame, pays_33: list[str], inflation_pred: dict,
    axco_loaded: bool, axco_gdp_growth_anchor: dict,
) -> tuple[dict, dict]:
    from sklearn.linear_model import RidgeCV
    from sklearn.preprocessing import StandardScaler

    mu_pays_dict: dict = {}
    for pays in pays_33:
        df_p = df[df["Pays"] == pays].sort_values("Year")
        g_window = df_p[df_p["Year"].isin(MU_WINDOW_GROWTH)]["gdp_growth"].dropna()
        mu_p = float(g_window.mean()) if len(g_window) > 0 else MU_GROWTH_DEFAULT
        mu_pays_dict[pays] = float(np.clip(mu_p, MU_GROWTH_CLIP[0], MU_GROWTH_CLIP[1]))

    df_gdp = df.dropna(subset=["gdp_growth", "gdp_growth_lag1", "inflation_lag1"]).copy()
    df_gdp["brent_lag1"] = df_gdp["Year"].map(BRENT_LAG1)
    df_gdp["mu_pays"] = df_gdp["Pays"].map(mu_pays_dict)
    df_gdp["g_lag_dev"] = df_gdp["gdp_growth_lag1"] - df_gdp["mu_pays"]

    pays_dum_g = pd.get_dummies(df_gdp["Pays"], prefix="pays", drop_first=True).astype(float)
    pays_int_g = pays_dum_g.multiply(df_gdp["g_lag_dev"].values, axis=0)
    pays_int_g.columns = [c.replace("pays_", "rho_") for c in pays_int_g.columns]

    X_g = pd.concat([
        df_gdp[["g_lag_dev", "inflation_lag1", "brent_lag1"]].reset_index(drop=True),
        pays_dum_g.reset_index(drop=True),
        pays_int_g.reset_index(drop=True),
    ], axis=1)
    y_g = df_gdp["gdp_growth"].values - df_gdp["mu_pays"].values

    scaler_g = StandardScaler().fit(X_g.values)
    X_g_sc = scaler_g.transform(X_g.values)

    ridge_g = RidgeCV(alphas=[0.05, 0.5, 1.0, 5.0, 10.0, 30.0, 100.0], cv=5).fit(X_g_sc, y_g)

    feat_names_g = list(X_g.columns)
    n_feat_g = len(feat_names_g)
    idx_glag = feat_names_g.index("g_lag_dev")
    idx_infl = feat_names_g.index("inflation_lag1")
    idx_brent = feat_names_g.index("brent_lag1")

    def build_row_g(pays: str, g_lag_dev_val: float, infl_val: float, brent_val: float) -> np.ndarray:
        row = np.zeros(n_feat_g, dtype=float)
        row[idx_glag] = g_lag_dev_val
        row[idx_infl] = infl_val
        row[idx_brent] = brent_val
        pcol, rcol = f"pays_{pays}", f"rho_{pays}"
        if pcol in feat_names_g:
            row[feat_names_g.index(pcol)] = 1.0
        if rcol in feat_names_g:
            row[feat_names_g.index(rcol)] = g_lag_dev_val
        return row

    gdp_growth_pred: dict = {}
    for pays in pays_33:
        df_p = df[df["Pays"] == pays].sort_values("Year")
        gdp_growth_pred[pays] = {}
        for yr in YEARS_HIST:
            v = df_p[df_p["Year"] == yr]["gdp_growth"].values
            gdp_growth_pred[pays][yr] = float(v[0]) if len(v) > 0 and not pd.isna(v[0]) else mu_pays_dict[pays]

        mu_p = mu_pays_dict[pays]
        g_prev = gdp_growth_pred[pays].get(2024, mu_p)
        for yr in YEARS_PRED:
            row = build_row_g(pays, g_prev - mu_p,
                                inflation_pred.get(pays, {}).get(yr - 1, 0.0),
                                BRENT_LAG1[yr]).reshape(1, -1)
            y_centered = ridge_g.predict(scaler_g.transform(row))[0]
            g_next = float(np.clip(mu_p + y_centered, GDP_GROWTH_MIN, GDP_GROWTH_MAX))
            gdp_growth_pred[pays][yr] = g_next
            g_prev = g_next

    # Axco blending
    if axco_loaded:
        # (A) Blend 2025-2027
        for pays in pays_33:
            for yr in [2025, 2026, 2027]:
                axco_val = axco_gdp_growth_anchor.get(pays, {}).get(yr, np.nan)
                ar_val = gdp_growth_pred[pays].get(yr, np.nan)
                if not (pd.isna(axco_val) or pd.isna(ar_val)):
                    w_ar, w_ax = BLEND_WEIGHTS[yr]
                    blended = w_ar * ar_val + w_ax * axco_val
                    gdp_growth_pred[pays][yr] = float(np.clip(blended, GDP_GROWTH_MIN, GDP_GROWTH_MAX))

        # (B) Structural correction 2028-2030
        for pays in pays_33:
            biases = []
            for yr in [2025, 2026, 2027]:
                axco_val = axco_gdp_growth_anchor.get(pays, {}).get(yr, np.nan)
                ar_val = gdp_growth_pred[pays].get(yr, np.nan)
                if not (pd.isna(axco_val) or pd.isna(ar_val)):
                    biases.append(axco_val - ar_val)
            if len(biases) >= 2:
                avg_bias = float(np.mean(biases))
                for i_yr, yr in enumerate([2028, 2029, 2030]):
                    decay = 0.5 * (0.7 ** i_yr)
                    correction = avg_bias * decay
                    current = gdp_growth_pred[pays].get(yr, np.nan)
                    if not pd.isna(current):
                        gdp_growth_pred[pays][yr] = float(np.clip(
                            current + correction, GDP_GROWTH_MIN, GDP_GROWTH_MAX))

        # (C) Override μ_pays with Axco mean 2025-2027
        for pays in pays_33:
            axco_vals = [axco_gdp_growth_anchor.get(pays, {}).get(yr, np.nan) for yr in [2025, 2026, 2027]]
            axco_vals_valid = [v for v in axco_vals if not pd.isna(v)]
            if len(axco_vals_valid) >= 2:
                mu_axco = float(np.mean(axco_vals_valid))
                mu_pays_dict[pays] = float(np.clip(mu_axco, 1.0, 8.5))

        # (D) Re-project 2028-2030 anchored on 2027
        for pays in pays_33:
            g_start = axco_gdp_growth_anchor.get(pays, {}).get(2027, np.nan)
            if pd.isna(g_start):
                g_start = gdp_growth_pred[pays].get(2027, np.nan)
            if pd.isna(g_start):
                continue
            mu_p = mu_pays_dict[pays]
            g_prev = g_start
            for yr in [2028, 2029, 2030]:
                row = build_row_g(pays, g_prev - mu_p,
                                    inflation_pred.get(pays, {}).get(yr - 1, 0.0),
                                    BRENT_LAG1[yr]).reshape(1, -1)
                y_centered = ridge_g.predict(scaler_g.transform(row))[0]
                g_next = float(np.clip(mu_p + y_centered, GDP_GROWTH_MIN, GDP_GROWTH_MAX))
                gdp_growth_pred[pays][yr] = g_next
                g_prev = g_next

    return gdp_growth_pred, mu_pays_dict


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 — gdpcap (FE-OLS + Ridge + ARIMA + Axco blending)
# ════════════════════════════════════════════════════════════════════════════

def _step3_gdpcap(
    df: pd.DataFrame, pays_33: list[str],
    pop_pred: dict, gdp_growth_pred: dict,
    inflation_pred: dict, integration_pred: dict,
    axco_loaded: bool, axco_gdpcap_anchor: dict,
) -> tuple[dict, dict, dict]:
    from sklearn.linear_model import RidgeCV
    from sklearn.preprocessing import StandardScaler
    from statsmodels.tsa.arima.model import ARIMA

    df_train_gdp = df[df["Year"] >= 2016].dropna(subset=[
        "log_gdpcap", "log_gdpcap_lag1", "gdp_growth", "inflation_lag1",
        "integration", "reg_gdpcap_mean"
    ]).copy()
    df_train_gdp = df_train_gdp.sort_values(["Pays", "Year"]).reset_index(drop=True)
    df_train_gdp["pop_lag1"] = df_train_gdp.groupby("Pays")["population"].shift(1)
    df_train_gdp["pop_growth_hist"] = (df_train_gdp["population"] / df_train_gdp["pop_lag1"] - 1) * 100
    df_train_gdp = df_train_gdp.dropna(subset=["pop_growth_hist"]).copy()

    df_train_gdp["log_resid_gdp"] = (
        df_train_gdp["log_gdpcap"]
        - df_train_gdp["log_gdpcap_lag1"]
        - np.log1p(df_train_gdp["gdp_growth"] / 100.0)
        + np.log1p(df_train_gdp["pop_growth_hist"] / 100.0)
    )

    pays_dummies = pd.get_dummies(df_train_gdp["Pays"], prefix="pays", drop_first=True).astype(float)
    df_train_gdp = pd.concat([df_train_gdp.reset_index(drop=True),
                                pays_dummies.reset_index(drop=True)], axis=1)
    fe_cols = [c for c in df_train_gdp.columns if c.startswith("pays_")]
    feature_cols_gdp = ["log_gdpcap_lag1", "inflation_lag1", "integration", "Year"] + fe_cols

    X_gdp = df_train_gdp[feature_cols_gdp].values
    y_gdp = df_train_gdp["log_resid_gdp"].values
    scaler_gdp = StandardScaler().fit(X_gdp)
    X_gdp_sc = scaler_gdp.transform(X_gdp)
    ridge_gdp = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0, 100.0], cv=5).fit(X_gdp_sc, y_gdp)

    df_train_gdp["residual_gdp"] = y_gdp - ridge_gdp.predict(X_gdp_sc)

    arima_gdp: dict = {}
    for pays in pays_33:
        resid_p = df_train_gdp[df_train_gdp["Pays"] == pays].sort_values("Year")["residual_gdp"].values
        if len(resid_p) >= 4:
            try:
                arima_gdp[pays] = ARIMA(resid_p, order=(1, 0, 0)).fit()
            except Exception:
                arima_gdp[pays] = None
        else:
            arima_gdp[pays] = None

    gdpcap_pred: dict = {}
    gdp_pred: dict = {}
    pop_growth_pred: dict = {}

    for pays in pays_33:
        df_p = df[df["Pays"] == pays].sort_values("Year")
        gdpcap_pred[pays] = {}
        gdp_pred[pays] = {}
        pop_growth_pred[pays] = {}

        for yr in YEARS_HIST:
            row = df_p[df_p["Year"] == yr]
            if len(row) > 0:
                gdpcap_pred[pays][yr] = float(row["gdpcap"].values[0])
                gdp_pred[pays][yr] = float(row["gdp"].values[0])

        for yr in (YEARS_HIST + YEARS_PRED):
            if yr == YEARS_HIST[0]:
                pop_growth_pred[pays][yr] = np.nan
                continue
            pop_t = pop_pred.get(pays, {}).get(yr, np.nan)
            pop_tm1 = pop_pred.get(pays, {}).get(yr - 1, np.nan)
            if pop_tm1 and pop_tm1 > 0:
                pop_growth_pred[pays][yr] = (pop_t / pop_tm1 - 1.0) * 100.0
            else:
                pop_growth_pred[pays][yr] = 0.0

        pays_vec = np.zeros(len(fe_cols))
        col_name = f"pays_{pays}"
        if col_name in fe_cols:
            pays_vec[fe_cols.index(col_name)] = 1.0

        if arima_gdp.get(pays) is not None:
            try:
                arima_forecast = arima_gdp[pays].forecast(steps=6)
            except Exception:
                arima_forecast = np.zeros(6)
        else:
            arima_forecast = np.zeros(6)

        if 2024 not in gdpcap_pred[pays]:
            continue
        log_gdpcap_prev = np.log(gdpcap_pred[pays][2024])

        for i, yr in enumerate(YEARS_PRED):
            infl_lag = inflation_pred.get(pays, {}).get(yr - 1, 0.0)
            integ_t = integration_pred.get(pays, {}).get(yr, 0.5)
            feat_vec = np.array([log_gdpcap_prev, infl_lag, integ_t, yr] + list(pays_vec))
            feat_sc = scaler_gdp.transform(feat_vec.reshape(1, -1))
            log_resid_pred = float(ridge_gdp.predict(feat_sc)[0]) + float(arima_forecast[i])
            log_resid_pred = float(np.clip(log_resid_pred, -LOG_RESID_CLAMP, LOG_RESID_CLAMP))

            g_t = gdp_growth_pred.get(pays, {}).get(yr, 0.0)
            pop_g_t = pop_growth_pred[pays][yr]

            log_gdpcap_t = (log_gdpcap_prev
                            + np.log1p(g_t / 100.0)
                            - np.log1p(pop_g_t / 100.0)
                            + log_resid_pred)
            gdpcap_v = max(float(np.exp(log_gdpcap_t)), 100.0)
            gdpcap_pred[pays][yr] = gdpcap_v
            pop_v = pop_pred.get(pays, {}).get(yr, 1.0)
            gdp_pred[pays][yr] = gdpcap_v * pop_v
            log_gdpcap_prev = log_gdpcap_t

    # Axco blending
    if axco_loaded:
        for pays in pays_33:
            for yr in [2025, 2026, 2027]:
                axco_val = axco_gdpcap_anchor.get(pays, {}).get(yr, np.nan)
                ar_val = gdpcap_pred.get(pays, {}).get(yr, np.nan)
                if not (pd.isna(axco_val) or pd.isna(ar_val)):
                    w_ar, w_ax = BLEND_WEIGHTS[yr]
                    blended = max(w_ar * ar_val + w_ax * axco_val, 100.0)
                    gdpcap_pred[pays][yr] = blended
                    pop_v = pop_pred.get(pays, {}).get(yr, 1.0)
                    gdp_pred[pays][yr] = blended * pop_v

    return gdpcap_pred, gdp_pred, pop_growth_pred


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4 — polstab, regqual (Gaussian Process)
# ════════════════════════════════════════════════════════════════════════════

def _step4_wgi(
    df: pd.DataFrame, pays_33: list[str], gdpcap_pred: dict,
) -> tuple[dict, dict]:
    from sklearn.gaussian_process import GaussianProcessRegressor
    from sklearn.gaussian_process.kernels import RBF, WhiteKernel
    from sklearn.preprocessing import StandardScaler
    from scipy import stats as scipy_stats

    gp_preds: dict = {"polstab": {}, "regqual": {}}
    gp_sigma: dict = {"polstab": {}, "regqual": {}}

    for var in ["polstab", "regqual"]:
        for pays in pays_33:
            df_p = df[df["Pays"] == pays].sort_values("Year").dropna(
                subset=[var, "gdpcap", f"reg_{var}_mean"]
            )
            if len(df_p) < 3:
                gp_preds[var][pays] = {yr: np.nan for yr in ALL_YEARS}
                gp_sigma[var][pays] = {yr: 0.0 for yr in ALL_YEARS}
                continue

            X_gp = np.column_stack([
                df_p["Year"].values,
                np.log(df_p["gdpcap"].clip(lower=1).values),
                df_p[f"reg_{var}_mean"].values
            ])
            y_gp = df_p[var].values

            sc = StandardScaler().fit(X_gp)
            X_gp_sc = sc.transform(X_gp)

            kernel = (RBF(length_scale=3.0, length_scale_bounds=(0.1, 50.0))
                      + WhiteKernel(noise_level=0.01, noise_level_bounds=(1e-5, 1.0)))
            try:
                gpr = GaussianProcessRegressor(
                    kernel=kernel, n_restarts_optimizer=5,
                    normalize_y=True, random_state=42
                )
                gpr.fit(X_gp_sc, y_gp)
            except Exception:
                gp_preds[var][pays] = {yr: float(y_gp.mean()) for yr in ALL_YEARS}
                gp_sigma[var][pays] = {yr: 0.0 for yr in ALL_YEARS}
                continue

            gp_preds[var][pays] = {}
            gp_sigma[var][pays] = {}

            for yr in YEARS_HIST:
                row = df_p[df_p["Year"] == yr]
                gp_preds[var][pays][yr] = float(row[var].values[0]) if len(row) > 0 else float(y_gp.mean())
                gp_sigma[var][pays][yr] = 0.0

            reg_col = f"reg_{var}_mean"
            reg_hist = df_p[[reg_col, "Year"]].dropna()
            if len(reg_hist) >= 2:
                s, b, _, _, _ = scipy_stats.linregress(reg_hist["Year"], reg_hist[reg_col])
            else:
                s, b = 0.0, float(df_p[var].mean())

            for yr in YEARS_PRED:
                reg_trend = s * yr + b
                gdpcap_f = gdpcap_pred.get(pays, {}).get(yr, 1000.0)
                X_fut = np.array([[yr, np.log(max(gdpcap_f, 1)), reg_trend]])
                X_fut_sc = sc.transform(X_fut)
                try:
                    y_f, sigma_f = gpr.predict(X_fut_sc, return_std=True)
                    raw_pred = float(y_f[0])
                    sigma_v = float(sigma_f[0])
                except Exception:
                    raw_pred = gp_preds[var][pays][yr - 1]
                    sigma_v = 0.0

                prev_val = gp_preds[var][pays][yr - 1]
                constrained = float(np.clip(raw_pred,
                                              prev_val - WGI_MAX_CHANGE_PER_YEAR,
                                              prev_val + WGI_MAX_CHANGE_PER_YEAR))
                constrained = float(np.clip(constrained, WGI_BOUNDS[0], WGI_BOUNDS[1]))
                gp_preds[var][pays][yr] = constrained
                gp_sigma[var][pays][yr] = sigma_v

    return gp_preds, gp_sigma


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5 — nv_penetration
# ════════════════════════════════════════════════════════════════════════════

def _step5_nv_penetration(
    df: pd.DataFrame, pays_33: list[str],
    gdpcap_pred: dict, gp_preds: dict, integration_pred: dict,
) -> dict:
    from sklearn.linear_model import RidgeCV
    from sklearn.preprocessing import StandardScaler
    from statsmodels.tsa.arima.model import ARIMA

    df_train_nv = df[df["Year"] >= 2016].dropna(subset=[
        "log_nv_penetration", "log_nv_penetration_lag1",
        "log_gdpcap_lag1", "polstab_lag1", "regqual_lag1",
        "inflation_lag1", "integration"
    ]).copy()

    pays_dum_nv = pd.get_dummies(df_train_nv["Pays"], prefix="pays", drop_first=True).astype(float)
    df_train_nv = pd.concat([df_train_nv.reset_index(drop=True),
                              pays_dum_nv.reset_index(drop=True)], axis=1)
    fe_cols_nv = [c for c in df_train_nv.columns if c.startswith("pays_")]

    feature_cols_nv = (["log_nv_penetration_lag1", "log_gdpcap_lag1",
                          "polstab_lag1", "regqual_lag1",
                          "inflation_lag1", "integration", "Year"] + fe_cols_nv)
    df_train_nv = df_train_nv.dropna(subset=feature_cols_nv)
    X_nv = df_train_nv[feature_cols_nv].values
    y_nv = df_train_nv["log_nv_penetration"].values
    scaler_nv = StandardScaler().fit(X_nv)
    ridge_nv = RidgeCV(alphas=[0.01, 0.1, 1, 10, 100], cv=5).fit(scaler_nv.transform(X_nv), y_nv)

    df_train_nv["residual_nv"] = y_nv - ridge_nv.predict(scaler_nv.transform(X_nv))

    arima_nv: dict = {}
    for pays in pays_33:
        resid_p = df_train_nv[df_train_nv["Pays"] == pays].sort_values("Year")["residual_nv"].values
        if len(resid_p) >= 4:
            try:
                arima_nv[pays] = ARIMA(resid_p, order=(1, 0, 0)).fit()
            except Exception:
                arima_nv[pays] = None
        else:
            arima_nv[pays] = None

    nv_penet_pred: dict = {}
    for pays in pays_33:
        nv_penet_pred[pays] = {}
        df_p = df[df["Pays"] == pays].sort_values("Year")
        for yr in YEARS_HIST:
            row = df_p[df_p["Year"] == yr]
            nv_penet_pred[pays][yr] = float(row["nv_penetration"].values[0]) if len(row) > 0 else np.nan

        if 2024 not in nv_penet_pred[pays] or pd.isna(nv_penet_pred[pays][2024]):
            for yr in YEARS_PRED:
                nv_penet_pred[pays][yr] = np.nan
            continue

        pays_vec_nv = np.zeros(len(fe_cols_nv))
        col_name = f"pays_{pays}"
        if col_name in fe_cols_nv:
            pays_vec_nv[fe_cols_nv.index(col_name)] = 1

        last_infl = float(df_p["inflation"].iloc[-1]) if len(df_p) > 0 and not pd.isna(df_p["inflation"].iloc[-1]) else 7.0

        if arima_nv.get(pays) is not None:
            try:
                nv_arima_fc = arima_nv[pays].forecast(steps=6)
            except Exception:
                nv_arima_fc = np.zeros(6)
        else:
            nv_arima_fc = np.zeros(6)

        log_nv_prev = np.log(max(nv_penet_pred[pays][2024], NV_PENET_MIN))

        for i, yr in enumerate(YEARS_PRED):
            log_gdpcap_f = np.log(max(gdpcap_pred.get(pays, {}).get(yr, 1.0), 1))
            polstab_f_lag = gp_preds["polstab"].get(pays, {}).get(yr - 1, 0.0)
            regqual_f_lag = gp_preds["regqual"].get(pays, {}).get(yr - 1, 0.0)

            feat = np.array([log_nv_prev, log_gdpcap_f, polstab_f_lag, regqual_f_lag,
                              last_infl, integration_pred.get(pays, {}).get(yr, 0.5),
                              yr] + list(pays_vec_nv))
            feat_sc = scaler_nv.transform(feat.reshape(1, -1))
            log_nv_ridge = ridge_nv.predict(feat_sc)[0]
            log_nv_final = log_nv_ridge + nv_arima_fc[i]
            nv_v = float(np.clip(np.exp(log_nv_final), NV_PENET_MIN, NV_PENET_MAX))
            nv_penet_pred[pays][yr] = nv_v
            log_nv_prev = np.log(nv_v)

    return nv_penet_pred


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6 — vie_penetration
# ════════════════════════════════════════════════════════════════════════════

def _step6_vie_penetration(
    df: pd.DataFrame, pays_33: list[str],
    gdpcap_pred: dict, gp_preds: dict, integration_pred: dict,
    nv_penet_pred: dict,
) -> dict:
    from sklearn.linear_model import RidgeCV
    from sklearn.preprocessing import StandardScaler
    from statsmodels.tsa.arima.model import ARIMA

    df_train_vie = df[df["Year"] >= 2016].dropna(subset=[
        "log_vie_penetration", "log_vie_penetration_lag1",
        "log_gdpcap_lag1", "polstab_lag1", "regqual_lag1",
        "inflation_lag1", "integration", "log_nv_penetration_lag1"
    ]).copy()

    pays_dum_vie = pd.get_dummies(df_train_vie["Pays"], prefix="pays", drop_first=True).astype(float)
    df_train_vie = pd.concat([df_train_vie.reset_index(drop=True),
                                pays_dum_vie.reset_index(drop=True)], axis=1)
    fe_cols_vie = [c for c in df_train_vie.columns if c.startswith("pays_")]

    feature_cols_vie = (["log_vie_penetration_lag1", "log_gdpcap_lag1",
                            "polstab_lag1", "regqual_lag1",
                            "inflation_lag1", "integration",
                            "log_nv_penetration_lag1", "Year"] + fe_cols_vie)
    df_train_vie = df_train_vie.dropna(subset=feature_cols_vie)
    X_vie = df_train_vie[feature_cols_vie].values
    y_vie = df_train_vie["log_vie_penetration"].values
    scaler_vie = StandardScaler().fit(X_vie)
    ridge_vie = RidgeCV(alphas=[0.01, 0.1, 1, 10, 100], cv=5).fit(scaler_vie.transform(X_vie), y_vie)

    df_train_vie["residual_vie"] = y_vie - ridge_vie.predict(scaler_vie.transform(X_vie))

    arima_vie: dict = {}
    for pays in pays_33:
        resid_p = df_train_vie[df_train_vie["Pays"] == pays].sort_values("Year")["residual_vie"].values
        if len(resid_p) >= 4:
            try:
                arima_vie[pays] = ARIMA(resid_p, order=(1, 0, 0)).fit()
            except Exception:
                arima_vie[pays] = None
        else:
            arima_vie[pays] = None

    vie_penet_pred: dict = {}
    for pays in pays_33:
        vie_penet_pred[pays] = {}
        df_p = df[df["Pays"] == pays].sort_values("Year")
        for yr in YEARS_HIST:
            row = df_p[df_p["Year"] == yr]
            vie_penet_pred[pays][yr] = float(row["vie_penetration"].values[0]) if len(row) > 0 else np.nan

        if 2024 not in vie_penet_pred[pays] or pd.isna(vie_penet_pred[pays][2024]):
            for yr in YEARS_PRED:
                vie_penet_pred[pays][yr] = np.nan
            continue

        pays_vec_vie = np.zeros(len(fe_cols_vie))
        col_name = f"pays_{pays}"
        if col_name in fe_cols_vie:
            pays_vec_vie[fe_cols_vie.index(col_name)] = 1

        last_infl = float(df_p["inflation"].iloc[-1]) if len(df_p) > 0 and not pd.isna(df_p["inflation"].iloc[-1]) else 7.0

        if arima_vie.get(pays) is not None:
            try:
                vie_arima_fc = arima_vie[pays].forecast(steps=6)
            except Exception:
                vie_arima_fc = np.zeros(6)
        else:
            vie_arima_fc = np.zeros(6)

        log_vie_prev = np.log(max(vie_penet_pred[pays][2024], VIE_PENET_MIN))

        for i, yr in enumerate(YEARS_PRED):
            log_gdpcap_f = np.log(max(gdpcap_pred.get(pays, {}).get(yr, 1.0), 1))
            polstab_f_lag = gp_preds["polstab"].get(pays, {}).get(yr - 1, 0.0)
            regqual_f_lag = gp_preds["regqual"].get(pays, {}).get(yr - 1, 0.0)
            log_nv_f_lag = np.log(max(nv_penet_pred.get(pays, {}).get(yr - 1, NV_PENET_MIN), NV_PENET_MIN))

            feat = np.array([log_vie_prev, log_gdpcap_f, polstab_f_lag, regqual_f_lag,
                              last_infl, integration_pred.get(pays, {}).get(yr, 0.5),
                              log_nv_f_lag, yr] + list(pays_vec_vie))
            feat_sc = scaler_vie.transform(feat.reshape(1, -1))
            log_vie_final = ridge_vie.predict(feat_sc)[0] + vie_arima_fc[i]
            vie_v = float(np.clip(np.exp(log_vie_final), VIE_PENET_MIN, VIE_PENET_MAX))
            vie_penet_pred[pays][yr] = vie_v
            log_vie_prev = np.log(vie_v)

    return vie_penet_pred


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 7 — nv_sp (AR2 + Ridge + XGBoost)
# ════════════════════════════════════════════════════════════════════════════

def _step7_nv_sp(
    df: pd.DataFrame, pays_33: list[str],
    gp_preds: dict, nv_penet_pred: dict, gdp_pred: dict,
    gdp_growth_pred: dict, fdi_pred: dict,
) -> dict:
    from sklearn.linear_model import RidgeCV
    from sklearn.preprocessing import StandardScaler
    import xgboost as xgb

    df_train_sp = df[df["Year"] >= 2017].dropna(subset=[
        "nv_sp", "nv_sp_lag1", "nv_sp_lag2",
        "inflation_lag1", "polstab", "log_nv_primes",
        "gdp_growth", "fdi"
    ]).copy()

    pays_dum_sp = pd.get_dummies(df_train_sp["Pays"], prefix="pays", drop_first=True).astype(float)
    df_train_sp = pd.concat([df_train_sp.reset_index(drop=True),
                                pays_dum_sp.reset_index(drop=True)], axis=1)
    fe_cols_sp = [c for c in df_train_sp.columns if c.startswith("pays_")]

    feature_cols_sp = (["nv_sp_lag1", "nv_sp_lag2", "inflation_lag1", "polstab",
                          "log_nv_primes", "gdp_growth"] + fe_cols_sp)
    df_train_sp = df_train_sp.dropna(subset=feature_cols_sp)
    X_sp = df_train_sp[feature_cols_sp].values
    y_sp = df_train_sp["nv_sp"].values
    scaler_sp = StandardScaler().fit(X_sp)
    ridge_sp = RidgeCV(alphas=[0.01, 0.1, 1, 10, 100], cv=5).fit(scaler_sp.transform(X_sp), y_sp)

    sp_pred_l1 = ridge_sp.predict(scaler_sp.transform(X_sp))
    sp_residuals = y_sp - sp_pred_l1
    df_train_sp["residual_sp"] = sp_residuals

    region_dum_sp = pd.get_dummies(df_train_sp["region"], prefix="reg", drop_first=True).astype(float)
    df_train_sp = pd.concat([df_train_sp.reset_index(drop=True),
                              region_dum_sp.reset_index(drop=True)], axis=1)
    reg_cols_sp = [c for c in df_train_sp.columns if c.startswith("reg_")]

    feature_cols_xgb = (["nv_sp_lag1", "nv_sp_lag2", "inflation_lag1", "polstab",
                            "log_nv_primes", "gdp_growth", "fdi"] + reg_cols_sp)
    feature_cols_xgb = [f for f in feature_cols_xgb if f in df_train_sp.columns]
    X_xgb = df_train_sp[feature_cols_xgb].fillna(0).values
    y_xgb = df_train_sp["residual_sp"].values

    xgb_model = xgb.XGBRegressor(
        max_depth=3, n_estimators=50, learning_rate=0.05,
        min_child_weight=5, subsample=0.8, colsample_bytree=0.7,
        reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0
    )
    xgb_model.fit(X_xgb, y_xgb)

    nv_sp_pred: dict = {}
    for pays in pays_33:
        nv_sp_pred[pays] = {}
        df_p = df[df["Pays"] == pays].sort_values("Year")
        for yr in YEARS_HIST:
            row = df_p[df_p["Year"] == yr]
            nv_sp_pred[pays][yr] = float(row["nv_sp"].values[0]) if len(row) > 0 else np.nan

        if 2024 not in nv_sp_pred[pays] or pd.isna(nv_sp_pred[pays][2024]):
            for yr in YEARS_PRED:
                nv_sp_pred[pays][yr] = np.nan
            continue

        pays_vec_sp = np.zeros(len(fe_cols_sp))
        col_name = f"pays_{pays}"
        if col_name in fe_cols_sp:
            pays_vec_sp[fe_cols_sp.index(col_name)] = 1

        reg_vec = np.zeros(len(reg_cols_sp))
        reg_name = PAYS_TO_REGION.get(pays, "")
        col_reg = f"reg_{reg_name}"
        if col_reg in reg_cols_sp:
            reg_vec[reg_cols_sp.index(col_reg)] = 1

        last_infl = float(df_p["inflation"].iloc[-1]) if len(df_p) > 0 and not pd.isna(df_p["inflation"].iloc[-1]) else 7.0

        sp_prev2 = nv_sp_pred[pays].get(2023, nv_sp_pred[pays][2024])
        sp_prev1 = nv_sp_pred[pays][2024]
        if pd.isna(sp_prev2):
            sp_prev2 = sp_prev1

        for yr in YEARS_PRED:
            polstab_f = gp_preds["polstab"].get(pays, {}).get(yr, 0.0)
            nv_penet_f = nv_penet_pred.get(pays, {}).get(yr, 1.0)
            gdp_f = gdp_pred.get(pays, {}).get(yr, 1000.0)
            nv_primes_f = nv_penet_f * gdp_f / 100
            log_nv_primes_f = np.log(max(nv_primes_f, 1e-4))
            gdp_gr_f = gdp_growth_pred.get(pays, {}).get(yr, 0.0)

            feat_sp = np.array([sp_prev1, sp_prev2, last_infl, polstab_f,
                                 log_nv_primes_f, gdp_gr_f] + list(pays_vec_sp))
            feat_sp_sc = scaler_sp.transform(feat_sp.reshape(1, -1))
            sp_l1 = ridge_sp.predict(feat_sp_sc)[0]

            feat_xgb = np.array([sp_prev1, sp_prev2, last_infl, polstab_f,
                                   log_nv_primes_f, gdp_gr_f,
                                   fdi_pred.get(pays, {}).get(yr, 2.0)] + list(reg_vec))
            sp_l2 = xgb_model.predict(feat_xgb.reshape(1, -1))[0]

            sp_combined = sp_l1 + sp_l2 + CONTINENTAL_SP_TREND
            sp_v = float(np.clip(sp_combined, NV_SP_MIN, NV_SP_MAX))
            nv_sp_pred[pays][yr] = sp_v
            sp_prev2 = sp_prev1
            sp_prev1 = sp_v

    return nv_sp_pred


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 8 — Variables dérivées
# ════════════════════════════════════════════════════════════════════════════

def _step8_derived(
    df: pd.DataFrame, pays_33: list[str],
    pop_pred: dict, nv_penet_pred: dict, vie_penet_pred: dict, gdp_pred: dict,
) -> tuple[dict, dict, dict, dict, dict, dict]:
    nv_primes_pred: dict = {}
    nv_densite_pred: dict = {}
    vie_primes_pred: dict = {}
    vie_densite_pred: dict = {}
    nv_croissance_pred: dict = {}
    vie_croissance_pred: dict = {}

    for pays in pays_33:
        nv_primes_pred[pays] = {}
        nv_densite_pred[pays] = {}
        vie_primes_pred[pays] = {}
        vie_densite_pred[pays] = {}
        nv_croissance_pred[pays] = {}
        vie_croissance_pred[pays] = {}

        df_p = df[df["Pays"] == pays].sort_values("Year")

        for yr in ALL_YEARS:
            pop = pop_pred.get(pays, {}).get(yr, np.nan)
            if yr in YEARS_HIST:
                row = df_p[df_p["Year"] == yr]
                nv_primes_pred[pays][yr] = float(row["nv_primes"].values[0]) if len(row) > 0 and not pd.isna(row["nv_primes"].values[0]) else np.nan
                nv_densite_pred[pays][yr] = float(row["nv_densite"].values[0]) if len(row) > 0 and not pd.isna(row["nv_densite"].values[0]) else np.nan
                vie_primes_pred[pays][yr] = float(row["vie_primes"].values[0]) if len(row) > 0 and not pd.isna(row["vie_primes"].values[0]) else np.nan
                vie_densite_pred[pays][yr] = float(row["vie_densite"].values[0]) if len(row) > 0 and not pd.isna(row["vie_densite"].values[0]) else np.nan
            else:
                nv_p = nv_penet_pred.get(pays, {}).get(yr, np.nan)
                vie_p = vie_penet_pred.get(pays, {}).get(yr, np.nan)
                gdp_f = gdp_pred.get(pays, {}).get(yr, np.nan)
                nv_pr = nv_p * gdp_f / 100 if not (pd.isna(nv_p) or pd.isna(gdp_f)) else np.nan
                vie_pr = vie_p * gdp_f / 100 if not (pd.isna(vie_p) or pd.isna(gdp_f)) else np.nan
                nv_primes_pred[pays][yr] = nv_pr
                vie_primes_pred[pays][yr] = vie_pr
                nv_densite_pred[pays][yr] = (nv_pr / pop) if pop and pop > 0 and not pd.isna(nv_pr) else np.nan
                vie_densite_pred[pays][yr] = (vie_pr / pop) if pop and pop > 0 and not pd.isna(vie_pr) else np.nan

        for yr in YEARS_PRED:
            pr_t = nv_primes_pred[pays][yr]
            pr_t1 = nv_primes_pred[pays].get(yr - 1, np.nan)
            nv_croissance_pred[pays][yr] = ((pr_t / pr_t1) - 1) * 100 if pr_t1 and pr_t1 > 0 and not pd.isna(pr_t) else np.nan
            vpr_t = vie_primes_pred[pays][yr]
            vpr_t1 = vie_primes_pred[pays].get(yr - 1, np.nan)
            vie_croissance_pred[pays][yr] = ((vpr_t / vpr_t1) - 1) * 100 if vpr_t1 and vpr_t1 > 0 and not pd.isna(vpr_t) else np.nan

    return nv_primes_pred, nv_densite_pred, vie_primes_pred, vie_densite_pred, nv_croissance_pred, vie_croissance_pred


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 9 — Conformal Prediction (walk-forward simplifié)
# ════════════════════════════════════════════════════════════════════════════

def _step9_conformal(
    df: pd.DataFrame, pays_33: list[str],
    gp_sigma: dict,
) -> tuple[dict, dict]:
    """
    Conformal Prediction par walk-forward simplifié.

    Pour chaque variable cible (4 ridge-modèles), on entraîne 5 fois en excluant
    successivement chaque année de [2020..2024], on prédit l'année tenue à part,
    et on accumule les résidus absolus → quantiles q80, q95.

    Pour polstab/regqual on utilise la std native du GP (1.28σ pour 80%, 1.96σ
    pour 95%) comme dans le notebook — pas de conformal explicite.
    """
    from sklearn.linear_model import RidgeCV
    from sklearn.preprocessing import StandardScaler

    conformal_q: dict = {}
    wf_metrics: dict = {}
    eval_years = [2020, 2021, 2022, 2023, 2024]

    # ── Helpers : refit sur sous-ensemble année ───────────────────────────────
    def fit_predict_log(target_col: str, lag_col: str, extra_lags: list[str]) -> tuple[list, list]:
        """Walk-forward pour ridge en log avec FE pays."""
        residuals_pairs: list = []
        for test_year in eval_years:
            df_tr = df[df["Year"] < test_year].dropna(subset=[target_col, lag_col] + extra_lags + ["integration", "Year"]).copy()
            df_te = df[df["Year"] == test_year].dropna(subset=[lag_col] + extra_lags + ["integration"]).copy()
            if len(df_tr) < 20:
                continue
            pdum_tr = pd.get_dummies(df_tr["Pays"], prefix="pays", drop_first=True).astype(float)
            df_tr2 = pd.concat([df_tr.reset_index(drop=True), pdum_tr.reset_index(drop=True)], axis=1)
            fe = [c for c in df_tr2.columns if c.startswith("pays_")]
            fc = [lag_col] + extra_lags + ["integration", "Year"] + fe
            df_tr2 = df_tr2.dropna(subset=fc)
            if len(df_tr2) < 20:
                continue

            X = df_tr2[fc].values
            y = df_tr2[target_col].values
            sc = StandardScaler().fit(X)
            rg = RidgeCV(alphas=[0.01, 0.1, 1, 10, 100], cv=min(5, len(df_tr2))).fit(sc.transform(X), y)

            for _, row in df_te.iterrows():
                pays = row["Pays"]
                feat = []
                for f in fc:
                    if f.startswith("pays_"):
                        feat.append(1.0 if f == f"pays_{pays}" else 0.0)
                    else:
                        v = row.get(f, np.nan)
                        if pd.isna(v):
                            feat = None
                            break
                        feat.append(float(v))
                if feat is None or len(feat) != len(fc):
                    continue
                pred_log = float(rg.predict(sc.transform(np.array(feat).reshape(1, -1)))[0])
                residuals_pairs.append((row[target_col], pred_log))
        return residuals_pairs

    # nv_penetration (in log space → exponentiate before residual)
    pairs = fit_predict_log(
        "log_nv_penetration", "log_nv_penetration_lag1",
        ["log_gdpcap_lag1", "polstab_lag1", "regqual_lag1", "inflation_lag1"]
    )
    pairs_real = []
    for log_true, log_pred in pairs:
        try:
            true_v = float(np.exp(log_true))
            pred_v = float(np.clip(np.exp(log_pred), NV_PENET_MIN, NV_PENET_MAX))
            pairs_real.append((true_v, pred_v))
        except Exception:
            continue
    _accumulate_metrics("nv_penetration", pairs_real, conformal_q, wf_metrics)
    _add_log_quantiles("nv_penetration", pairs, conformal_q)  # FIX [A3]

    # vie_penetration
    pairs = fit_predict_log(
        "log_vie_penetration", "log_vie_penetration_lag1",
        ["log_gdpcap_lag1", "polstab_lag1", "regqual_lag1", "inflation_lag1", "log_nv_penetration_lag1"]
    )
    pairs_real = []
    for log_true, log_pred in pairs:
        try:
            true_v = float(np.exp(log_true))
            pred_v = float(np.clip(np.exp(log_pred), VIE_PENET_MIN, VIE_PENET_MAX))
            pairs_real.append((true_v, pred_v))
        except Exception:
            continue
    _accumulate_metrics("vie_penetration", pairs_real, conformal_q, wf_metrics)
    _add_log_quantiles("vie_penetration", pairs, conformal_q)  # FIX [A3]

    # gdpcap (log space)
    pairs = fit_predict_log(
        "log_gdpcap", "log_gdpcap_lag1",
        ["polstab_lag1", "regqual_lag1", "inflation_lag1"]
    )
    pairs_real = []
    for log_true, log_pred in pairs:
        try:
            true_v = float(np.exp(log_true))
            pred_v = max(float(np.exp(log_pred)), 100.0)
            pairs_real.append((true_v, pred_v))
        except Exception:
            continue
    _accumulate_metrics("gdpcap", pairs_real, conformal_q, wf_metrics)
    _add_log_quantiles("gdpcap", pairs, conformal_q)  # FIX [A3]

    # nv_sp (linear space) — simple Ridge
    pairs_sp: list = []
    for test_year in eval_years:
        df_tr = df[df["Year"] < test_year].dropna(subset=[
            "nv_sp", "nv_sp_lag1", "nv_sp_lag2", "inflation_lag1", "polstab",
            "log_nv_primes", "gdp_growth"
        ]).copy()
        df_te = df[df["Year"] == test_year].dropna(subset=[
            "nv_sp", "nv_sp_lag1", "nv_sp_lag2", "inflation_lag1", "polstab",
            "log_nv_primes", "gdp_growth"
        ]).copy()
        if len(df_tr) < 20:
            continue
        pdum_tr = pd.get_dummies(df_tr["Pays"], prefix="pays", drop_first=True).astype(float)
        df_tr2 = pd.concat([df_tr.reset_index(drop=True), pdum_tr.reset_index(drop=True)], axis=1)
        fe = [c for c in df_tr2.columns if c.startswith("pays_")]
        fc = ["nv_sp_lag1", "nv_sp_lag2", "inflation_lag1", "polstab",
              "log_nv_primes", "gdp_growth"] + fe
        df_tr2 = df_tr2.dropna(subset=fc)
        if len(df_tr2) < 20:
            continue
        X = df_tr2[fc].values
        y = df_tr2["nv_sp"].values
        sc = StandardScaler().fit(X)
        rg = RidgeCV(alphas=[0.01, 0.1, 1, 10, 100], cv=min(5, len(df_tr2))).fit(sc.transform(X), y)

        for _, row in df_te.iterrows():
            pays = row["Pays"]
            feat = []
            valid = True
            for f in fc:
                if f.startswith("pays_"):
                    feat.append(1.0 if f == f"pays_{pays}" else 0.0)
                else:
                    v = row.get(f, np.nan)
                    if pd.isna(v):
                        valid = False
                        break
                    feat.append(float(v))
            if not valid or len(feat) != len(fc):
                continue
            pred_v = float(np.clip(rg.predict(sc.transform(np.array(feat).reshape(1, -1)))[0],
                                     NV_SP_MIN, NV_SP_MAX))
            pairs_sp.append((float(row["nv_sp"]), pred_v))
    _accumulate_metrics("nv_sp", pairs_sp, conformal_q, wf_metrics)

    # FIX [A1] — gdp_growth : walk-forward conformal (Ridge hiérarchique simplifié)
    # Le notebook fait du blending Axco mais la pipeline ne calibrait pas d'IC.
    # On refait un Ridge simple (g_lag_dev + inflation_lag1 + brent_lag1 + FE pays),
    # split temporel 2020-2024, et on calibre q80/q95 sur résidus en %.
    pairs_gg: list = []
    for test_year in eval_years:
        df_tr = df[df["Year"] < test_year].dropna(subset=[
            "gdp_growth", "gdp_growth_lag1", "inflation_lag1"
        ]).copy()
        df_te = df[df["Year"] == test_year].dropna(subset=[
            "gdp_growth", "gdp_growth_lag1", "inflation_lag1"
        ]).copy()
        if len(df_tr) < 20:
            continue

        mu_dict = df_tr.groupby("Pays")["gdp_growth"].mean().to_dict()
        df_tr["mu_pays"] = df_tr["Pays"].map(mu_dict)
        df_tr["g_lag_dev"] = df_tr["gdp_growth_lag1"] - df_tr["mu_pays"]
        df_tr["brent_lag1"] = df_tr["Year"].map(BRENT_LAG1)
        df_tr["y_centered"] = df_tr["gdp_growth"] - df_tr["mu_pays"]
        df_tr = df_tr.dropna(subset=["g_lag_dev", "brent_lag1", "y_centered"])
        if len(df_tr) < 20:
            continue

        pdum_tr = pd.get_dummies(df_tr["Pays"], prefix="pays", drop_first=True).astype(float)
        df_tr2 = pd.concat([df_tr.reset_index(drop=True),
                              pdum_tr.reset_index(drop=True)], axis=1)
        fe = [c for c in df_tr2.columns if c.startswith("pays_")]
        fc = ["g_lag_dev", "inflation_lag1", "brent_lag1"] + fe

        X = df_tr2[fc].values
        y = df_tr2["y_centered"].values
        sc = StandardScaler().fit(X)
        rg = RidgeCV(alphas=[0.1, 1, 10, 100], cv=min(5, len(df_tr2))).fit(sc.transform(X), y)

        for _, row in df_te.iterrows():
            pays = row["Pays"]
            mu_p = float(mu_dict.get(pays, MU_GROWTH_DEFAULT))
            g_lag = row.get("gdp_growth_lag1")
            infl = row.get("inflation_lag1")
            brent = BRENT_LAG1.get(int(row["Year"]))
            if pd.isna(g_lag) or pd.isna(infl) or brent is None:
                continue
            feat = [float(g_lag - mu_p), float(infl), float(brent)]
            for f in fe:
                feat.append(1.0 if f == f"pays_{pays}" else 0.0)
            pred_centered = float(rg.predict(sc.transform(np.array(feat).reshape(1, -1)))[0])
            pred_v = float(np.clip(mu_p + pred_centered, GDP_GROWTH_MIN, GDP_GROWTH_MAX))
            pairs_gg.append((float(row["gdp_growth"]), pred_v))
    _accumulate_metrics("gdp_growth", pairs_gg, conformal_q, wf_metrics)

    # polstab/regqual : utiliser σ moyen du GP comme proxy de "qualité du modèle"
    for var in ["polstab", "regqual"]:
        # Pas de conformal explicite — IC = z * σ_GP en step build_df_pred
        sigmas = []
        for pays in pays_33:
            for yr in YEARS_PRED:
                s = gp_sigma.get(var, {}).get(pays, {}).get(yr, 0.0)
                if s and not pd.isna(s):
                    sigmas.append(s)
        mean_sigma = float(np.mean(sigmas)) if sigmas else 0.1
        conformal_q[var] = {"q80": mean_sigma * 1.28, "q95": mean_sigma * 1.96}
        # Métriques d'évaluation : in-sample sur 2020-2024 (le GP fit toutes années → pas de "test set" stricto sensu)
        true_pairs = []
        for pays in pays_33:
            df_p = df[df["Pays"] == pays].sort_values("Year")
            for yr in eval_years:
                row = df_p[df_p["Year"] == yr]
                if len(row) == 0 or pd.isna(row[var].values[0]):
                    continue
                # Utiliser comme "prédiction" la moyenne historique pays (baseline naïf)
                hist_vals = df_p[df_p["Year"] < yr][var].dropna().values
                if len(hist_vals) == 0:
                    continue
                true_pairs.append((float(row[var].values[0]), float(np.mean(hist_vals))))
        if true_pairs:
            yt = np.array([p[0] for p in true_pairs])
            yp = np.array([p[1] for p in true_pairs])
            ss_res = float(np.sum((yt - yp) ** 2))
            ss_tot = float(np.sum((yt - yt.mean()) ** 2))
            r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else None
            mae = float(np.mean(np.abs(yt - yp)))
            wf_metrics[var] = {
                "r2": float(r2) if r2 is not None else None,
                "mape": None, "mae": mae, "n": int(len(true_pairs))
            }
        else:
            wf_metrics[var] = {"r2": None, "mape": None, "mae": None, "n": 0}

    return conformal_q, wf_metrics


def _accumulate_metrics(var: str, pairs: list, conformal_q: dict, wf_metrics: dict) -> None:
    """Calcule q80/q95 + R²/MAPE/MAE à partir des paires (true, pred)."""
    if not pairs:
        conformal_q[var] = {"q80": 0.1, "q95": 0.2}
        wf_metrics[var] = {"r2": None, "mape": None, "mae": None, "n": 0}
        return
    yt = np.array([p[0] for p in pairs])
    yp = np.array([p[1] for p in pairs])
    abs_resid = np.abs(yt - yp)
    q80 = float(np.quantile(abs_resid, 0.80))
    q95 = float(np.quantile(abs_resid, 0.95))
    conformal_q[var] = {"q80": q80, "q95": q95}

    ss_res = float(np.sum((yt - yp) ** 2))
    ss_tot = float(np.sum((yt - yt.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else None
    mask = yt != 0
    mape = float(np.mean(np.abs((yt[mask] - yp[mask]) / yt[mask])) * 100) if mask.sum() > 0 else None
    mae = float(np.mean(abs_resid))
    wf_metrics[var] = {
        "r2": float(r2) if r2 is not None else None,
        "mape": mape, "mae": mae, "n": int(len(pairs))
    }


# FIX [A3] — Quantiles en espace log pour IC asymétrique
def _add_log_quantiles(var: str, log_pairs: list, conformal_q: dict) -> None:
    """Calcule q80/q95 sur |log_true - log_pred| pour IC asymétrique en espace réel.

    Les bornes seront val * exp(±q_log), naturellement positives et asymétriques
    (la borne haute s'écarte plus que la basse pour les valeurs élevées).
    """
    if var not in conformal_q:
        conformal_q[var] = {}
    if not log_pairs:
        conformal_q[var]["q80_log"] = 0.05
        conformal_q[var]["q95_log"] = 0.10
        return
    log_resid = np.abs(np.array([lp[0] - lp[1] for lp in log_pairs], dtype=float))
    log_resid = log_resid[~np.isnan(log_resid)]
    if len(log_resid) == 0:
        conformal_q[var]["q80_log"] = 0.05
        conformal_q[var]["q95_log"] = 0.10
        return
    conformal_q[var]["q80_log"] = float(np.quantile(log_resid, 0.80))
    conformal_q[var]["q95_log"] = float(np.quantile(log_resid, 0.95))


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 10 — Tests de cohérence
# ════════════════════════════════════════════════════════════════════════════

def _step10_coherence(
    df: pd.DataFrame, pays_33: list[str], df_pred: pd.DataFrame,
    axco_loaded: bool, axco_gdp_growth_anchor: dict, axco_gdpcap_anchor: dict,
    gdp_growth_pred: dict, gdpcap_pred: dict,
) -> dict:
    alerts: list[str] = []
    bounds_ok = True
    ic_ok = True

    # FIX [A2] — bornes alignées sur les clip réellement appliqués par la pipeline.
    # Sinon le test était toujours vrai car la pipeline avait déjà clippé en amont.
    bounds_check = {
        "nv_penetration": (NV_PENET_MIN, NV_PENET_MAX),
        "vie_penetration": (VIE_PENET_MIN, VIE_PENET_MAX),
        "nv_sp": (NV_SP_MIN, NV_SP_MAX),
        "gdp_growth": (GDP_GROWTH_MIN, GDP_GROWTH_MAX),
        "gdpcap": (100.0, None),
        "polstab": (WGI_BOUNDS[0], WGI_BOUNDS[1]),
        "regqual": (WGI_BOUNDS[0], WGI_BOUNDS[1]),
    }

    for _, row in df_pred.iterrows():
        for var, (vmin, vmax) in bounds_check.items():
            col = f"{var}_pred"
            if col not in row or pd.isna(row[col]):
                continue
            v = row[col]
            if v < vmin or (vmax is not None and v > vmax):
                bounds_ok = False
                alerts.append(f"[bounds] {row['Pays']} {int(row['Year'])} {var}={v:.3f}")

    for _, row in df_pred.iterrows():
        for var in ["nv_penetration", "vie_penetration", "nv_sp", "gdpcap", "polstab", "regqual"]:
            lb = row.get(f"{var}_lb95")
            ub = row.get(f"{var}_ub95")
            v = row.get(f"{var}_pred")
            if lb is None or ub is None or v is None:
                continue
            if pd.isna(lb) or pd.isna(ub) or pd.isna(v):
                continue
            if not (lb <= v <= ub):
                ic_ok = False

    axco_alignment = None
    if axco_loaded:
        ecarts_gg, ecarts_gc = [], []
        for pays in pays_33:
            for yr in [2025, 2026, 2027]:
                ax_gg = axco_gdp_growth_anchor.get(pays, {}).get(yr, np.nan)
                ar_gg = gdp_growth_pred.get(pays, {}).get(yr, np.nan)
                if not (pd.isna(ax_gg) or pd.isna(ar_gg)):
                    ecarts_gg.append(abs(ar_gg - ax_gg))
                ax_gc = axco_gdpcap_anchor.get(pays, {}).get(yr, np.nan)
                ar_gc = gdpcap_pred.get(pays, {}).get(yr, np.nan)
                if not (pd.isna(ax_gc) or pd.isna(ar_gc)):
                    ecarts_gc.append(abs(ar_gc - ax_gc))
        axco_alignment = {
            "mae_gdp_growth": float(np.mean(ecarts_gg)) if ecarts_gg else None,
            "mae_gdpcap": float(np.mean(ecarts_gc)) if ecarts_gc else None,
        }

    return {
        "bounds_ok": bounds_ok,
        "ic_ok": ic_ok,
        "axco_alignment": axco_alignment,
        "alerts_count": len(alerts),
        "alerts_sample": alerts[:10],
    }


# ════════════════════════════════════════════════════════════════════════════
# PIPELINE COMPLET
# ════════════════════════════════════════════════════════════════════════════

def _build_df_pred(
    pays_33: list[str],
    pop_pred: dict, gdp_growth_pred: dict, gdpcap_pred: dict, gdp_pred: dict,
    nv_penet_pred: dict, vie_penet_pred: dict, nv_sp_pred: dict,
    gp_preds: dict, gp_sigma: dict,
    nv_primes_pred: dict, nv_densite_pred: dict,
    vie_primes_pred: dict, vie_densite_pred: dict,
    nv_croissance_pred: dict, vie_croissance_pred: dict,
    conformal_q: dict,
) -> pd.DataFrame:
    rows = []
    for pays in pays_33:
        for yr in YEARS_PRED:
            h = yr - 2024

            # FIX [A3] — log_mode : IC asymétrique val * exp(±q_log) pour variables log-modélisées
            def ic(var: str, val: float, h_factor: bool = True, log_mode: bool = False) -> tuple:
                if pd.isna(val):
                    return (np.nan, np.nan, np.nan, np.nan)
                q = conformal_q.get(var, {"q80": 0.1, "q95": 0.2})
                factor = np.sqrt(h) if h_factor else 1.0
                if log_mode and "q80_log" in q:
                    q80_l = q.get("q80_log", 0.05) * factor
                    q95_l = q.get("q95_log", 0.10) * factor
                    return (val * np.exp(-q80_l), val * np.exp(q80_l),
                            val * np.exp(-q95_l), val * np.exp(q95_l))
                q80 = q.get("q80", 0.1) * factor
                q95 = q.get("q95", 0.2) * factor
                return (val - q80, val + q80, val - q95, val + q95)

            nv_p = nv_penet_pred.get(pays, {}).get(yr, np.nan)
            vie_p = vie_penet_pred.get(pays, {}).get(yr, np.nan)
            sp_p = nv_sp_pred.get(pays, {}).get(yr, np.nan)
            gc_p = gdpcap_pred.get(pays, {}).get(yr, np.nan)
            gg_p = gdp_growth_pred.get(pays, {}).get(yr, np.nan)
            ps_p = gp_preds["polstab"].get(pays, {}).get(yr, np.nan)
            rq_p = gp_preds["regqual"].get(pays, {}).get(yr, np.nan)
            ps_sig = gp_sigma["polstab"].get(pays, {}).get(yr, 0.0) or 0.0
            rq_sig = gp_sigma["regqual"].get(pays, {}).get(yr, 0.0) or 0.0

            nv_ic = ic("nv_penetration", nv_p, True, log_mode=True)
            vie_ic = ic("vie_penetration", vie_p, True, log_mode=True)
            sp_ic = ic("nv_sp", sp_p, False)
            gc_ic = ic("gdpcap", gc_p, True, log_mode=True)
            gg_ic = ic("gdp_growth", gg_p, True)  # FIX [A1] — IC calibré walk-forward

            ps_ic = (ps_p - 1.28 * ps_sig, ps_p + 1.28 * ps_sig,
                     ps_p - 1.96 * ps_sig, ps_p + 1.96 * ps_sig) if not pd.isna(ps_p) else (np.nan,)*4
            rq_ic = (rq_p - 1.28 * rq_sig, rq_p + 1.28 * rq_sig,
                     rq_p - 1.96 * rq_sig, rq_p + 1.96 * rq_sig) if not pd.isna(rq_p) else (np.nan,)*4

            # Dérivées : propager IC depuis nv_penet et gdp
            nv_pr = nv_primes_pred.get(pays, {}).get(yr, np.nan)
            nv_den = nv_densite_pred.get(pays, {}).get(yr, np.nan)
            vie_pr = vie_primes_pred.get(pays, {}).get(yr, np.nan)
            vie_den = vie_densite_pred.get(pays, {}).get(yr, np.nan)
            gdp_f = gdp_pred.get(pays, {}).get(yr, np.nan)
            pop_f = pop_pred.get(pays, {}).get(yr, np.nan)

            # IC dérivé : multiplier la pénétration IC par le PIB
            if not (pd.isna(nv_p) or pd.isna(gdp_f)):
                nv_pr_lb95 = max(nv_ic[2], 0) * gdp_f / 100
                nv_pr_ub95 = nv_ic[3] * gdp_f / 100
            else:
                nv_pr_lb95, nv_pr_ub95 = np.nan, np.nan
            if not (pd.isna(vie_p) or pd.isna(gdp_f)):
                vie_pr_lb95 = max(vie_ic[2], 0) * gdp_f / 100
                vie_pr_ub95 = vie_ic[3] * gdp_f / 100
            else:
                vie_pr_lb95, vie_pr_ub95 = np.nan, np.nan

            # FIX [C1] — IC propagés sur nv_densite, vie_densite, gdp (déterministes en aval)
            # population est en Mn habitants → primes (Mn USD) / pop (Mn hab) = USD/hab
            if not pd.isna(pop_f) and pop_f > 0:
                nv_den_lb95 = nv_pr_lb95 / pop_f if not pd.isna(nv_pr_lb95) else np.nan
                nv_den_ub95 = nv_pr_ub95 / pop_f if not pd.isna(nv_pr_ub95) else np.nan
                vie_den_lb95 = vie_pr_lb95 / pop_f if not pd.isna(vie_pr_lb95) else np.nan
                vie_den_ub95 = vie_pr_ub95 / pop_f if not pd.isna(vie_pr_ub95) else np.nan
            else:
                nv_den_lb95, nv_den_ub95 = np.nan, np.nan
                vie_den_lb95, vie_den_ub95 = np.nan, np.nan
            # gdp = gdpcap × population (Mn hab) → bornes via IC sur gdpcap
            if not pd.isna(pop_f) and pop_f > 0 and not pd.isna(gc_ic[2]):
                gdp_lb95 = max(gc_ic[2], 100) * pop_f
                gdp_ub95 = gc_ic[3] * pop_f
            else:
                gdp_lb95, gdp_ub95 = np.nan, np.nan

            row = {
                "Pays": pays, "Year": yr, "Region": PAYS_TO_REGION.get(pays, ""),
                "nv_penetration_pred": nv_p,
                "nv_penetration_lb80": max(nv_ic[0], NV_PENET_MIN) if not pd.isna(nv_ic[0]) else np.nan,
                "nv_penetration_ub80": min(nv_ic[1], NV_PENET_MAX) if not pd.isna(nv_ic[1]) else np.nan,
                "nv_penetration_lb95": max(nv_ic[2], NV_PENET_MIN) if not pd.isna(nv_ic[2]) else np.nan,
                "nv_penetration_ub95": min(nv_ic[3], NV_PENET_MAX) if not pd.isna(nv_ic[3]) else np.nan,
                "vie_penetration_pred": vie_p,
                "vie_penetration_lb80": max(vie_ic[0], VIE_PENET_MIN) if not pd.isna(vie_ic[0]) else np.nan,
                "vie_penetration_ub80": min(vie_ic[1], VIE_PENET_MAX) if not pd.isna(vie_ic[1]) else np.nan,
                "vie_penetration_lb95": max(vie_ic[2], VIE_PENET_MIN) if not pd.isna(vie_ic[2]) else np.nan,
                "vie_penetration_ub95": min(vie_ic[3], VIE_PENET_MAX) if not pd.isna(vie_ic[3]) else np.nan,
                "nv_sp_pred": sp_p,
                "nv_sp_lb80": max(sp_ic[0], NV_SP_MIN) if not pd.isna(sp_ic[0]) else np.nan,
                "nv_sp_ub80": min(sp_ic[1], NV_SP_MAX) if not pd.isna(sp_ic[1]) else np.nan,
                "nv_sp_lb95": max(sp_ic[2], NV_SP_MIN) if not pd.isna(sp_ic[2]) else np.nan,
                "nv_sp_ub95": min(sp_ic[3], NV_SP_MAX) if not pd.isna(sp_ic[3]) else np.nan,
                "gdpcap_pred": gc_p,
                "gdpcap_lb80": max(gc_ic[0], 100) if not pd.isna(gc_ic[0]) else np.nan,
                "gdpcap_ub80": gc_ic[1],
                "gdpcap_lb95": max(gc_ic[2], 100) if not pd.isna(gc_ic[2]) else np.nan,
                "gdpcap_ub95": gc_ic[3],
                "gdp_growth_pred": gg_p,
                # FIX [A1] — bornes calibrées via walk-forward conformal (étape 9)
                "gdp_growth_lb80": max(gg_ic[0], GDP_GROWTH_MIN) if not pd.isna(gg_ic[0]) else gg_p,
                "gdp_growth_ub80": min(gg_ic[1], GDP_GROWTH_MAX) if not pd.isna(gg_ic[1]) else gg_p,
                "gdp_growth_lb95": max(gg_ic[2], GDP_GROWTH_MIN) if not pd.isna(gg_ic[2]) else gg_p,
                "gdp_growth_ub95": min(gg_ic[3], GDP_GROWTH_MAX) if not pd.isna(gg_ic[3]) else gg_p,
                "polstab_pred": ps_p,
                "polstab_lb80": max(ps_ic[0], -2.5) if not pd.isna(ps_ic[0]) else np.nan,
                "polstab_ub80": min(ps_ic[1], 2.5) if not pd.isna(ps_ic[1]) else np.nan,
                "polstab_lb95": max(ps_ic[2], -2.5) if not pd.isna(ps_ic[2]) else np.nan,
                "polstab_ub95": min(ps_ic[3], 2.5) if not pd.isna(ps_ic[3]) else np.nan,
                "regqual_pred": rq_p,
                "regqual_lb80": max(rq_ic[0], -2.5) if not pd.isna(rq_ic[0]) else np.nan,
                "regqual_ub80": min(rq_ic[1], 2.5) if not pd.isna(rq_ic[1]) else np.nan,
                "regqual_lb95": max(rq_ic[2], -2.5) if not pd.isna(rq_ic[2]) else np.nan,
                "regqual_ub95": min(rq_ic[3], 2.5) if not pd.isna(rq_ic[3]) else np.nan,
                "nv_primes_pred": nv_pr,
                "nv_primes_lb95": nv_pr_lb95, "nv_primes_ub95": nv_pr_ub95,
                "nv_densite_pred": nv_den,
                # FIX [C1] — IC propagé densités + gdp
                "nv_densite_lb95": nv_den_lb95, "nv_densite_ub95": nv_den_ub95,
                "vie_primes_pred": vie_pr,
                "vie_primes_lb95": vie_pr_lb95, "vie_primes_ub95": vie_pr_ub95,
                "vie_densite_pred": vie_den,
                "vie_densite_lb95": vie_den_lb95, "vie_densite_ub95": vie_den_ub95,
                "gdp_pred": gdp_f,
                "gdp_lb95": gdp_lb95, "gdp_ub95": gdp_ub95,
                "population_pred": pop_f,
                "nv_croissance_pred": nv_croissance_pred.get(pays, {}).get(yr, np.nan),
                "vie_croissance_pred": vie_croissance_pred.get(pays, {}).get(yr, np.nan),
            }
            rows.append(row)
    return pd.DataFrame(rows)


def _compute_full_pipeline() -> dict:
    """Exécute la pipeline complète. Coûteux — résultat à mettre en cache."""
    t0 = time.time()
    logger.info("Prédictions Axe 2 — démarrage pipeline")

    # Étape 0
    df = _load_panel_from_db()
    pays_33 = sorted(df["Pays"].unique().tolist())
    logger.info("Étape 0 — panel chargé : %d pays × %d années", len(pays_33), df["Year"].nunique())

    axco_loaded, axco_filename, axco_gdp_growth_anchor, axco_gdpcap_anchor = _load_axco()

    # Étape 1
    pop_pred = _step1_population(df, pays_33)

    # Étape 2a
    inflation_pred = _ar1_mr_project(
        df, pays_33, "inflation", INFL_MU_WINDOW,
        INFL_MIN, INFL_MAX, INFL_RHO_MIN, INFL_RHO_MAX, mu_default=7.0
    )
    # Étape 2b
    integration_pred = _ar1_mr_project(
        df, pays_33, "integration", EXOG_MU_WINDOW,
        INTEG_MIN, INTEG_MAX, INTEG_RHO_MIN, INTEG_RHO_MAX, mu_default=0.5
    )
    fdi_pred = _ar1_mr_project(
        df, pays_33, "fdi", EXOG_MU_WINDOW,
        FDI_MIN, FDI_MAX, FDI_RHO_MIN, FDI_RHO_MAX, mu_default=2.0, rho_default=0.4
    )

    # Étape 2c
    gdp_growth_pred, mu_pays_dict = _step2c_gdp_growth(
        df, pays_33, inflation_pred, axco_loaded, axco_gdp_growth_anchor
    )
    logger.info("Étape 2 — exogènes & gdp_growth projetés (Axco=%s)", axco_loaded)

    # Étape 3
    gdpcap_pred, gdp_pred, _pop_growth = _step3_gdpcap(
        df, pays_33, pop_pred, gdp_growth_pred, inflation_pred, integration_pred,
        axco_loaded, axco_gdpcap_anchor
    )
    logger.info("Étape 3 — gdpcap projeté")

    # Étape 4
    gp_preds, gp_sigma = _step4_wgi(df, pays_33, gdpcap_pred)
    logger.info("Étape 4 — WGI projeté")

    # Étape 5
    nv_penet_pred = _step5_nv_penetration(df, pays_33, gdpcap_pred, gp_preds, integration_pred)
    logger.info("Étape 5 — nv_penetration projeté")

    # Étape 6
    vie_penet_pred = _step6_vie_penetration(
        df, pays_33, gdpcap_pred, gp_preds, integration_pred, nv_penet_pred
    )
    logger.info("Étape 6 — vie_penetration projeté")

    # Étape 7
    nv_sp_pred = _step7_nv_sp(
        df, pays_33, gp_preds, nv_penet_pred, gdp_pred, gdp_growth_pred, fdi_pred
    )
    logger.info("Étape 7 — nv_sp projeté")

    # Étape 8
    (nv_primes_pred, nv_densite_pred, vie_primes_pred, vie_densite_pred,
     nv_croissance_pred, vie_croissance_pred) = _step8_derived(
        df, pays_33, pop_pred, nv_penet_pred, vie_penet_pred, gdp_pred
    )

    # Étape 9
    conformal_q, wf_metrics = _step9_conformal(df, pays_33, gp_sigma)
    logger.info("Étape 9 — conformal IC calibrés")

    # Build df_pred
    df_pred = _build_df_pred(
        pays_33, pop_pred, gdp_growth_pred, gdpcap_pred, gdp_pred,
        nv_penet_pred, vie_penet_pred, nv_sp_pred, gp_preds, gp_sigma,
        nv_primes_pred, nv_densite_pred, vie_primes_pred, vie_densite_pred,
        nv_croissance_pred, vie_croissance_pred, conformal_q
    )

    # Étape 10
    coherence = _step10_coherence(
        df, pays_33, df_pred, axco_loaded, axco_gdp_growth_anchor, axco_gdpcap_anchor,
        gdp_growth_pred, gdpcap_pred
    )

    elapsed = time.time() - t0
    logger.info("Pipeline complète en %.1fs (alerts=%d, bounds_ok=%s, ic_ok=%s)",
                elapsed, coherence["alerts_count"], coherence["bounds_ok"], coherence["ic_ok"])

    return {
        "pays_33": pays_33,
        "df_hist": df,
        "df_pred": df_pred,
        "axco_loaded": axco_loaded,
        "axco_filename": axco_filename,
        "wf_metrics": wf_metrics,
        "conformal_q": conformal_q,
        "coherence": coherence,
        "elapsed_seconds": elapsed,
    }


# ════════════════════════════════════════════════════════════════════════════
# CACHE (SQLite persistant + miroir mémoire pour servir les requêtes en <1ms)
# ════════════════════════════════════════════════════════════════════════════

CACHE_TTL_DAYS = int(os.environ.get("PREDICTIONS_CACHE_TTL_DAYS", "30"))

_PIPELINE_CACHE: dict | None = None
_CACHE_LOCK = threading.Lock()
# FIX [B1] — sérialise les /refresh concurrents pour éviter le double calcul
_REFRESH_LOCK = threading.Lock()


def _scrub_for_json(obj: Any) -> Any:
    """Convertit récursivement numpy / NaN / Inf en types JSON natifs."""
    if isinstance(obj, dict):
        return {k: _scrub_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_scrub_for_json(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return _scrub_for_json(obj.tolist())
    if isinstance(obj, (np.floating,)):
        f = float(obj)
        return None if (np.isnan(f) or np.isinf(f)) else f
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    return obj


def _serialize_cache(cache: dict) -> str:
    """Sérialise le cache (DataFrames + numpy) en JSON pour stockage DB."""
    payload = {
        "pays_33": list(cache["pays_33"]),
        "df_hist_json": cache["df_hist"].to_json(orient="split", date_format="iso"),
        "df_pred_json": cache["df_pred"].to_json(orient="split", date_format="iso"),
        "axco_loaded": bool(cache["axco_loaded"]),
        "axco_filename": cache["axco_filename"],
        "wf_metrics": _scrub_for_json(cache["wf_metrics"]),
        "conformal_q": _scrub_for_json(cache["conformal_q"]),
        "coherence": _scrub_for_json(cache["coherence"]),
        "elapsed_seconds": float(cache["elapsed_seconds"]),
    }
    return json.dumps(payload)


def _deserialize_cache(payload: str) -> dict:
    """Reconstruit le cache (incluant DataFrames) à partir du JSON DB."""
    raw = json.loads(payload)
    df_hist = pd.read_json(io.StringIO(raw.pop("df_hist_json")), orient="split")
    df_pred = pd.read_json(io.StringIO(raw.pop("df_pred_json")), orient="split")
    raw["df_hist"] = df_hist
    raw["df_pred"] = df_pred
    return raw


def _load_or_compute_cache(db: Session) -> dict:
    """Charge le cache depuis SQLite si valide (< CACHE_TTL_DAYS jours).
    Sinon, lance la pipeline ML complète et sauvegarde en DB.
    """
    cutoff = datetime.utcnow() - timedelta(days=CACHE_TTL_DAYS)
    entry = (
        db.query(PredictionsCache)
        .filter(PredictionsCache.computed_at >= cutoff)
        .order_by(PredictionsCache.computed_at.desc())
        .first()
    )

    if entry:
        try:
            cache = _deserialize_cache(entry.cache_data)
            logger.info(
                "Cache prédictions chargé depuis DB (calculé le %s, Axco: %s)",
                entry.computed_at, entry.axco_filename or "absent",
            )
            return cache
        except Exception as exc:
            logger.warning("Cache DB illisible (%s) — recalcul forcé", exc)

    logger.info("Cache prédictions absent ou expiré → lancement pipeline ML complète (étapes 0–9)…")
    cache = _compute_full_pipeline()

    try:
        new_entry = PredictionsCache(
            computed_at=datetime.utcnow(),
            axco_filename=cache.get("axco_filename"),
            cache_data=_serialize_cache(cache),
        )
        db.add(new_entry)
        db.commit()
        logger.info(
            "Cache prédictions sauvegardé en DB (Axco: %s)",
            cache.get("axco_filename") or "absent",
        )
    except Exception as exc:
        db.rollback()
        logger.warning("Impossible de sauvegarder le cache prédictions en DB : %s", exc)

    return cache


def _get_pipeline() -> dict:
    """Renvoie le cache (mémoire si déjà chargé, sinon DB ou recalcul)."""
    global _PIPELINE_CACHE
    if _PIPELINE_CACHE is None:
        with _CACHE_LOCK:
            if _PIPELINE_CACHE is None:
                db = SessionLocal()
                try:
                    _PIPELINE_CACHE = _load_or_compute_cache(db)
                finally:
                    db.close()
    return _PIPELINE_CACHE


def _invalidate_cache(db: Session | None = None) -> int:
    """Purge le cache mémoire ET les entrées DB. Renvoie le nombre de lignes supprimées."""
    global _PIPELINE_CACHE
    deleted = 0
    own_session = db is None
    if own_session:
        db = SessionLocal()
    try:
        deleted = db.query(PredictionsCache).delete()
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Impossible de purger le cache DB : %s", exc)
    finally:
        if own_session:
            db.close()
    with _CACHE_LOCK:
        _PIPELINE_CACHE = None
    return deleted


# ════════════════════════════════════════════════════════════════════════════
# HELPERS API
# ════════════════════════════════════════════════════════════════════════════

def _safe(v: Any) -> Any:
    """Convertit np.nan → None et numpy scalars → Python natifs."""
    if v is None:
        return None
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
        return None
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else f
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


def _round_safe(v: Any, dec: int = 4) -> Any:
    s = _safe(v)
    if s is None or not isinstance(s, (int, float)):
        return s
    return round(float(s), dec)


def _build_var_data(
    cache: dict, pays: str, var: str,
) -> dict | None:
    """Construit la structure VarData {historique, predictions, IC, modele, r2, mape, q80, q95, axco_blended}."""
    df_hist: pd.DataFrame = cache["df_hist"]
    df_pred: pd.DataFrame = cache["df_pred"]
    wf_metrics: dict = cache["wf_metrics"]
    conformal_q: dict = cache["conformal_q"]
    axco_loaded: bool = cache["axco_loaded"]

    meta = VARIABLE_META.get(var)
    if meta is None:
        return None

    hist_col = var
    if hist_col not in df_hist.columns:
        return None

    df_hist_p = df_hist[df_hist["Pays"] == pays].sort_values("Year")
    historique = []
    for _, r in df_hist_p.iterrows():
        v = r.get(hist_col)
        if pd.isna(v):
            continue
        historique.append({"annee": int(r["Year"]), "valeur": _round_safe(v, 4)})

    df_pred_p = df_pred[df_pred["Pays"] == pays].sort_values("Year")
    predictions = []
    pred_col = f"{var}_pred"
    lb_col = f"{var}_lb95"
    ub_col = f"{var}_ub95"
    for _, r in df_pred_p.iterrows():
        if pred_col not in r:
            continue
        v = r[pred_col]
        if pd.isna(v):
            continue
        lb = r[lb_col] if lb_col in r else np.nan
        ub = r[ub_col] if ub_col in r else np.nan
        predictions.append({
            "annee": int(r["Year"]),
            "valeur": _round_safe(v, 4),
            "ic_lower": _round_safe(lb if not pd.isna(lb) else v, 4),
            "ic_upper": _round_safe(ub if not pd.isna(ub) else v, 4),
        })

    metrics = wf_metrics.get(var, {})
    q = conformal_q.get(var, {})
    axco_blended = axco_loaded and var in ("gdp_growth", "gdpcap", "gdp", "nv_primes", "vie_primes", "nv_densite", "vie_densite")

    return {
        "variable": var,
        "label": meta["label"],
        "unite": meta["unite"],
        "sens_favorable": meta["sens_favorable"],
        "dimension": meta["dimension"],
        "modele": meta["modele"],
        "r2_walforward": _safe(metrics.get("r2")),
        "mape": _safe(metrics.get("mape")),
        "q80": _safe(q.get("q80")),
        "q95": _safe(q.get("q95")),
        "historique": historique,
        "predictions": predictions,
        "axco_blended": axco_blended,
    }


# ════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/metadata")
def get_metadata():
    """Pays, variables, dimensions, années."""
    cache = _get_pipeline()
    pays_33 = cache["pays_33"]
    pays_with_region = [
        {"pays": p, "region": PAYS_TO_REGION.get(p, "")}
        for p in pays_33
    ]
    return {
        "pays": pays_33,
        "pays_with_region": pays_with_region,
        "regions": list(REGIONS.keys()),
        "regions_pays": REGIONS,
        "target_vars": TARGET_VARS,
        "derived_vars": DERIVED_VARS,
        "all_vars": ALL_VARS,
        "variables": VARIABLE_META,
        "annees_historique": YEARS_HIST,
        "annees_prediction": YEARS_PRED,
        "axco_loaded": cache["axco_loaded"],
        "axco_filename": cache["axco_filename"],
    }


@router.get("/overview")
def get_overview():
    """Tableau récapitulatif 33 pays × variables phares (2024 + 2030)."""
    cache = _get_pipeline()
    df_hist: pd.DataFrame = cache["df_hist"]
    df_pred: pd.DataFrame = cache["df_pred"]
    pays_33 = cache["pays_33"]

    rows = []
    for pays in pays_33:
        h2024 = df_hist[(df_hist["Pays"] == pays) & (df_hist["Year"] == 2024)]
        p2030 = df_pred[(df_pred["Pays"] == pays) & (df_pred["Year"] == 2030)]
        if len(h2024) == 0 or len(p2030) == 0:
            continue
        h = h2024.iloc[0]
        p = p2030.iloc[0]

        def hv(c):
            return _safe(h.get(c))

        def pv(c):
            return _safe(p.get(c))

        def var_pct(v_old, v_new):
            if v_old is None or v_new is None or v_old == 0:
                return None
            return round((v_new - v_old) / abs(v_old) * 100, 2)

        nv_pen_2024 = hv("nv_penetration")
        nv_pen_2030 = pv("nv_penetration_pred")
        nv_pr_2024 = hv("nv_primes")
        nv_pr_2030 = pv("nv_primes_pred")
        gc_2024 = hv("gdpcap")
        gc_2030 = pv("gdpcap_pred")
        gdp_2024 = hv("gdp")
        gdp_2030 = pv("gdp_pred")

        rows.append({
            "pays": pays,
            "region": PAYS_TO_REGION.get(pays, ""),
            # 2024
            "nv_penetration_2024": nv_pen_2024,
            "vie_penetration_2024": hv("vie_penetration"),
            "nv_sp_2024": hv("nv_sp"),
            "gdpcap_2024": gc_2024,
            "gdp_2024": gdp_2024,
            "gdp_growth_2024": hv("gdp_growth"),
            "polstab_2024": hv("polstab"),
            "regqual_2024": hv("regqual"),
            "nv_primes_2024": nv_pr_2024,
            "vie_primes_2024": hv("vie_primes"),
            # 2030
            "nv_penetration_2030": nv_pen_2030,
            "vie_penetration_2030": pv("vie_penetration_pred"),
            "nv_sp_2030": pv("nv_sp_pred"),
            "gdpcap_2030": gc_2030,
            "gdp_2030": gdp_2030,
            "gdp_growth_2030": pv("gdp_growth_pred"),
            "polstab_2030": pv("polstab_pred"),
            "regqual_2030": pv("regqual_pred"),
            "nv_primes_2030": nv_pr_2030,
            "vie_primes_2030": pv("vie_primes_pred"),
            # Variations
            "nv_penetration_var_pct": var_pct(nv_pen_2024, nv_pen_2030),
            "nv_primes_var_pct": var_pct(nv_pr_2024, nv_pr_2030),
            "gdpcap_var_pct": var_pct(gc_2024, gc_2030),
            # IC 95%
            "nv_penetration_ic_low": pv("nv_penetration_lb95"),
            "nv_penetration_ic_up": pv("nv_penetration_ub95"),
            "nv_primes_ic_low": pv("nv_primes_lb95"),
            "nv_primes_ic_up": pv("nv_primes_ub95"),
            "nv_sp_ic_low": pv("nv_sp_lb95"),
            "nv_sp_ic_up": pv("nv_sp_ub95"),
            "gdpcap_ic_low": pv("gdpcap_lb95"),
            "gdpcap_ic_up": pv("gdpcap_ub95"),
        })
    return rows


@router.get("/pays/{pays}")
def get_pays(pays: str):
    """Toutes variables d'un pays avec historique + prédictions + IC."""
    cache = _get_pipeline()
    if pays not in cache["pays_33"]:
        raise HTTPException(status_code=404, detail=f"Pays introuvable: {pays}")

    variables = {}
    for var in ALL_VARS:
        d = _build_var_data(cache, pays, var)
        if d is not None:
            variables[var] = d

    return {
        "pays": pays,
        "region": PAYS_TO_REGION.get(pays, ""),
        "variables": variables,
        "axco_loaded": cache["axco_loaded"],
    }


@router.get("/variable/{variable}")
def get_variable(variable: str, horizon: int = Query(2030)):
    """Classement tous pays pour une variable à un horizon, + top10 séries."""
    cache = _get_pipeline()
    if variable not in VARIABLE_META:
        raise HTTPException(status_code=404, detail=f"Variable inconnue: {variable}")
    if horizon not in YEARS_PRED:
        raise HTTPException(status_code=400, detail=f"Horizon invalide: {horizon}")

    pays_33 = cache["pays_33"]
    df_hist: pd.DataFrame = cache["df_hist"]
    df_pred: pd.DataFrame = cache["df_pred"]
    meta = VARIABLE_META[variable]

    classement = []
    for pays in pays_33:
        h_row = df_hist[(df_hist["Pays"] == pays) & (df_hist["Year"] == 2024)]
        p_row = df_pred[(df_pred["Pays"] == pays) & (df_pred["Year"] == horizon)]
        v_2024 = _safe(h_row[variable].values[0]) if len(h_row) > 0 and variable in h_row.columns else None
        v_horizon = _safe(p_row[f"{variable}_pred"].values[0]) if len(p_row) > 0 else None
        if v_horizon is None:
            continue
        ic_low = _safe(p_row[f"{variable}_lb95"].values[0]) if f"{variable}_lb95" in p_row.columns else None
        ic_up = _safe(p_row[f"{variable}_ub95"].values[0]) if f"{variable}_ub95" in p_row.columns else None
        var_pct = round((v_horizon - v_2024) / abs(v_2024) * 100, 2) if v_2024 not in (None, 0) else None

        classement.append({
            "pays": pays,
            "region": PAYS_TO_REGION.get(pays, ""),
            "valeur_2024": v_2024,
            "valeur_horizon": v_horizon,
            "ic_lower": ic_low,
            "ic_upper": ic_up,
            "variation_pct": var_pct,
        })

    reverse = (meta["sens_favorable"] == "hausse")
    classement.sort(key=lambda x: (x["valeur_horizon"] if x["valeur_horizon"] is not None else 0), reverse=reverse)
    for i, row in enumerate(classement, 1):
        row["rang"] = i

    top_pays = [row["pays"] for row in classement[:10]]
    top_series = {}
    for p in top_pays:
        d = _build_var_data(cache, p, variable)
        if d is not None:
            top_series[p] = {
                "historique": d["historique"],
                "predictions": d["predictions"],
            }

    metrics = cache["wf_metrics"].get(variable, {})
    q = cache["conformal_q"].get(variable, {})

    return {
        "variable": variable,
        "horizon": horizon,
        "meta": {
            **meta,
            "r2_walforward": _safe(metrics.get("r2")),
            "mape": _safe(metrics.get("mape")),
            "q80": _safe(q.get("q80")),
            "q95": _safe(q.get("q95")),
        },
        "classement": classement,
        "top_series": top_series,
    }


@router.get("/comparaison")
def get_comparaison(
    pays_a: str = Query(...),
    pays_b: str = Query(...),
    variable: str = Query(...),
):
    """Deux pays × une variable + tableau comparatif sur la dimension."""
    cache = _get_pipeline()
    if variable not in VARIABLE_META:
        raise HTTPException(status_code=404, detail=f"Variable inconnue: {variable}")
    pays_33 = cache["pays_33"]
    if pays_a == pays_b:
        raise HTTPException(status_code=400, detail="pays_a et pays_b doivent être différents")
    for p in [pays_a, pays_b]:
        if p not in pays_33:
            raise HTTPException(status_code=404, detail=f"Pays introuvable: {p}")

    data_a = _build_var_data(cache, pays_a, variable)
    data_b = _build_var_data(cache, pays_b, variable)

    dim = VARIABLE_META[variable]["dimension"]
    dim_vars = [v for v, m in VARIABLE_META.items() if m["dimension"] == dim]

    df_hist: pd.DataFrame = cache["df_hist"]
    df_pred: pd.DataFrame = cache["df_pred"]

    tableau = []
    for var in dim_vars:
        meta = VARIABLE_META[var]

        def get_val(pays: str, year_type: str) -> float | None:
            if year_type == "2024":
                row = df_hist[(df_hist["Pays"] == pays) & (df_hist["Year"] == 2024)]
                return _safe(row[var].values[0]) if len(row) > 0 and var in row.columns else None
            else:
                row = df_pred[(df_pred["Pays"] == pays) & (df_pred["Year"] == 2030)]
                return _safe(row[f"{var}_pred"].values[0]) if len(row) > 0 else None

        a2024 = get_val(pays_a, "2024")
        a2030 = get_val(pays_a, "2030")
        b2024 = get_val(pays_b, "2024")
        b2030 = get_val(pays_b, "2030")

        def delta_pct(old, new):
            if old is None or new is None or old == 0:
                return None
            return round((new - old) / abs(old) * 100, 2)

        # Gagnant 2030
        gagnant = None
        if a2030 is not None and b2030 is not None:
            if meta["sens_favorable"] == "hausse":
                gagnant = pays_a if a2030 > b2030 else (pays_b if b2030 > a2030 else None)
            else:
                gagnant = pays_a if a2030 < b2030 else (pays_b if b2030 < a2030 else None)

        tableau.append({
            "variable": var,
            "label": meta["label"],
            "unite": meta["unite"],
            "sens_favorable": meta["sens_favorable"],
            "a_2024": a2024, "a_2030": a2030,
            "a_delta_pct": delta_pct(a2024, a2030),
            "b_2024": b2024, "b_2030": b2030,
            "b_delta_pct": delta_pct(b2024, b2030),
            "gagnant": gagnant,
        })

    return {
        "variable": variable,
        "meta": VARIABLE_META[variable],
        "pays_a": {"pays": pays_a, "region": PAYS_TO_REGION.get(pays_a, ""), "data": data_a},
        "pays_b": {"pays": pays_b, "region": PAYS_TO_REGION.get(pays_b, ""), "data": data_b},
        "tableau": tableau,
    }


@router.get("/trajectoires")
def get_trajectoires(
    variable: str = Query(...),
    top_n: int = Query(5, ge=3, le=10),
):
    """Top N pays × toutes variables (séries 2015-2030 pour le tab Trajectoires)."""
    cache = _get_pipeline()
    if variable not in VARIABLE_META:
        raise HTTPException(status_code=404, detail=f"Variable inconnue: {variable}")

    df_pred: pd.DataFrame = cache["df_pred"]
    pays_33 = cache["pays_33"]
    meta = VARIABLE_META[variable]

    pred_col = f"{variable}_pred"
    rows_2030 = df_pred[df_pred["Year"] == 2030][["Pays", pred_col]].dropna()
    rows_2030 = rows_2030.sort_values(pred_col, ascending=(meta["sens_favorable"] == "baisse"))
    top_pays = rows_2030["Pays"].head(top_n).tolist()

    # Pour chaque pays du top, on retourne la série de la variable + radar (6 dimensions normalisées en 2030)
    series = {}
    for p in top_pays:
        d = _build_var_data(cache, p, variable)
        if d is not None:
            series[p] = {
                "historique": d["historique"],
                "predictions": d["predictions"],
                "region": PAYS_TO_REGION.get(p, ""),
            }

    # Radar : 6 dimensions normalisées 0-100 pour 2030
    radar_vars = ["nv_penetration", "vie_penetration", "nv_primes",
                   "gdpcap", "polstab", "regqual"]
    radar_labels = {
        "nv_penetration": "Pénétration NV",
        "vie_penetration": "Pénétration Vie",
        "nv_primes": "Primes NV",
        "gdpcap": "PIB/habitant",
        "polstab": "Stabilité Politique",
        "regqual": "Qualité Réglementaire",
    }

    # min/max sur tous les pays 2030 par variable pour normaliser
    min_max: dict = {}
    for v in radar_vars:
        col = f"{v}_pred"
        s = df_pred[df_pred["Year"] == 2030][col].dropna()
        if len(s) > 0:
            min_max[v] = (float(s.min()), float(s.max()))
        else:
            min_max[v] = (0.0, 1.0)

    radar = []
    for v in radar_vars:
        entry = {"variable": v, "label": radar_labels[v]}
        vmin, vmax = min_max[v]
        rng = vmax - vmin if vmax > vmin else 1.0
        for p in top_pays:
            row = df_pred[(df_pred["Pays"] == p) & (df_pred["Year"] == 2030)]
            if len(row) == 0:
                entry[p] = 0
                continue
            val = row[f"{v}_pred"].values[0]
            if pd.isna(val):
                entry[p] = 0
            else:
                entry[p] = round((val - vmin) / rng * 100, 1)
        radar.append(entry)

    return {
        "variable": variable,
        "meta": meta,
        "top_pays": top_pays,
        "series": series,
        "radar": radar,
    }


@router.get("/validation")
def get_validation():
    """Métriques walk-forward + tests de cohérence + statut Axco."""
    cache = _get_pipeline()
    return {
        "axco_loaded": cache["axco_loaded"],
        "axco_filename": cache["axco_filename"],
        "elapsed_seconds": round(cache["elapsed_seconds"], 1),
        "variables": {
            v: {
                "modele": VARIABLE_META[v]["modele"],
                "label": VARIABLE_META[v]["label"],
                "dimension": VARIABLE_META[v]["dimension"],
                "r2_mean": _safe(cache["wf_metrics"].get(v, {}).get("r2")),
                "mape_mean": _safe(cache["wf_metrics"].get(v, {}).get("mape")),
                "mae": _safe(cache["wf_metrics"].get(v, {}).get("mae")),
                "n_calibration": _safe(cache["wf_metrics"].get(v, {}).get("n")),
                "q80": _safe(cache["conformal_q"].get(v, {}).get("q80")),
                "q95": _safe(cache["conformal_q"].get(v, {}).get("q95")),
            }
            for v in TARGET_VARS
        },
        "coherence_tests": cache["coherence"],
    }


@router.get("/refresh")
def refresh_cache(db: Session = Depends(get_db)):
    """Invalide le cache DB + mémoire et force le recalcul de toute la pipeline."""
    # FIX [B1] — refus non-bloquant si un recalcul est déjà en cours (évite double pipeline ~60s)
    if not _REFRESH_LOCK.acquire(blocking=False):
        return {
            "status": "in_progress",
            "message": "Recalcul déjà en cours — retentez dans quelques secondes.",
        }
    try:
        deleted = _invalidate_cache(db)
        logger.info("Cache prédictions invalidé (%d entrée(s) DB supprimée(s)) — recalcul en cours…", deleted)
        cache = _get_pipeline()
        return {
            "status": "ok",
            "message": f"Cache recalculé ({len(cache['pays_33'])} pays)",
            "elapsed_seconds": round(cache["elapsed_seconds"], 1),
            "axco_loaded": cache["axco_loaded"],
            "axco_filename": cache["axco_filename"],
        }
    finally:
        _REFRESH_LOCK.release()
