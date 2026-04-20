"""
Router FastAPI — Analyse Synergique (Axe 1 × Axe 2).
Préfixe : /api/synergie

Croise les données internes du portefeuille Atlantic Re (SUBJECT_PREMIUM,
WRITTEN_PREMIUM, SHARE_WRITTEN, ULR, …) avec les données externes de marché
africain (ext_marche_non_vie, ext_marche_vie) pour mesurer la pénétration
réelle d'Atlantic Re dans chaque marché africain.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, Body, Depends
from fastapi import Query as QParam
from sqlalchemy import text

from core.database import SessionLocal
from routers.auth import get_current_user
from services.data_service import get_df

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/synergie", tags=["Synergie"])

# ── Constants ──────────────────────────────────────────────────────────────────
EXT_YEARS = set(range(2015, 2025))  # années couvertes par données externes


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS DB / CALCUL
# ═══════════════════════════════════════════════════════════════════════════════

def _safe_float(val: Any) -> Optional[float]:
    try:
        v = float(val)
        return v if np.isfinite(v) else None
    except (TypeError, ValueError):
        return None


def _get_rate() -> float:
    """Récupère le taux USD→MAD depuis synergie_settings."""
    db = SessionLocal()
    try:
        row = db.execute(
            text("SELECT value FROM synergie_settings WHERE `key` = 'usd_to_mad'")
        ).fetchone()
        return float(row[0]) if row else 9.5
    except Exception:
        return 9.5
    finally:
        db.close()


def _set_rate(rate: float) -> None:
    """Sauvegarde le taux USD→MAD dans synergie_settings."""
    db = SessionLocal()
    try:
        db.execute(
            text(
                "INSERT INTO synergie_settings (`key`, value) VALUES ('usd_to_mad', :v)"
                " ON DUPLICATE KEY UPDATE value = :v"
            ),
            {"v": str(rate)},
        )
        db.commit()
    except Exception as exc:
        logger.warning("Error saving rate: %s", exc)
        db.rollback()
    finally:
        db.close()


def _get_mapping() -> dict[str, str]:
    """Retourne {PAYS_RISQUE_UPPER: nom_pays_externe} depuis ref_pays."""
    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                "SELECT nom_pays, pays_risque_match FROM ref_pays"
                " WHERE pays_risque_match IS NOT NULL AND pays_risque_match != ''"
            )
        ).fetchall()
        return {row[1].strip().upper(): row[0].strip() for row in rows}
    except Exception as exc:
        logger.warning("Error getting pays mapping: %s", exc)
        return {}
    finally:
        db.close()


def _get_ulr_col(df: pd.DataFrame) -> Optional[str]:
    for col in ("ULR", "ULTIMATE_LOSS_RATIO"):
        if col in df.columns:
            return col
    return None


def _calc_penetration(
    share_written_avg: float,
    subject_premium: float,
    primes_marche_total_mad: float,
) -> float:
    """
    Pénétration réelle = SHARE_WRITTEN(%) × (Subject Premium / Primes Marché) × 100.
    Répond à : "Atlantic Re capte X% des primes totales du marché de ce pays."
    """
    if not primes_marche_total_mad:
        return 0.0
    return (share_written_avg / 100.0) * (subject_premium / primes_marche_total_mad) * 100.0


def _calc_cagr(values_by_year: dict[int, float]) -> float:
    years = sorted(k for k, v in values_by_year.items() if v and v > 0)
    if len(years) < 2:
        return 0.0
    v_start = values_by_year[years[0]]
    v_end = values_by_year[years[-1]]
    if not v_start:
        return 0.0
    n = years[-1] - years[0]
    return ((v_end / v_start) ** (1.0 / n) - 1) * 100.0


# ── Optimized ext data bulk loader ─────────────────────────────────────────────

def _load_all_ext_data(rate: float) -> dict[str, dict]:
    """
    Charge TOUTES les données des marchés externes en 2 requêtes SQL
    (une pour non-vie, une pour vie) et retourne un dict:
      { nom_pays_ext: { year: {nonvie_mad, vie_mad} } }
    + agrégats moyens (year=None key).
    """
    db = SessionLocal()
    try:
        nv_rows = db.execute(
            text("SELECT pays, annee, primes_emises_mn_usd FROM ext_marche_non_vie WHERE primes_emises_mn_usd IS NOT NULL")
        ).fetchall()
        v_rows = db.execute(
            text("SELECT pays, annee, primes_emises_mn_usd FROM ext_marche_vie WHERE primes_emises_mn_usd IS NOT NULL")
        ).fetchall()
    except Exception as exc:
        logger.warning("Error loading ext data: %s", exc)
        return {}
    finally:
        db.close()

    # Build per-pays, per-year data
    data: dict[str, dict] = {}

    for pays, annee, primes in nv_rows:
        p = pays.strip()
        y = int(annee)
        if p not in data:
            data[p] = {}
        if y not in data[p]:
            data[p][y] = {"nonvie": 0.0, "vie": 0.0}
        v = _safe_float(primes)
        if v is not None:
            data[p][y]["nonvie"] += v

    for pays, annee, primes in v_rows:
        p = pays.strip()
        y = int(annee)
        if p not in data:
            data[p] = {}
        if y not in data[p]:
            data[p][y] = {"nonvie": 0.0, "vie": 0.0}
        v = _safe_float(primes)
        if v is not None:
            data[p][y]["vie"] += v

    # Convert raw (mn USD) to MAD, add total, compute averages
    result: dict[str, dict] = {}
    for pays, by_year in data.items():
        result[pays] = {}
        nv_vals, v_vals = [], []
        for y, vals in by_year.items():
            nv_mad = vals["nonvie"] * 1_000_000 * rate
            v_mad = vals["vie"] * 1_000_000 * rate
            result[pays][y] = {
                "nonvie_mad": nv_mad,
                "vie_mad": v_mad,
                "total_mad": nv_mad + v_mad,
            }
            nv_vals.append(vals["nonvie"])
            v_vals.append(vals["vie"])
        # Average (year=None)
        avg_nv = (sum(nv_vals) / len(nv_vals)) if nv_vals else 0.0
        avg_v = (sum(v_vals) / len(v_vals)) if v_vals else 0.0
        result[pays][None] = {
            "nonvie_mad": avg_nv * 1_000_000 * rate,
            "vie_mad": avg_v * 1_000_000 * rate,
            "total_mad": (avg_nv + avg_v) * 1_000_000 * rate,
        }

    return result


def _get_ext_primes_from_cache(
    nom_pays_ext: str, year_int: Optional[int], ext_cache: dict
) -> dict:
    """Lookup dans le cache ext_data (chargé une fois par requête)."""
    pays_data = ext_cache.get(nom_pays_ext, {})
    yr_data = pays_data.get(year_int, pays_data.get(None, {}))
    return {
        "nonvie_mad": yr_data.get("nonvie_mad", 0.0),
        "vie_mad": yr_data.get("vie_mad", 0.0),
        "total_mad": yr_data.get("total_mad", 0.0),
    }


def _get_synergie_df() -> pd.DataFrame:
    df = get_df()
    if df is None or df.empty:
        return pd.DataFrame()
    # Cache heavy string transforms once
    if "PAYS_RISQUE" in df.columns and "_PAYS_UPPER" not in df.columns:
        df["_PAYS_UPPER"] = df["PAYS_RISQUE"].fillna("").astype(str).str.strip().str.upper()
    if "INT_BRANCHE" in df.columns and "_BRANCHE_UPPER" not in df.columns:
        df["_BRANCHE_UPPER"] = df["INT_BRANCHE"].fillna("").astype(str).str.strip().str.upper()
    return df


def _get_ext_timeseries_from_cache(nom_pays_ext: str, ext_cache: dict) -> list[dict]:
    """Série temporelle ext [2015..2024] pour un pays depuis le cache."""
    pays_data = ext_cache.get(nom_pays_ext, {})
    result = []
    for yr in sorted(EXT_YEARS):
        yr_data = pays_data.get(yr)
        if yr_data is None:
            continue
        result.append({
            "year": yr,
            "nonvie": yr_data["nonvie_mad"],
            "vie": yr_data["vie_mad"],
            "total": yr_data["total_mad"],
        })
    return result


# ── Compute pays KPIs (uses pre-loaded ext cache) ──────────────────────────────

def _compute_pays_kpis(
    df: pd.DataFrame,
    pays_risque: str,
    nom_pays_ext: str,
    year_int: Optional[int],
    ext_cache: dict,
) -> Optional[dict]:
    """
    Calcule tous les KPIs pour un pays donné.
    Si year_int=None → agrège sur toutes les années croisées disponibles.
    ext_cache: résultat de _load_all_ext_data(), chargé une seule fois par requête.
    """
    # Filtre interne
    mask_pays = df["_PAYS_UPPER"] == pays_risque.upper()
    df_pays_all = df[mask_pays & df["UNDERWRITING_YEAR"].isin(EXT_YEARS)]

    if df_pays_all.empty:
        return None

    if year_int is not None:
        df_pays = df_pays_all[df_pays_all["UNDERWRITING_YEAR"] == year_int]
        if df_pays.empty:
            return None
    else:
        df_pays = df_pays_all

    # Split Vie / Non-Vie sur données internes (colonne INT_BRANCHE)
    if "_BRANCHE_UPPER" in df_pays.columns:
        vie_mask = df_pays["_BRANCHE_UPPER"] == "VIE"
        df_vie = df_pays[vie_mask]
        df_nonvie = df_pays[~vie_mask]
    else:
        df_vie = df_pays.iloc[0:0]
        df_nonvie = df_pays

    # Primes internes — total
    subject_premium = _safe_float(df_pays["SUBJECT_PREMIUM"].sum()) or 0.0
    written_premium = _safe_float(df_pays["WRITTEN_PREMIUM"].sum()) or 0.0
    share_vals = df_pays["SHARE_WRITTEN"].dropna()
    share_written_avg = float(share_vals.mean()) if not share_vals.empty else 0.0

    # Primes internes — Non-Vie / Vie
    subject_premium_nonvie = _safe_float(df_nonvie["SUBJECT_PREMIUM"].sum()) or 0.0
    subject_premium_vie = _safe_float(df_vie["SUBJECT_PREMIUM"].sum()) or 0.0
    written_premium_nonvie = _safe_float(df_nonvie["WRITTEN_PREMIUM"].sum()) or 0.0
    written_premium_vie = _safe_float(df_vie["WRITTEN_PREMIUM"].sum()) or 0.0
    sw_nonvie_vals = df_nonvie["SHARE_WRITTEN"].dropna()
    sw_vie_vals = df_vie["SHARE_WRITTEN"].dropna()
    share_written_avg_nonvie = float(sw_nonvie_vals.mean()) if not sw_nonvie_vals.empty else 0.0
    share_written_avg_vie = float(sw_vie_vals.mean()) if not sw_vie_vals.empty else 0.0

    # ULR — total + par segment
    ulr_col = _get_ulr_col(df_pays)
    ulr_vals = df_pays[ulr_col].dropna() if ulr_col else pd.Series(dtype=float)
    ulr_moyen = float(ulr_vals.mean()) if not ulr_vals.empty else 0.0
    ulr_nonvie_vals = df_nonvie[ulr_col].dropna() if ulr_col and not df_nonvie.empty else pd.Series(dtype=float)
    ulr_moyen_nonvie = float(ulr_nonvie_vals.mean()) if not ulr_nonvie_vals.empty else 0.0
    ulr_vie_vals = df_vie[ulr_col].dropna() if ulr_col and not df_vie.empty else pd.Series(dtype=float)
    ulr_moyen_vie = float(ulr_vie_vals.mean()) if not ulr_vie_vals.empty else 0.0

    # Affaires + cédantes — total + par segment
    nb_affaires = int(len(df_pays))
    nb_affaires_nonvie = int(len(df_nonvie))
    nb_affaires_vie = int(len(df_vie))
    nb_cedantes = int(df_pays["INT_CEDANTE"].nunique()) if "INT_CEDANTE" in df_pays.columns else 0
    nb_cedantes_nonvie = int(df_nonvie["INT_CEDANTE"].nunique()) if "INT_CEDANTE" in df_nonvie.columns and not df_nonvie.empty else 0
    nb_cedantes_vie = int(df_vie["INT_CEDANTE"].nunique()) if "INT_CEDANTE" in df_vie.columns and not df_vie.empty else 0

    # Primes marché externes — depuis le cache (zéro requête DB)
    ext = _get_ext_primes_from_cache(nom_pays_ext, year_int, ext_cache)
    primes_marche_total_mad = ext["total_mad"]
    primes_nonvie_mad = ext["nonvie_mad"]
    primes_vie_mad = ext["vie_mad"]

    penetration = _calc_penetration(share_written_avg, subject_premium, primes_marche_total_mad)
    penetration_nonvie = _calc_penetration(share_written_avg_nonvie, subject_premium_nonvie, primes_nonvie_mad)
    penetration_vie = _calc_penetration(share_written_avg_vie, subject_premium_vie, primes_vie_mad)

    return {
        "pays": pays_risque,
        "pays_externe": nom_pays_ext,
        "primes_marche_total_mad": primes_marche_total_mad,
        "primes_marche_nonvie_mad": primes_nonvie_mad,
        "primes_marche_vie_mad": primes_vie_mad,
        "subject_premium": subject_premium,
        "subject_premium_nonvie": subject_premium_nonvie,
        "subject_premium_vie": subject_premium_vie,
        "written_premium": written_premium,
        "written_premium_nonvie": written_premium_nonvie,
        "written_premium_vie": written_premium_vie,
        "share_written_avg": share_written_avg,
        "share_written_avg_nonvie": share_written_avg_nonvie,
        "share_written_avg_vie": share_written_avg_vie,
        "penetration_marche_pct": penetration,
        "penetration_marche_pct_nonvie": penetration_nonvie,
        "penetration_marche_pct_vie": penetration_vie,
        "ulr_moyen": ulr_moyen,
        "ulr_moyen_nonvie": ulr_moyen_nonvie,
        "ulr_moyen_vie": ulr_moyen_vie,
        "nb_affaires": nb_affaires,
        "nb_affaires_nonvie": nb_affaires_nonvie,
        "nb_affaires_vie": nb_affaires_vie,
        "nb_cedantes": nb_cedantes,
        "nb_cedantes_nonvie": nb_cedantes_nonvie,
        "nb_cedantes_vie": nb_cedantes_vie,
    }


def _get_pays_croises(df: pd.DataFrame, mapping: dict, ext_cache: dict) -> list[dict]:
    """
    Retourne la liste des pays présents dans les données internes ET dans
    les données externes. Utilise le cache ext pré-chargé (sans requête DB).
    """
    if df is None or df.empty:
        return []
    if "PAYS_RISQUE" not in df.columns or "UNDERWRITING_YEAR" not in df.columns:
        return []

    ext_pays_set = set(ext_cache.keys())
    df_ext = df[df["UNDERWRITING_YEAR"].isin(EXT_YEARS)]

    result = []
    for pays_risque_up, nom_pays_ext in mapping.items():
        if nom_pays_ext not in ext_pays_set:
            continue
        mask = df_ext["_PAYS_UPPER"] == pays_risque_up
        if not mask.any():
            continue
        years_internal = set(
            int(x) for x in df_ext[mask]["UNDERWRITING_YEAR"].dropna().unique()
        )
        annees_dispo = sorted(years_internal & EXT_YEARS)
        if not annees_dispo:
            continue
        result.append(
            {
                "pays_interne": pays_risque_up,
                "pays_externe": nom_pays_ext,
                "annees_disponibles": [int(y) for y in annees_dispo],
            }
        )

    return sorted(result, key=lambda x: x["pays_interne"])


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS — Paramètres
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/settings")
def get_settings(_: dict = Depends(get_current_user)):
    """Retourne le taux de conversion USD→MAD."""
    return {"usd_to_mad": _get_rate()}


@router.put("/settings")
def put_settings(
    body: dict = Body(...),
    _: dict = Depends(get_current_user),
):
    """Sauvegarde le taux de conversion USD→MAD."""
    rate = float(body.get("usd_to_mad", 9.5))
    _set_rate(rate)
    return {"usd_to_mad": rate}


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS — Page principale /analyse-synergie
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pays-croises")
def pays_croises(_: dict = Depends(get_current_user)):
    """Liste des pays présents dans les données internes ET les données de marché externe."""
    df = _get_synergie_df()
    mapping = _get_mapping()
    ext_cache = _load_all_ext_data(9.5)  # rate doesn't matter for just the list
    return _get_pays_croises(df, mapping, ext_cache)


@router.get("/kpis")
def kpis_global(
    year: str = QParam("2024"),
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """
    KPIs agrégés sur tous les pays croisés.
    year = année entière (ex: "2024") ou "moyenne".
    """
    df = _get_synergie_df()
    if df is None or df.empty:
        return _empty_global_kpis()

    year_int = None if year == "moyenne" else int(year)
    mapping = _get_mapping()
    ext_cache = _load_all_ext_data(usd_to_mad)
    pays_list = _get_pays_croises(df, mapping, ext_cache)

    totals = {
        "nb_pays_croises": len(pays_list),
        "nb_pays_nonvie": 0,
        "nb_pays_vie": 0,
        "primes_marche_total_mad": 0.0,
        "primes_marche_nonvie_mad": 0.0,
        "primes_marche_vie_mad": 0.0,
        "subject_premium_total": 0.0,
        "subject_premium_nonvie_total": 0.0,
        "subject_premium_vie_total": 0.0,
        "written_premium_total": 0.0,
        "written_premium_nonvie_total": 0.0,
        "written_premium_vie_total": 0.0,
        "share_written_values": [],
        "share_written_values_nonvie": [],
        "share_written_values_vie": [],
        "annees_disponibles": set(),
    }

    for pc in pays_list:
        kpis = _compute_pays_kpis(df, pc["pays_interne"], pc["pays_externe"], year_int, ext_cache)
        if not kpis:
            continue
        totals["primes_marche_total_mad"] += kpis["primes_marche_total_mad"]
        totals["primes_marche_nonvie_mad"] += kpis["primes_marche_nonvie_mad"]
        totals["primes_marche_vie_mad"] += kpis["primes_marche_vie_mad"]
        totals["subject_premium_total"] += kpis["subject_premium"]
        totals["subject_premium_nonvie_total"] += kpis["subject_premium_nonvie"]
        totals["subject_premium_vie_total"] += kpis["subject_premium_vie"]
        totals["written_premium_total"] += kpis["written_premium"]
        totals["written_premium_nonvie_total"] += kpis["written_premium_nonvie"]
        totals["written_premium_vie_total"] += kpis["written_premium_vie"]
        if kpis["share_written_avg"] > 0:
            totals["share_written_values"].append(kpis["share_written_avg"])
        if kpis["share_written_avg_nonvie"] > 0:
            totals["share_written_values_nonvie"].append(kpis["share_written_avg_nonvie"])
        if kpis["share_written_avg_vie"] > 0:
            totals["share_written_values_vie"].append(kpis["share_written_avg_vie"])
        if kpis.get("subject_premium_nonvie", 0) > 0 and kpis.get("primes_marche_nonvie_mad", 0) > 0:
            totals["nb_pays_nonvie"] += 1
        if kpis.get("subject_premium_vie", 0) > 0 and kpis.get("primes_marche_vie_mad", 0) > 0:
            totals["nb_pays_vie"] += 1
        totals["annees_disponibles"].update(pc["annees_disponibles"])

    share_written_avg = (
        float(np.mean(totals["share_written_values"]))
        if totals["share_written_values"]
        else 0.0
    )
    share_written_avg_nonvie = (
        float(np.mean(totals["share_written_values_nonvie"]))
        if totals["share_written_values_nonvie"]
        else 0.0
    )
    share_written_avg_vie = (
        float(np.mean(totals["share_written_values_vie"]))
        if totals["share_written_values_vie"]
        else 0.0
    )
    penetration = _calc_penetration(
        share_written_avg,
        totals["subject_premium_total"],
        totals["primes_marche_total_mad"],
    )
    penetration_nonvie = _calc_penetration(
        share_written_avg_nonvie,
        totals["subject_premium_nonvie_total"],
        totals["primes_marche_nonvie_mad"],
    )
    penetration_vie = _calc_penetration(
        share_written_avg_vie,
        totals["subject_premium_vie_total"],
        totals["primes_marche_vie_mad"],
    )

    return {
        "nb_pays_croises": totals["nb_pays_croises"],
        "nb_pays_croises_nonvie": totals["nb_pays_nonvie"],
        "nb_pays_croises_vie": totals["nb_pays_vie"],
        "primes_marche_total_mad": totals["primes_marche_total_mad"],
        "primes_marche_nonvie_mad": totals["primes_marche_nonvie_mad"],
        "primes_marche_vie_mad": totals["primes_marche_vie_mad"],
        "subject_premium_total": totals["subject_premium_total"],
        "subject_premium_nonvie_total": totals["subject_premium_nonvie_total"],
        "subject_premium_vie_total": totals["subject_premium_vie_total"],
        "written_premium_total": totals["written_premium_total"],
        "written_premium_nonvie_total": totals["written_premium_nonvie_total"],
        "written_premium_vie_total": totals["written_premium_vie_total"],
        "share_written_avg": share_written_avg,
        "share_written_avg_nonvie": share_written_avg_nonvie,
        "share_written_avg_vie": share_written_avg_vie,
        "penetration_marche_pct": penetration,
        "penetration_marche_pct_nonvie": penetration_nonvie,
        "penetration_marche_pct_vie": penetration_vie,
        "annees_disponibles": sorted(totals["annees_disponibles"]),
    }


def _empty_global_kpis():
    return {
        "nb_pays_croises": 0,
        "nb_pays_croises_nonvie": 0,
        "nb_pays_croises_vie": 0,
        "primes_marche_total_mad": 0.0,
        "primes_marche_nonvie_mad": 0.0,
        "primes_marche_vie_mad": 0.0,
        "subject_premium_total": 0.0,
        "subject_premium_nonvie_total": 0.0,
        "subject_premium_vie_total": 0.0,
        "written_premium_total": 0.0,
        "written_premium_nonvie_total": 0.0,
        "written_premium_vie_total": 0.0,
        "share_written_avg": 0.0,
        "share_written_avg_nonvie": 0.0,
        "share_written_avg_vie": 0.0,
        "penetration_marche_pct": 0.0,
        "penetration_marche_pct_nonvie": 0.0,
        "penetration_marche_pct_vie": 0.0,
        "annees_disponibles": [],
    }


@router.get("/classements")
def classements_global(
    year: str = QParam("2024"),
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """Classements Top-15 par indicateur, sur tous les pays croisés."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return _empty_classements()

    year_int = None if year == "moyenne" else int(year)
    mapping = _get_mapping()
    ext_cache = _load_all_ext_data(usd_to_mad)
    pays_list = _get_pays_croises(df, mapping, ext_cache)

    rows = []
    tableau_cedantes_out = []  # computed here — zero extra DB calls
    for pc in pays_list:
        kpis = _compute_pays_kpis(df, pc["pays_interne"], pc["pays_externe"], year_int, ext_cache)
        if not kpis:
            continue
        rows.append(kpis)
        # Cedantes for this pays — computed inline (same df + ext_cache, no extra DB)
        ced_rows = _tableau_cedantes_for_pays(
            df, pc["pays_interne"], pc["pays_externe"], year_int, ext_cache
        )
        total_wp = sum(r["written_premium"] for r in ced_rows)
        for r in ced_rows:
            r["pct_written_vs_pays"] = (r["written_premium"] / total_wp * 100.0) if total_wp else 0.0
        tableau_cedantes_out.extend(ced_rows)
    tableau_cedantes_out = sorted(tableau_cedantes_out, key=lambda x: x["written_premium"], reverse=True)

    def top15(data, key, reverse=True):
        return sorted(
            [r for r in data if r.get(key, 0) is not None],
            key=lambda x: x.get(key, 0) or 0,
            reverse=reverse,
        )[:15]

    # Build par_primes_marche with non-vie/vie breakdown
    par_primes = top15(rows, "primes_marche_total_mad")
    par_primes_out = [
        {
            "pays": r["pays"],
            "primes_marche_total_mad": r["primes_marche_total_mad"],
            "primes_nonvie_mad": r["primes_marche_nonvie_mad"],
            "primes_vie_mad": r["primes_marche_vie_mad"],
        }
        for r in par_primes
    ]

    # Build tableau_pays inline (data already computed — zero extra cost)
    tableau_pays_out = sorted(
        [
            {
                "pays": r["pays"],
                "primes_marche_total_mad": r["primes_marche_total_mad"],
                "primes_nonvie_mad": r["primes_marche_nonvie_mad"],
                "primes_vie_mad": r["primes_marche_vie_mad"],
                "subject_premium": r["subject_premium"],
                "subject_nonvie": r["subject_premium_nonvie"],
                "subject_vie": r["subject_premium_vie"],
                "written_premium": r["written_premium"],
                "written_nonvie": r["written_premium_nonvie"],
                "written_vie": r["written_premium_vie"],
                "share_written_avg": r["share_written_avg"],
                "share_written_avg_nonvie": r["share_written_avg_nonvie"],
                "share_written_avg_vie": r["share_written_avg_vie"],
                "penetration_marche_pct": r["penetration_marche_pct"],
                "penetration_marche_pct_nonvie": r["penetration_marche_pct_nonvie"],
                "penetration_marche_pct_vie": r["penetration_marche_pct_vie"],
                "nb_affaires": r["nb_affaires"],
                "nb_cedantes": r["nb_cedantes"],
                "ulr_moyen": r["ulr_moyen"],
            }
            for r in rows
        ],
        key=lambda x: x["written_premium"],
        reverse=True,
    )

    return {
        "par_primes_marche": par_primes_out,
        "par_subject_premium": [
            {
                "pays": r["pays"],
                "subject_premium": r["subject_premium"],
                "subject_nonvie": r["subject_premium_nonvie"],
                "subject_vie": r["subject_premium_vie"],
                "nb_affaires": r["nb_affaires"],
            }
            for r in top15(rows, "subject_premium")
        ],
        "par_written_premium": [
            {
                "pays": r["pays"],
                "written_premium": r["written_premium"],
                "written_nonvie": r["written_premium_nonvie"],
                "written_vie": r["written_premium_vie"],
            }
            for r in top15(rows, "written_premium")
        ],
        "par_share_written": [
            {
                "pays": r["pays"],
                "share_written_avg": r["share_written_avg"],
                "share_nonvie": r.get("share_written_avg_nonvie", 0),
                "share_vie": r.get("share_written_avg_vie", 0),
            }
            for r in top15(rows, "share_written_avg")
        ],
        "par_penetration_marche": [
            {
                "pays": r["pays"],
                "penetration_marche_pct": r["penetration_marche_pct"],
                "penetration_nonvie": r.get("penetration_marche_pct_nonvie", 0),
                "penetration_vie": r.get("penetration_marche_pct_vie", 0),
            }
            for r in top15(rows, "penetration_marche_pct")
        ],
        "par_rentabilite": [
            {"pays": r["pays"], "ulr_moyen": r["ulr_moyen"]}
            for r in sorted(
                [r for r in rows if r.get("ulr_moyen", 0) > 0],
                key=lambda x: x.get("ulr_moyen", 0),
            )[:15]
        ],
        "tableau_pays": tableau_pays_out,
        "tableau_cedantes": tableau_cedantes_out,
    }


def _empty_classements():
    return {
        "par_primes_marche": [],
        "par_subject_premium": [],
        "par_written_premium": [],
        "par_share_written": [],
        "par_penetration_marche": [],
        "par_rentabilite": [],
        "tableau_pays": [],
        "tableau_cedantes": [],
    }


@router.get("/evolution")
def evolution_global(
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """Évolution annuelle sur toutes les années croisées (agrégat tous pays croisés)."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return []

    mapping = _get_mapping()
    ext_cache = _load_all_ext_data(usd_to_mad)
    pays_list = _get_pays_croises(df, mapping, ext_cache)
    pays_map = {pc["pays_interne"]: pc["pays_externe"] for pc in pays_list}

    # Collect data by year
    by_year: dict[int, dict] = {}

    for pays_risque_up, nom_pays_ext in pays_map.items():
        mask = df["_PAYS_UPPER"] == pays_risque_up
        df_pays = df[mask & df["UNDERWRITING_YEAR"].isin(EXT_YEARS)]
        if df_pays.empty:
            continue

        # Internal per-year
        for yr, grp in df_pays.groupby("UNDERWRITING_YEAR"):
            yr_int = int(yr)
            if yr_int not in by_year:
                by_year[yr_int] = {
                    "primes_marche_nonvie_mad": 0.0,
                    "primes_marche_vie_mad": 0.0,
                    "primes_marche_total_mad": 0.0,
                    "subject_premium": 0.0,
                    "subject_nonvie": 0.0,
                    "subject_vie": 0.0,
                    "written_premium": 0.0,
                    "written_nonvie": 0.0,
                    "written_vie": 0.0,
                    "share_written_values": [],
                    "share_written_values_nonvie": [],
                    "share_written_values_vie": [],
                }
            sp = _safe_float(grp["SUBJECT_PREMIUM"].sum()) or 0.0
            wp = _safe_float(grp["WRITTEN_PREMIUM"].sum()) or 0.0
            sw_vals = grp["SHARE_WRITTEN"].dropna().tolist()
            # Split Vie / Non-Vie
            if "_BRANCHE_UPPER" in grp.columns:
                vie_m = grp["_BRANCHE_UPPER"] == "VIE"
                grp_vie = grp[vie_m]
                grp_nv = grp[~vie_m]
            else:
                grp_vie = grp.iloc[0:0]
                grp_nv = grp
            by_year[yr_int]["subject_premium"] += sp
            by_year[yr_int]["subject_nonvie"] += _safe_float(grp_nv["SUBJECT_PREMIUM"].sum()) or 0.0
            by_year[yr_int]["subject_vie"] += _safe_float(grp_vie["SUBJECT_PREMIUM"].sum()) or 0.0
            by_year[yr_int]["written_premium"] += wp
            by_year[yr_int]["written_nonvie"] += _safe_float(grp_nv["WRITTEN_PREMIUM"].sum()) or 0.0
            by_year[yr_int]["written_vie"] += _safe_float(grp_vie["WRITTEN_PREMIUM"].sum()) or 0.0
            by_year[yr_int]["share_written_values"].extend(sw_vals)
            by_year[yr_int]["share_written_values_nonvie"].extend(grp_nv["SHARE_WRITTEN"].dropna().tolist())
            by_year[yr_int]["share_written_values_vie"].extend(grp_vie["SHARE_WRITTEN"].dropna().tolist())

        # External per-year — from cache (no DB)
        ext_ts = _get_ext_timeseries_from_cache(nom_pays_ext, ext_cache)
        for ext_row in ext_ts:
            yr_int = ext_row["year"]
            if yr_int not in by_year:
                by_year[yr_int] = {
                    "primes_marche_nonvie_mad": 0.0,
                    "primes_marche_vie_mad": 0.0,
                    "primes_marche_total_mad": 0.0,
                    "subject_premium": 0.0,
                    "subject_nonvie": 0.0,
                    "subject_vie": 0.0,
                    "written_premium": 0.0,
                    "written_nonvie": 0.0,
                    "written_vie": 0.0,
                    "share_written_values": [],
                    "share_written_values_nonvie": [],
                    "share_written_values_vie": [],
                }
            by_year[yr_int]["primes_marche_nonvie_mad"] += ext_row["nonvie"]
            by_year[yr_int]["primes_marche_vie_mad"] += ext_row["vie"]
            by_year[yr_int]["primes_marche_total_mad"] += ext_row["total"]

    result = []
    for yr in sorted(by_year.keys()):
        d = by_year[yr]
        sw_avg = float(np.mean(d["share_written_values"])) if d["share_written_values"] else 0.0
        sw_avg_nv = float(np.mean(d["share_written_values_nonvie"])) if d.get("share_written_values_nonvie") else 0.0
        sw_avg_v = float(np.mean(d["share_written_values_vie"])) if d.get("share_written_values_vie") else 0.0
        penet = _calc_penetration(sw_avg, d["subject_premium"], d["primes_marche_total_mad"])
        penet_nv = _calc_penetration(sw_avg_nv, d.get("subject_nonvie", 0), d["primes_marche_nonvie_mad"])
        penet_v = _calc_penetration(sw_avg_v, d.get("subject_vie", 0), d["primes_marche_vie_mad"])
        result.append(
            {
                "year": yr,
                "primes_marche_nonvie_mad": d["primes_marche_nonvie_mad"],
                "primes_marche_vie_mad": d["primes_marche_vie_mad"],
                "primes_marche_total_mad": d["primes_marche_total_mad"],
                "subject_premium": d["subject_premium"],
                "subject_nonvie": d.get("subject_nonvie", 0),
                "subject_vie": d.get("subject_vie", 0),
                "written_premium": d["written_premium"],
                "written_nonvie": d.get("written_nonvie", 0),
                "written_vie": d.get("written_vie", 0),
                "share_written_avg": sw_avg,
                "share_written_avg_nonvie": sw_avg_nv,
                "share_written_avg_vie": sw_avg_v,
                "penetration_marche_pct": penet,
                "penetration_marche_pct_nonvie": penet_nv,
                "penetration_marche_pct_vie": penet_v,
            }
        )
    return result


@router.get("/tableau-pays")
def tableau_pays(
    year: str = QParam("2024"),
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """Tableau de synthèse par pays croisé."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return []

    year_int = None if year == "moyenne" else int(year)
    mapping = _get_mapping()
    ext_cache = _load_all_ext_data(usd_to_mad)
    pays_list = _get_pays_croises(df, mapping, ext_cache)

    rows = []
    for pc in pays_list:
        kpis = _compute_pays_kpis(df, pc["pays_interne"], pc["pays_externe"], year_int, ext_cache)
        if not kpis:
            continue
        rows.append(
            {
                "pays": kpis["pays"],
                "primes_marche_total_mad": kpis["primes_marche_total_mad"],
                "primes_nonvie_mad": kpis["primes_marche_nonvie_mad"],
                "primes_vie_mad": kpis["primes_marche_vie_mad"],
                "subject_premium": kpis["subject_premium"],
                "subject_nonvie": kpis["subject_premium_nonvie"],
                "subject_vie": kpis["subject_premium_vie"],
                "written_premium": kpis["written_premium"],
                "written_nonvie": kpis["written_premium_nonvie"],
                "written_vie": kpis["written_premium_vie"],
                "share_written_avg": kpis["share_written_avg"],
                "share_written_avg_nonvie": kpis["share_written_avg_nonvie"],
                "share_written_avg_vie": kpis["share_written_avg_vie"],
                "penetration_marche_pct": kpis["penetration_marche_pct"],
                "penetration_marche_pct_nonvie": kpis["penetration_marche_pct_nonvie"],
                "penetration_marche_pct_vie": kpis["penetration_marche_pct_vie"],
                "nb_affaires": kpis["nb_affaires"],
                "nb_cedantes": kpis["nb_cedantes"],
                "ulr_moyen": kpis["ulr_moyen"],
            }
        )
    return sorted(rows, key=lambda x: x["written_premium"], reverse=True)


@router.get("/tableau-cedantes")
def tableau_cedantes_global(
    year: str = QParam("2024"),
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """Tableau détaillé par cédante, sur tous les pays croisés."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return []

    year_int = None if year == "moyenne" else int(year)
    mapping = _get_mapping()
    ext_cache = _load_all_ext_data(usd_to_mad)
    pays_list = _get_pays_croises(df, mapping, ext_cache)

    result = []
    for pc in pays_list:
        rows = _tableau_cedantes_for_pays(
            df, pc["pays_interne"], pc["pays_externe"], year_int, ext_cache
        )
        result.extend(rows)

    return sorted(result, key=lambda x: x["written_premium"], reverse=True)


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS — Page pays /analyse-synergie/:pays
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pays/{pays}/kpis")
def kpis_pays(
    pays: str,
    year: str = QParam("2024"),
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """KPIs pour un seul pays."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return _empty_global_kpis()

    pays_up = pays.strip().upper()
    mapping = _get_mapping()
    nom_pays_ext = mapping.get(pays_up)
    if not nom_pays_ext:
        return _empty_global_kpis()

    year_int = None if year == "moyenne" else int(year)
    ext_cache = _load_all_ext_data(usd_to_mad)
    pays_list = _get_pays_croises(df, mapping, ext_cache)
    pc = next((p for p in pays_list if p["pays_interne"] == pays_up), None)

    kpis = _compute_pays_kpis(df, pays_up, nom_pays_ext, year_int, ext_cache)
    if not kpis:
        return _empty_global_kpis()

    return {
        "nb_pays_croises": 1,
        "nb_pays_croises_nonvie": 1 if kpis.get("subject_premium_nonvie", 0) > 0 else 0,
        "nb_pays_croises_vie": 1 if kpis.get("subject_premium_vie", 0) > 0 else 0,
        "primes_marche_total_mad": kpis["primes_marche_total_mad"],
        "primes_marche_nonvie_mad": kpis["primes_marche_nonvie_mad"],
        "primes_marche_vie_mad": kpis["primes_marche_vie_mad"],
        "subject_premium_total": kpis["subject_premium"],
        "subject_premium_nonvie_total": kpis["subject_premium_nonvie"],
        "subject_premium_vie_total": kpis["subject_premium_vie"],
        "written_premium_total": kpis["written_premium"],
        "written_premium_nonvie_total": kpis["written_premium_nonvie"],
        "written_premium_vie_total": kpis["written_premium_vie"],
        "share_written_avg": kpis["share_written_avg"],
        "share_written_avg_nonvie": kpis["share_written_avg_nonvie"],
        "share_written_avg_vie": kpis["share_written_avg_vie"],
        "penetration_marche_pct": kpis["penetration_marche_pct"],
        "penetration_marche_pct_nonvie": kpis["penetration_marche_pct_nonvie"],
        "penetration_marche_pct_vie": kpis["penetration_marche_pct_vie"],
        "ulr_moyen": kpis["ulr_moyen"],
        "ulr_moyen_nonvie": kpis["ulr_moyen_nonvie"],
        "ulr_moyen_vie": kpis["ulr_moyen_vie"],
        "nb_affaires": kpis["nb_affaires"],
        "nb_affaires_nonvie": kpis["nb_affaires_nonvie"],
        "nb_affaires_vie": kpis["nb_affaires_vie"],
        "nb_cedantes": kpis["nb_cedantes"],
        "nb_cedantes_nonvie": kpis["nb_cedantes_nonvie"],
        "nb_cedantes_vie": kpis["nb_cedantes_vie"],
        "annees_disponibles": pc["annees_disponibles"] if pc else [],
    }


@router.get("/pays/{pays}/evolution")
def evolution_pays(
    pays: str,
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """Évolution annuelle pour un seul pays."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return []

    pays_up = pays.strip().upper()
    mapping = _get_mapping()
    nom_pays_ext = mapping.get(pays_up)
    if not nom_pays_ext:
        return []

    ext_cache = _load_all_ext_data(usd_to_mad)

    mask = df["_PAYS_UPPER"] == pays_up
    df_pays = df[mask & df["UNDERWRITING_YEAR"].isin(EXT_YEARS)]

    ext_ts = _get_ext_timeseries_from_cache(nom_pays_ext, ext_cache)
    ext_by_year = {r["year"]: r for r in ext_ts}

    by_year: dict[int, dict] = {}

    for yr, grp in df_pays.groupby("UNDERWRITING_YEAR"):
        yr_int = int(yr)
        sp = _safe_float(grp["SUBJECT_PREMIUM"].sum()) or 0.0
        wp = _safe_float(grp["WRITTEN_PREMIUM"].sum()) or 0.0
        sw_vals = grp["SHARE_WRITTEN"].dropna().tolist()
        # Split Vie / Non-Vie
        if "_BRANCHE_UPPER" in grp.columns:
            vie_m = grp["_BRANCHE_UPPER"] == "VIE"
            grp_vie = grp[vie_m]
            grp_nv = grp[~vie_m]
        else:
            grp_vie = grp.iloc[0:0]
            grp_nv = grp
        by_year[yr_int] = {
            "subject_premium": sp,
            "subject_nonvie": _safe_float(grp_nv["SUBJECT_PREMIUM"].sum()) or 0.0,
            "subject_vie": _safe_float(grp_vie["SUBJECT_PREMIUM"].sum()) or 0.0,
            "written_premium": wp,
            "written_nonvie": _safe_float(grp_nv["WRITTEN_PREMIUM"].sum()) or 0.0,
            "written_vie": _safe_float(grp_vie["WRITTEN_PREMIUM"].sum()) or 0.0,
            "share_written_values": sw_vals,
            "share_written_values_nonvie": grp_nv["SHARE_WRITTEN"].dropna().tolist(),
            "share_written_values_vie": grp_vie["SHARE_WRITTEN"].dropna().tolist(),
        }

    _empty_int = {
        "subject_premium": 0.0, "subject_nonvie": 0.0, "subject_vie": 0.0,
        "written_premium": 0.0, "written_nonvie": 0.0, "written_vie": 0.0,
        "share_written_values": [],
        "share_written_values_nonvie": [],
        "share_written_values_vie": [],
    }
    all_years = sorted((set(by_year.keys()) | set(ext_by_year.keys())) & EXT_YEARS)
    result = []
    for yr in all_years:
        int_d = by_year.get(yr, _empty_int)
        ext_d = ext_by_year.get(yr, {"nonvie": 0.0, "vie": 0.0, "total": 0.0})
        sw_avg = float(np.mean(int_d["share_written_values"])) if int_d["share_written_values"] else 0.0
        sw_avg_nv = float(np.mean(int_d["share_written_values_nonvie"])) if int_d.get("share_written_values_nonvie") else 0.0
        sw_avg_v = float(np.mean(int_d["share_written_values_vie"])) if int_d.get("share_written_values_vie") else 0.0
        penet = _calc_penetration(sw_avg, int_d["subject_premium"], ext_d["total"])
        penet_nv = _calc_penetration(sw_avg_nv, int_d.get("subject_nonvie", 0), ext_d["nonvie"])
        penet_v = _calc_penetration(sw_avg_v, int_d.get("subject_vie", 0), ext_d["vie"])
        result.append(
            {
                "year": yr,
                "primes_marche_nonvie_mad": ext_d["nonvie"],
                "primes_marche_vie_mad": ext_d["vie"],
                "primes_marche_total_mad": ext_d["total"],
                "subject_premium": int_d["subject_premium"],
                "subject_nonvie": int_d.get("subject_nonvie", 0),
                "subject_vie": int_d.get("subject_vie", 0),
                "written_premium": int_d["written_premium"],
                "written_nonvie": int_d.get("written_nonvie", 0),
                "written_vie": int_d.get("written_vie", 0),
                "share_written_avg": sw_avg,
                "share_written_avg_nonvie": sw_avg_nv,
                "share_written_avg_vie": sw_avg_v,
                "penetration_marche_pct": penet,
                "penetration_marche_pct_nonvie": penet_nv,
                "penetration_marche_pct_vie": penet_v,
            }
        )
    return result


@router.get("/pays/{pays}/rapport")
def rapport_pays(
    pays: str,
    year: str = QParam("2024"),
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """Rapport détaillé pour un pays : données de positionnement, CAGR, cédantes, branches."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return {}

    pays_up = pays.strip().upper()
    mapping = _get_mapping()
    nom_pays_ext = mapping.get(pays_up)
    if not nom_pays_ext:
        return {}

    year_int = None if year == "moyenne" else int(year)
    ext_cache = _load_all_ext_data(usd_to_mad)

    kpis = _compute_pays_kpis(df, pays_up, nom_pays_ext, year_int, ext_cache)
    if not kpis:
        return {}

    pays_list = _get_pays_croises(df, mapping, ext_cache)
    pc = next((p for p in pays_list if p["pays_interne"] == pays_up), None)
    annees_dispo = pc["annees_disponibles"] if pc else []

    # CAGR marché externe — from cache
    ext_ts = _get_ext_timeseries_from_cache(nom_pays_ext, ext_cache)
    ext_total_by_year = {r["year"]: r["total"] for r in ext_ts if r["total"] > 0}
    croissance_marche_cagr = _calc_cagr(ext_total_by_year)

    # CAGR Atlantic Re (WRITTEN_PREMIUM par année)
    mask = df["_PAYS_UPPER"] == pays_up
    df_pays_all = df[mask & df["UNDERWRITING_YEAR"].isin(EXT_YEARS)]
    wp_by_year = {}
    for yr, grp in df_pays_all.groupby("UNDERWRITING_YEAR"):
        wp = _safe_float(grp["WRITTEN_PREMIUM"].sum())
        if wp:
            wp_by_year[int(yr)] = wp
    croissance_written_cagr = _calc_cagr(wp_by_year)

    # Cédantes détail
    cedantes_detail = _tableau_cedantes_for_pays(
        df, pays_up, nom_pays_ext, year_int, ext_cache
    )
    total_wp_pays = sum(c["written_premium"] for c in cedantes_detail)
    for c in cedantes_detail:
        c["pct_written_vs_pays"] = (
            (c["written_premium"] / total_wp_pays * 100.0) if total_wp_pays else 0.0
        )

    # Branches présentes et absentes
    if year_int:
        df_pays_yr = df_pays_all[df_pays_all["UNDERWRITING_YEAR"] == year_int]
    else:
        df_pays_yr = df_pays_all

    branches_presentes = sorted(
        df_pays_yr["_BRANCHE_UPPER"].dropna().unique().tolist()
    ) if "_BRANCHE_UPPER" in df_pays_yr.columns else []

    branches_all_global = sorted(
        df["_BRANCHE_UPPER"].dropna().unique().tolist()
    ) if "_BRANCHE_UPPER" in df.columns else []

    branches_absentes = sorted(
        set(branches_all_global) - set(branches_presentes)
    )

    # Évolution Atlantic Re (per year) — uses cache, no additional DB calls
    evo_atlantic = []
    for yr in sorted(annees_dispo):
        yr_kpis = _compute_pays_kpis(df, pays_up, nom_pays_ext, yr, ext_cache)
        if yr_kpis:
            evo_atlantic.append(
                {
                    "year": yr,
                    "subject_premium": yr_kpis["subject_premium"],
                    "written_premium": yr_kpis["written_premium"],
                    "share_written_avg": yr_kpis["share_written_avg"],
                    "penetration_marche_pct": yr_kpis["penetration_marche_pct"],
                }
            )

    return {
        "pays": pays_up,
        "pays_externe": nom_pays_ext,
        "primes_marche_total_mad": kpis["primes_marche_total_mad"],
        "primes_nonvie_mad": kpis["primes_marche_nonvie_mad"],
        "primes_vie_mad": kpis["primes_marche_vie_mad"],
        "subject_premium": kpis["subject_premium"],
        "written_premium": kpis["written_premium"],
        "share_written_avg": kpis["share_written_avg"],
        "penetration_marche_pct": kpis["penetration_marche_pct"],
        "ulr_moyen": kpis["ulr_moyen"],
        "nb_cedantes": kpis["nb_cedantes"],
        "nb_affaires": kpis["nb_affaires"],
        "croissance_marche_cagr": croissance_marche_cagr,
        "croissance_written_cagr": croissance_written_cagr,
        "cedantes_detail": sorted(cedantes_detail, key=lambda x: x["written_premium"], reverse=True),
        "branches_presentes": branches_presentes,
        "branches_absentes": branches_absentes,
        "evolution_marche": ext_ts,
        "evolution_atlantic": evo_atlantic,
        "annees_disponibles": annees_dispo,
    }


@router.get("/pays/{pays}/tableau-cedantes")
def tableau_cedantes_pays(
    pays: str,
    year: str = QParam("2024"),
    usd_to_mad: float = QParam(9.5),
    _: dict = Depends(get_current_user),
):
    """Tableau des cédantes pour un seul pays."""
    df = _get_synergie_df()
    if df is None or df.empty:
        return []

    pays_up = pays.strip().upper()
    mapping = _get_mapping()
    nom_pays_ext = mapping.get(pays_up)
    if not nom_pays_ext:
        return []

    year_int = None if year == "moyenne" else int(year)
    ext_cache = _load_all_ext_data(usd_to_mad)
    rows = _tableau_cedantes_for_pays(df, pays_up, nom_pays_ext, year_int, ext_cache)

    total_wp = sum(r["written_premium"] for r in rows)
    for r in rows:
        r["pct_written_vs_pays"] = (r["written_premium"] / total_wp * 100.0) if total_wp else 0.0

    return sorted(rows, key=lambda x: x["written_premium"], reverse=True)


# ── Helper: tableau cédantes pour un pays ─────────────────────────────────────

def _tableau_cedantes_for_pays(
    df: pd.DataFrame,
    pays_risque: str,
    nom_pays_ext: str,
    year_int: Optional[int],
    ext_cache: dict,
) -> list[dict]:
    mask_pays = df["_PAYS_UPPER"] == pays_risque.upper()
    df_pays_all = df[mask_pays & df["UNDERWRITING_YEAR"].isin(EXT_YEARS)]

    if df_pays_all.empty:
        return []

    if year_int is not None:
        df_pays = df_pays_all[df_pays_all["UNDERWRITING_YEAR"] == year_int]
    else:
        df_pays = df_pays_all

    if df_pays.empty:
        return []

    ulr_col = _get_ulr_col(df_pays)
    ext = _get_ext_primes_from_cache(nom_pays_ext, year_int, ext_cache)
    primes_marche_total_mad = ext["total_mad"]

    cedante_col = "INT_CEDANTE" if "INT_CEDANTE" in df_pays.columns else None
    if not cedante_col:
        return []

    result = []
    for cedante, grp in df_pays.groupby(cedante_col):
        if not cedante:
            continue
        sp = _safe_float(grp["SUBJECT_PREMIUM"].sum()) or 0.0
        wp = _safe_float(grp["WRITTEN_PREMIUM"].sum()) or 0.0
        sw_vals = grp["SHARE_WRITTEN"].dropna()
        sw_avg = float(sw_vals.mean()) if not sw_vals.empty else 0.0
        ulr_vals = grp[ulr_col].dropna() if ulr_col else pd.Series(dtype=float)
        ulr = float(ulr_vals.mean()) if not ulr_vals.empty else 0.0
        nb = len(grp)
        branches = sorted(grp["INT_BRANCHE"].dropna().str.strip().str.upper().unique().tolist()) if "INT_BRANCHE" in grp.columns else []
        penet = _calc_penetration(sw_avg, sp, primes_marche_total_mad)
        # Split Vie / Non-Vie
        if "_BRANCHE_UPPER" in grp.columns:
            vie_m = grp["_BRANCHE_UPPER"] == "VIE"
            grp_vie = grp[vie_m]
            grp_nv = grp[~vie_m]
        else:
            grp_vie = grp.iloc[0:0]
            grp_nv = grp
        sp_nonvie = _safe_float(grp_nv["SUBJECT_PREMIUM"].sum()) or 0.0
        sp_vie = _safe_float(grp_vie["SUBJECT_PREMIUM"].sum()) or 0.0
        wp_nonvie = _safe_float(grp_nv["WRITTEN_PREMIUM"].sum()) or 0.0
        wp_vie = _safe_float(grp_vie["WRITTEN_PREMIUM"].sum()) or 0.0
        sw_nonvie_vals = grp_nv["SHARE_WRITTEN"].dropna()
        sw_vie_vals = grp_vie["SHARE_WRITTEN"].dropna()
        sw_avg_nonvie = float(sw_nonvie_vals.mean()) if not sw_nonvie_vals.empty else 0.0
        sw_avg_vie = float(sw_vie_vals.mean()) if not sw_vie_vals.empty else 0.0
        # Utilise le même dénominateur (marché total) pour les trois variantes de pénétration
        # afin que si les primes Vie = 0, penet_total == penet_nonvie (cohérence filtre Tout vs Non-Vie)
        penet_nonvie = _calc_penetration(sw_avg_nonvie, sp_nonvie, primes_marche_total_mad)
        penet_vie = _calc_penetration(sw_avg_vie, sp_vie, primes_marche_total_mad)

        result.append(
            {
                "cedante": str(cedante),
                "pays_risque": pays_risque,
                "nb_affaires": nb,
                "subject_premium": sp,
                "subject_nonvie": sp_nonvie,
                "subject_vie": sp_vie,
                "written_premium": wp,
                "written_nonvie": wp_nonvie,
                "written_vie": wp_vie,
                "share_written_avg": sw_avg,
                "share_written_avg_nonvie": sw_avg_nonvie,
                "share_written_avg_vie": sw_avg_vie,
                "penetration_marche_pct": penet,
                "penetration_marche_pct_nonvie": penet_nonvie,
                "penetration_marche_pct_vie": penet_vie,
                "ulr_moyen": ulr,
                "branches": branches,
                "pct_written_vs_pays": 0.0,  # calculé par l'appelant
            }
        )
    return result
