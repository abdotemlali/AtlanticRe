import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import logging

import core.config as config

logger = logging.getLogger(__name__)

# ── In-Memory Cache ───────────────────────────────────────────────────────────
_retro_df: Optional[pd.DataFrame] = None
_retro_last_loaded: Optional[datetime] = None
_retro_row_count: int = 0

NUMERIC_COLS = [
    "EPI", "RATING_A_PLUS_PCT", "PART_PCT",
    "PMD_EPI_100", "PMD_PAR_SECURITE",
    "COMMISSION_COURTAGE_PCT", "COMMISSION_COURTAGE"
]

# Mapping from Excel French headers → internal uppercase names
COLUMN_RENAME = {
    "Traité":                  "TRAITE",
    "Nature":                  "NATURE",
    "UY":                      "UY",
    "Assiette de prime (EPI)": "EPI",
    "Direct / Courtier":       "DIRECT_COURTIER",
    "Sécurité":                "SECURITE",
    "Rating > A":              "RATING_A_PLUS_PCT",
    "Part":                    "PART_PCT",
    "PMD / EPI 100%":          "PMD_EPI_100",
    "PMD / EPI par Sécurité":  "PMD_PAR_SECURITE",
    "Commission Courtage (%)": "COMMISSION_COURTAGE_PCT",
    "Commission Courtage":     "COMMISSION_COURTAGE",
}


def _sanitize(v):
    """Replace NaN/Inf floats with 0.0 for JSON serialization."""
    if isinstance(v, float) and (v != v or v == float('inf') or v == float('-inf')):
        return 0.0
    return v


def load_retro_excel(file_path: str = None) -> Dict[str, Any]:
    """Charge le fichier Excel rétrocession en mémoire — appelé au lifespan."""
    global _retro_df, _retro_last_loaded, _retro_row_count

    path = file_path or config.RETRO_EXCEL_FILE_PATH
    if not Path(path).exists():
        raise FileNotFoundError(f"Fichier Excel rétrocession introuvable : {path}")

    logger.info(f"Chargement rétrocession : {path}")
    sheet = getattr(config, "RETRO_EXCEL_SHEET_NAME", "Sheet1")
    df = pd.read_excel(path, sheet_name=sheet, dtype=str)

    # Rename French headers → internal uppercase names
    df = df.rename(columns=COLUMN_RENAME)

    # Nettoyage colonnes numériques
    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].str.replace(",", ".").str.replace(" ", ""),
                errors="coerce"
            ).fillna(0.0)

    # UY en entier
    if "UY" in df.columns:
        df["UY"] = pd.to_numeric(df["UY"], errors="coerce").fillna(0).astype(int)

    # Colonnes dérivées
    df["TAUX_PMD"] = np.where(df["EPI"] > 0, df["PMD_EPI_100"] / df["EPI"], 0)
    df["COUT_NET"] = df["PMD_PAR_SECURITE"] + df["COMMISSION_COURTAGE"]
    df["EST_DIRECT"] = df["DIRECT_COURTIER"].fillna("").str.upper().str.strip() == "DIRECT"

    # Normaliser les colonnes texte
    for col in ["TRAITE", "NATURE", "DIRECT_COURTIER", "SECURITE"]:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str).str.strip()

    _retro_df = df
    _retro_last_loaded = datetime.now()
    _retro_row_count = len(df)
    logger.info(f"Rétrocession chargé : {_retro_row_count} lignes, {len(df.columns)} colonnes")
    return {"row_count": _retro_row_count, "last_loaded": _retro_last_loaded.isoformat()}


def get_retro_df() -> pd.DataFrame:
    """Retourne le DataFrame rétrocession (lazy-loading si cache vide)."""
    if _retro_df is None:
        try:
            load_retro_excel()
        except Exception as e:
            logger.error(f"Impossible de charger rétrocession : {e}")
            return pd.DataFrame()
    return _retro_df


def get_retro_status() -> Dict[str, Any]:
    return {
        "loaded": _retro_df is not None,
        "last_loaded": _retro_last_loaded.isoformat() if _retro_last_loaded else None,
        "row_count": _retro_row_count,
    }


def apply_retro_filters(
    df: pd.DataFrame,
    uy: Optional[List[int]] = None,
    nature: Optional[str] = None,
    traite: Optional[str] = None,
    courtier: Optional[str] = None,
    securite: Optional[str] = None,
) -> pd.DataFrame:
    """Filtre local indépendant du DataContext global."""
    if df.empty:
        return df
    if uy:
        df = df[df["UY"].isin(uy)]
    if nature:
        df = df[df["NATURE"] == nature]
    if traite:
        df = df[df["TRAITE"] == traite]
    if courtier:
        df = df[df["DIRECT_COURTIER"] == courtier]
    if securite:
        df = df[df["SECURITE"] == securite]
    return df


def get_retro_filter_options(df: pd.DataFrame) -> Dict[str, Any]:
    """Retourne les valeurs uniques pour les filtres locaux rétrocession."""
    def unique_sorted(series):
        return sorted([v for v in series.dropna().unique().tolist() if str(v).strip()])

    uy_list = sorted([int(y) for y in df["UY"].dropna().unique().tolist()]) if "UY" in df.columns else []
    uy_default = max(uy_list) if uy_list else None

    return {
        "traites": unique_sorted(df["TRAITE"]) if "TRAITE" in df.columns else [],
        "natures": unique_sorted(df["NATURE"]) if "NATURE" in df.columns else [],
        "courtiers": unique_sorted(df["DIRECT_COURTIER"]) if "DIRECT_COURTIER" in df.columns else [],
        "securites": unique_sorted(df["SECURITE"]) if "SECURITE" in df.columns else [],
        "uy_list": uy_list,
        "uy_default": uy_default,
    }


def compute_retro_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """Calcule les KPIs globaux de la rétrocession."""
    if df.empty:
        return {
            "epi_total": 0, "pmd_totale": 0, "courtage_total": 0,
            "cout_net_total": 0, "ratio_cout_epi_pct": 0,
            "nb_traites": 0, "nb_securites": 0, "nb_courtiers": 0,
            "taux_placement_moyen": 0, "rating_a_plus_moyen": 0,
        }

    # EPI est par traité/UY, pas par ligne — on prend la valeur unique par traité/UY
    traite_uy = df.groupby(["TRAITE", "UY"]).agg(
        epi=("EPI", "first"),
        taux_placement=("PART_PCT", "sum"),
        rating_a=("RATING_A_PLUS_PCT", "first"),
    ).reset_index()

    epi_total = float(traite_uy["epi"].sum())
    pmd_totale = float(df["PMD_PAR_SECURITE"].sum())
    courtage_total = float(df["COMMISSION_COURTAGE"].sum())
    cout_net_total = pmd_totale + courtage_total
    ratio_cout_epi_pct = round(cout_net_total / epi_total * 100, 2) if epi_total > 0 else 0.0

    nb_traites = int(traite_uy["TRAITE"].nunique())
    nb_securites = int(df["SECURITE"].nunique())
    nb_courtiers = int(df[df["EST_DIRECT"] == False]["DIRECT_COURTIER"].nunique()) if "EST_DIRECT" in df.columns else 0

    taux_placement_moyen = round(float(traite_uy["taux_placement"].mean()), 2)
    rating_a_plus_moyen = round(float(traite_uy["rating_a"].mean()), 2)

    return {
        "epi_total": round(_sanitize(epi_total), 2),
        "pmd_totale": round(_sanitize(pmd_totale), 2),
        "courtage_total": round(_sanitize(courtage_total), 2),
        "cout_net_total": round(_sanitize(cout_net_total), 2),
        "ratio_cout_epi_pct": _sanitize(ratio_cout_epi_pct),
        "nb_traites": nb_traites,
        "nb_securites": nb_securites,
        "nb_courtiers": nb_courtiers,
        "taux_placement_moyen": _sanitize(taux_placement_moyen),
        "rating_a_plus_moyen": _sanitize(rating_a_plus_moyen),
    }


def compute_by_traite(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Agrège les données par traité pour le tableau principal."""
    if df.empty:
        return []

    result = []
    for (traite, uy), grp in df.groupby(["TRAITE", "UY"]):
        nature = grp["NATURE"].iloc[0] if len(grp) > 0 else ""
        epi = float(grp["EPI"].iloc[0])
        pmd_100 = float(grp["PMD_EPI_100"].iloc[0])
        pmd_totale = float(grp["PMD_PAR_SECURITE"].sum())
        courtage_total = float(grp["COMMISSION_COURTAGE"].sum())
        cout_net = pmd_totale + courtage_total
        taux_pmd_pct = round(pmd_100 / epi * 100, 2) if epi > 0 else 0
        ratio_cout_epi_pct = round(cout_net / epi * 100, 2) if epi > 0 else 0
        nb_securites = int(grp["SECURITE"].nunique())
        taux_placement = round(float(grp["PART_PCT"].sum()), 2)
        rating_a_plus_pct = float(grp["RATING_A_PLUS_PCT"].iloc[0])
        courtier = grp["DIRECT_COURTIER"].iloc[0] if len(grp) > 0 else ""

        # Détail par sécurité
        securites = []
        for _, row in grp.iterrows():
            securites.append({
                "securite": str(row["SECURITE"]),
                "part_pct": round(_sanitize(float(row["PART_PCT"])), 2),
                "pmd_par_securite": round(_sanitize(float(row["PMD_PAR_SECURITE"])), 2),
                "commission_courtage": round(_sanitize(float(row["COMMISSION_COURTAGE"])), 2),
                "commission_courtage_pct": round(_sanitize(float(row.get("COMMISSION_COURTAGE_PCT", 0))), 2),
            })

        result.append({
            "traite": str(traite),
            "nature": str(nature),
            "uy": int(uy),
            "epi": round(_sanitize(epi), 2),
            "pmd_100": round(_sanitize(pmd_100), 2),
            "pmd_totale": round(_sanitize(pmd_totale), 2),
            "courtage_total": round(_sanitize(courtage_total), 2),
            "cout_net": round(_sanitize(cout_net), 2),
            "taux_pmd_pct": _sanitize(taux_pmd_pct),
            "ratio_cout_epi_pct": _sanitize(ratio_cout_epi_pct),
            "nb_securites": nb_securites,
            "taux_placement": _sanitize(taux_placement),
            "rating_a_plus_pct": _sanitize(rating_a_plus_pct),
            "courtier": str(courtier),
            "securites": securites,
        })

    return sorted(result, key=lambda x: x["epi"], reverse=True)


def compute_by_year(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Évolution temporelle par année."""
    if df.empty:
        return []

    result = []
    for uy, grp in df.groupby("UY"):
        traite_uy = grp.groupby("TRAITE").agg(epi=("EPI", "first")).reset_index()
        epi_total = float(traite_uy["epi"].sum())
        pmd_totale = float(grp["PMD_PAR_SECURITE"].sum())
        courtage_total = float(grp["COMMISSION_COURTAGE"].sum())
        cout_net = pmd_totale + courtage_total
        ratio_cout_epi_pct = round(cout_net / epi_total * 100, 2) if epi_total > 0 else 0
        nb_traites = int(grp["TRAITE"].nunique())

        result.append({
            "uy": int(uy),
            "epi_total": round(_sanitize(epi_total), 2),
            "pmd_totale": round(_sanitize(pmd_totale), 2),
            "courtage_total": round(_sanitize(courtage_total), 2),
            "cout_net": round(_sanitize(cout_net), 2),
            "ratio_cout_epi_pct": _sanitize(ratio_cout_epi_pct),
            "nb_traites_actifs": nb_traites,
        })

    return sorted(result, key=lambda x: x["uy"])


def compute_by_nature(df: pd.DataFrame) -> Dict[str, Any]:
    """Répartition Proportionnel vs Non Proportionnel."""
    result = {}
    for nature in ["Proportionnel", "Non Proportionnel"]:
        sub = df[df["NATURE"] == nature] if not df.empty else df
        traite_uy = sub.groupby(["TRAITE", "UY"]).agg(epi=("EPI", "first")).reset_index() if not sub.empty else pd.DataFrame()
        epi = float(traite_uy["epi"].sum()) if not traite_uy.empty else 0
        pmd = float(sub["PMD_PAR_SECURITE"].sum())
        nb_traites = int(sub["TRAITE"].nunique()) if not sub.empty else 0
        ratio = round(pmd / epi * 100, 2) if epi > 0 else 0

        key = "proportionnel" if nature == "Proportionnel" else "non_proportionnel"
        result[key] = {
            "epi": round(_sanitize(epi), 2),
            "pmd_totale": round(_sanitize(pmd), 2),
            "nb_traites": nb_traites,
            "ratio_cout_epi_pct": _sanitize(ratio),
        }

    return result


def compute_by_courtier(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Performance par courtier placeur."""
    if df.empty:
        return []

    result = []
    for courtier, grp in df.groupby("DIRECT_COURTIER"):
        est_direct = str(courtier).upper().strip() == "DIRECT"
        nb_traites = int(grp["TRAITE"].nunique())
        traite_uy = grp.groupby(["TRAITE", "UY"]).agg(epi=("EPI", "first")).reset_index()
        epi_gere = float(traite_uy["epi"].sum())
        pmd_placee = float(grp["PMD_PAR_SECURITE"].sum())
        courtage_percu = float(grp["COMMISSION_COURTAGE"].sum())
        taux_courtage_moyen = round(float(grp["COMMISSION_COURTAGE_PCT"].mean()), 2) if "COMMISSION_COURTAGE_PCT" in grp.columns else 0
        securites_utilisees = sorted(grp["SECURITE"].unique().tolist())
        rating_a_plus_moyen = round(float(grp.groupby(["TRAITE", "UY"])["RATING_A_PLUS_PCT"].first().mean()), 2)
        traites_list = sorted(grp["TRAITE"].unique().tolist())

        result.append({
            "courtier": str(courtier),
            "est_direct": est_direct,
            "nb_traites_places": nb_traites,
            "epi_gere": round(_sanitize(epi_gere), 2),
            "pmd_placee": round(_sanitize(pmd_placee), 2),
            "courtage_percu": round(_sanitize(courtage_percu), 2),
            "taux_courtage_moyen": _sanitize(taux_courtage_moyen),
            "securites_utilisees": securites_utilisees,
            "rating_a_plus_moyen": _sanitize(rating_a_plus_moyen),
            "traites_list": traites_list,
        })

    return sorted(result, key=lambda x: x["pmd_placee"], reverse=True)


def compute_by_securite(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Vue complète par sécurité."""
    if df.empty:
        return []

    result = []
    for securite, grp in df.groupby("SECURITE"):
        nb_traites = int(grp["TRAITE"].nunique())
        uy_list = sorted([int(y) for y in grp["UY"].unique().tolist()])
        part_moyenne = round(float(grp["PART_PCT"].mean()), 2)
        part_max = round(float(grp["PART_PCT"].max()), 2)
        pmd_totale_recue = float(grp["PMD_PAR_SECURITE"].sum())
        traites_couverts = sorted(grp["TRAITE"].unique().tolist())
        natures_couvertes = sorted(grp["NATURE"].unique().tolist())
        courtiers_via = sorted(grp["DIRECT_COURTIER"].unique().tolist())

        # Rating: on considère A+ si la majorité des traités ont un Rating > 50%
        rating_moyen = float(grp.groupby(["TRAITE", "UY"])["RATING_A_PLUS_PCT"].first().mean())
        rating_a_plus = rating_moyen >= 50

        # Score de concentration : max(part%) sur un seul traité
        concentration_score = round(float(grp.groupby("TRAITE")["PART_PCT"].sum().max()), 2)

        result.append({
            "securite": str(securite),
            "rating_a_plus": rating_a_plus,
            "nb_traites": nb_traites,
            "uy_list": uy_list,
            "part_moyenne": _sanitize(part_moyenne),
            "part_max": _sanitize(part_max),
            "pmd_totale_recue": round(_sanitize(pmd_totale_recue), 2),
            "traites_couverts": traites_couverts,
            "natures_couvertes": natures_couvertes,
            "courtiers_via": courtiers_via,
            "concentration_score": _sanitize(concentration_score),
        })

    return sorted(result, key=lambda x: x["pmd_totale_recue"], reverse=True)


def compute_placement_status(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Statut de placement par traité/UY."""
    if df.empty:
        return []

    result = []
    for (traite, uy), grp in df.groupby(["TRAITE", "UY"]):
        taux_placement = round(float(grp["PART_PCT"].sum()), 2)
        part_non_placee = round(100 - taux_placement, 2)
        epi = float(grp["EPI"].iloc[0])
        epi_non_couvert = round(epi * part_non_placee / 100, 2)

        if taux_placement >= 95:
            statut = "COMPLET"
        elif taux_placement >= 85:
            statut = "PARTIEL"
        else:
            statut = "CRITIQUE"

        result.append({
            "traite": str(traite),
            "uy": int(uy),
            "taux_placement": _sanitize(taux_placement),
            "part_non_placee": _sanitize(part_non_placee),
            "epi_non_couvert": round(_sanitize(epi_non_couvert), 2),
            "statut": statut,
        })

    return sorted(result, key=lambda x: x["taux_placement"])


def compute_courtier_croise(df_retro: pd.DataFrame, df_contrats: pd.DataFrame, uy: Optional[List[int]] = None) -> List[Dict[str, Any]]:
    """Croise courtiers rétrocession × courtiers contrats pour identifier les double-rôles."""
    # Courtiers dans la rétrocession (placeurs)
    retro_courtiers = df_retro[df_retro["EST_DIRECT"] == False].groupby("DIRECT_COURTIER").agg(
        pmd_placee=("PMD_PAR_SECURITE", "sum"),
        courtage_retro=("COMMISSION_COURTAGE", "sum"),
        nb_traites=("TRAITE", "nunique"),
    ).reset_index()
    retro_courtiers.columns = ["courtier", "pmd_placee", "courtage_retro", "nb_traites"]

    # Filtrer les contrats par année si UY spécifié
    df_c = df_contrats.copy() if not df_contrats.empty else df_contrats
    if uy and not df_c.empty and "UNDERWRITING_YEAR" in df_c.columns:
        df_c["UNDERWRITING_YEAR"] = pd.to_numeric(df_c["UNDERWRITING_YEAR"], errors="coerce")
        df_c = df_c[df_c["UNDERWRITING_YEAR"].isin(uy)]

    # Courtiers dans les contrats (apporteurs)
    if not df_c.empty and "INT_BROKER" in df_c.columns:
        contrats_courtiers = df_c.groupby("INT_BROKER").agg(
            primes_apportees=("WRITTEN_PREMIUM", "sum"),
        ).reset_index()
        contrats_courtiers.columns = ["courtier", "primes_apportees"]
    else:
        contrats_courtiers = pd.DataFrame(columns=["courtier", "primes_apportees"])

    # Fusion outer
    merged = pd.merge(retro_courtiers, contrats_courtiers, on="courtier", how="outer").fillna(0)
    merged["role_apporteur"] = merged["primes_apportees"] > 0
    merged["role_placeur"] = merged["pmd_placee"] > 0
    merged["role_double"] = merged["role_apporteur"] & merged["role_placeur"]
    merged["volume_total"] = merged["pmd_placee"] + merged["primes_apportees"]

    result = []
    for _, row in merged.sort_values("volume_total", ascending=False).iterrows():
        result.append({
            "courtier": str(row["courtier"]),
            "role_apporteur": bool(row["role_apporteur"]),
            "role_placeur": bool(row["role_placeur"]),
            "role_double": bool(row["role_double"]),
            "primes_apportees": round(_sanitize(float(row["primes_apportees"])), 2),
            "pmd_placee": round(_sanitize(float(row["pmd_placee"])), 2),
            "volume_total": round(_sanitize(float(row["volume_total"])), 2),
            "courtage_retro": round(_sanitize(float(row["courtage_retro"])), 2),
        })

    return result
