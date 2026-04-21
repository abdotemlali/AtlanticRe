"""
Router FastAPI — Analyse Compagnie (Axe 2).
Préfixe : /api/companies

Charge les deux CSV de compagnies d'assurance/réassurance africaines et expose
des endpoints analytiques pour la page AnalyseCompagnie du frontend.
"""
from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any, Optional
from urllib.parse import unquote

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi import Query as QParam

import re as _re
import unicodedata as _unicodedata

from services.cedante_matching_service import CEDANTE_MAPPING

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["Analyse Compagnie"])

# Suffixes/mots juridiques à retirer avant comparaison (mais PAS les termes sectoriels)
_LEGAL_SUFFIXES = _re.compile(
    r"\b(ltd|limited|plc|inc|s\.?a\.?e?\.?|s\.?a\.?r?l?\.?|corp|corporation|company|"
    r"pty|pvt|private|bsc|psc|pjsc|saoc|saog|berhad|tbk|wll|oy|llc|"
    r"and|the|de|du|d|l)\b",
    _re.IGNORECASE,
)
# Contenu entre parenthèses (e.g. "(Tunis Re)", "(Tan-Re)")
_PARENS = _re.compile(r"\([^)]*\)")


def _light_normalize(text: str) -> str:
    """Minuscules + sans accents + sans ponctuation + sans suffixes juridiques + sans parenthèses."""
    t = _PARENS.sub(" ", text)                                                     # retire (...)
    t = _unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode("ascii")
    t = _re.sub(r"[^a-z0-9\s]", " ", t)
    t = _LEGAL_SUFFIXES.sub(" ", t)
    return _re.sub(r"\s+", " ", t).strip()


# Lookup : light_normalize(alias) → canonical
_LIGHT_MAP: dict[str, str] = {}
for _k, _v in CEDANTE_MAPPING.items():
    _nk = _light_normalize(_k)
    if _nk and _nk not in _LIGHT_MAP:
        _LIGHT_MAP[_nk] = _v


def _build_canonical_map(unique_names: list[str]) -> dict[str, str]:
    """
    Pour chaque nom brut CSV, cherche un match exact (après normalisation légère).
    Si aucun match, conserve le nom brut.
    """
    result: dict[str, str] = {}
    for raw in unique_names:
        norm = _light_normalize(str(raw))
        result[raw] = _LIGHT_MAP.get(norm, raw)
    return result

# ── Chemins CSV ────────────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).parent.parent.parent / "data" / "external"
_CSV_REASS = _BASE_DIR / "companies_reassurance_filtered_updated.csv"
_CSV_ASSUR = _BASE_DIR / "companies_assurance_filtered_updated.csv"

# ── Chargement global au démarrage ─────────────────────────────────────────────
_df_companies: pd.DataFrame = pd.DataFrame()


def _load_companies() -> None:
    global _df_companies
    frames: list[pd.DataFrame] = []

    for csv_path in (_CSV_REASS, _CSV_ASSUR):
        if csv_path.exists():
            try:
                df = pd.read_csv(csv_path)
                frames.append(df)
                logger.info("CSV chargé : %s (%d lignes)", csv_path.name, len(df))
            except Exception as exc:
                logger.warning("Impossible de charger %s : %s", csv_path.name, exc)
        else:
            logger.warning("CSV introuvable : %s", csv_path)

    if frames:
        _df_companies = pd.concat(frames, ignore_index=True)
        # Normalisation des colonnes
        _df_companies.columns = [c.strip() for c in _df_companies.columns]
        # Renommage court pour faciliter l'usage
        _df_companies.rename(columns={
            "Primes Emises (mn USD)":                "primes",
            "Croissance Primes (%)":                 "croissance",
            "Taux Penetration (%)":                  "penetration",
            "Densite Assurance (USD/hab)":           "densite",
            "Part de marché pays (%)":               "part_marche",
            "Primes Emises Année Précédente (mn USD)": "primes_prec",
            "Année":                                 "annee",
            "Line_Of_Business":                      "lob",
            "Company_Type":                          "company_type",
        }, inplace=True)
        # Types
        for col in ("primes", "croissance", "penetration", "densite", "part_marche", "primes_prec"):
            _df_companies[col] = pd.to_numeric(_df_companies[col], errors="coerce")
        _df_companies["annee"] = pd.to_numeric(_df_companies["annee"], errors="coerce").astype("Int64")
        # Nom canonique via SmartCedanteMatcher (une seule passe sur les noms uniques)
        unique_names = _df_companies["Company"].dropna().unique().tolist()
        canon_map = _build_canonical_map(unique_names)
        _df_companies["canonical_name"] = _df_companies["Company"].map(canon_map).fillna(_df_companies["Company"])
        logger.info("DataFrame companies consolidé : %d lignes", len(_df_companies))
    else:
        logger.error("Aucun CSV companies chargé !")


# Chargement au démarrage du module
_load_companies()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe(val: Any) -> Optional[float]:
    """Convertit en float Python ou None si NaN/inf."""
    try:
        v = float(val)
        return None if (math.isnan(v) or math.isinf(v)) else v
    except (TypeError, ValueError):
        return None


def _mean_safe(series: pd.Series) -> Optional[float]:
    vals = series.dropna()
    return _safe(vals.mean()) if len(vals) else None


def _filter_by_type(df: pd.DataFrame, type_param: Optional[str]) -> pd.DataFrame:
    """Filtre le DataFrame selon le paramètre type (assurance/reassurance/None)."""
    if type_param == "assurance":
        return df[df["company_type"] == "Insurance"]
    if type_param == "reassurance":
        return df[df["company_type"] == "Reinsurance"]
    return df


# ── Endpoint : filters ─────────────────────────────────────────────────────────
# DOIT être déclaré avant /{company_name} pour éviter la collision FastAPI

@router.get("/filters")
def get_filters():
    """Retourne les valeurs distinctes pour les filtres dropdown."""
    if _df_companies.empty:
        return {"pays": [], "lob": [], "types": []}

    pays = sorted(_df_companies["Pays"].dropna().unique().tolist())
    lobs = sorted(_df_companies["lob"].dropna().unique().tolist())
    types = sorted(_df_companies["company_type"].dropna().unique().tolist())

    return {"pays": pays, "lob": lobs, "types": types}


# ── Endpoint : names ───────────────────────────────────────────────────────────

@router.get("/names")
def get_names():
    """Retourne la liste de tous les noms canoniques uniques (pour vérifier l'existence)."""
    if _df_companies.empty:
        return []
    names = sorted(_df_companies["canonical_name"].dropna().unique().tolist())
    return names


# ── Endpoint : global ──────────────────────────────────────────────────────────

@router.get("/global")
def get_global(type: Optional[str] = QParam(None)):
    """Vue agrégée globale des compagnies."""
    if _df_companies.empty:
        raise HTTPException(503, "Données non disponibles")

    df = _filter_by_type(_df_companies.copy(), type)
    if df.empty:
        return _empty_global()

    # Agrégat par compagnie canonique (toutes LOBs confondues) pour KPIs
    comp_agg = df.groupby("canonical_name", dropna=False).agg(
        total_primes=("primes", "sum"),
        avg_croissance=("croissance", "mean"),
        avg_penetration=("penetration", "mean"),
        avg_densite=("densite", "mean"),
        company_type=("company_type", "first"),
        pays=("Pays", "first"),
        lob=("lob", "first"),
    ).reset_index()

    total_companies = int(comp_agg["canonical_name"].nunique())
    total_countries = int(df["Pays"].nunique())
    total_primes = _safe(df["primes"].sum()) or 0.0
    avg_croissance = _mean_safe(df["croissance"])
    avg_penetration = _mean_safe(df["penetration"])
    avg_densite = _mean_safe(df["densite"])

    # By LOB
    lob_grp = df.groupby("lob", dropna=False).agg(
        count=("Company", "nunique"),
        total_primes=("primes", "sum"),
    ).reset_index()
    by_lob = [
        {"lob": str(r["lob"]), "count": int(r["count"]), "total_primes": _safe(r["total_primes"]) or 0.0}
        for _, r in lob_grp.iterrows()
    ]

    # By country
    country_grp = df.groupby("Pays", dropna=False).agg(
        count=("Company", "nunique"),
        total_primes=("primes", "sum"),
        avg_part_marche=("part_marche", "mean"),
    ).reset_index().sort_values("total_primes", ascending=False)
    by_country = [
        {
            "pays": str(r["Pays"]),
            "count": int(r["count"]),
            "total_primes": _safe(r["total_primes"]) or 0.0,
            "avg_part_marche": _safe(r["avg_part_marche"]),
        }
        for _, r in country_grp.iterrows()
    ]

    # By year
    year_grp = df.groupby("annee", dropna=False).agg(
        total_primes=("primes", "sum"),
        count=("Company", "nunique"),
    ).reset_index().sort_values("annee")
    by_year = [
        {"annee": int(r["annee"]), "total_primes": _safe(r["total_primes"]) or 0.0, "count": int(r["count"])}
        for _, r in year_grp.iterrows()
        if pd.notna(r["annee"])
    ]

    # By type
    type_grp = df.groupby("company_type", dropna=False).agg(
        count=("Company", "nunique"),
        total_primes=("primes", "sum"),
    ).reset_index()
    by_type = [
        {"type": str(r["company_type"]), "count": int(r["count"]), "total_primes": _safe(r["total_primes"]) or 0.0}
        for _, r in type_grp.iterrows()
    ]

    # Top companies (top 15 par primes totales)
    top = comp_agg.sort_values("total_primes", ascending=False).head(15)
    top_companies = [
        {
            "company": str(r["canonical_name"]),
            "pays": str(r["pays"]),
            "total_primes": _safe(r["total_primes"]) or 0.0,
            "avg_croissance": _safe(r["avg_croissance"]),
            "lob": str(r["lob"]),
            "type": str(r["company_type"]),
        }
        for _, r in top.iterrows()
    ]

    # Growth distribution (top 50 companies par primes pour scatter)
    scatter_src = comp_agg.sort_values("total_primes", ascending=False).head(50)
    growth_distribution = [
        {
            "company": str(r["canonical_name"]),
            "croissance": _safe(r["avg_croissance"]),
            "primes": _safe(r["total_primes"]) or 0.0,
            "pays": str(r["pays"]),
            "type": str(r["company_type"]),
        }
        for _, r in scatter_src.iterrows()
        if _safe(r["avg_croissance"]) is not None
    ]

    return {
        "total_companies": total_companies,
        "total_countries": total_countries,
        "total_primes_mn_usd": total_primes,
        "avg_croissance": avg_croissance,
        "avg_penetration": avg_penetration,
        "avg_densite": avg_densite,
        "by_lob": by_lob,
        "by_country": by_country,
        "by_year": by_year,
        "by_type": by_type,
        "top_companies": top_companies,
        "growth_distribution": growth_distribution,
    }


def _empty_global():
    return {
        "total_companies": 0,
        "total_countries": 0,
        "total_primes_mn_usd": 0.0,
        "avg_croissance": None,
        "avg_penetration": None,
        "avg_densite": None,
        "by_lob": [],
        "by_country": [],
        "by_year": [],
        "by_type": [],
        "top_companies": [],
        "growth_distribution": [],
    }


# ── Endpoint : list ────────────────────────────────────────────────────────────

@router.get("/list")
def get_list(
    type: Optional[str] = QParam(None),
    search: Optional[str] = QParam(None),
    pays: Optional[str] = QParam(None),
    lob: Optional[str] = QParam(None),
):
    """Liste paginée et filtrable des compagnies."""
    if _df_companies.empty:
        return []

    df = _filter_by_type(_df_companies.copy(), type)

    if pays:
        df = df[df["Pays"] == pays]
    if lob:
        df = df[df["lob"] == lob]
    if search:
        mask = (
            df["canonical_name"].str.contains(search, case=False, na=False) |
            df["Company"].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    if df.empty:
        return []

    agg = df.groupby("canonical_name", dropna=False).agg(
        company_type=("company_type", "first"),
        total_primes=("primes", "sum"),
        avg_croissance=("croissance", "mean"),
        avg_penetration=("penetration", "mean"),
        avg_densite=("densite", "mean"),
        avg_part_marche=("part_marche", "mean"),
        nb_annees=("annee", "nunique"),
        derniere_annee=("annee", "max"),
    ).reset_index()

    # Listes multi-valeurs
    pays_by_company = df.groupby("canonical_name")["Pays"].apply(lambda x: sorted(x.dropna().unique().tolist())).to_dict()
    lob_by_company  = df.groupby("canonical_name")["lob"].apply(lambda x: sorted(x.dropna().unique().tolist())).to_dict()

    result = []
    for _, r in agg.sort_values("total_primes", ascending=False).iterrows():
        comp = str(r["canonical_name"])
        result.append({
            "company": comp,
            "pays": pays_by_company.get(comp, []),
            "type": str(r["company_type"]),
            "lob": lob_by_company.get(comp, []),
            "total_primes_mn_usd": _safe(r["total_primes"]) or 0.0,
            "avg_croissance_pct": _safe(r["avg_croissance"]),
            "avg_penetration_pct": _safe(r["avg_penetration"]),
            "avg_densite_usd": _safe(r["avg_densite"]),
            "avg_part_marche_pct": _safe(r["avg_part_marche"]),
            "nb_annees": int(r["nb_annees"]) if pd.notna(r["nb_annees"]) else 0,
            "derniere_annee": int(r["derniere_annee"]) if pd.notna(r["derniere_annee"]) else None,
        })

    return result


# ── Endpoint : company detail ──────────────────────────────────────────────────

@router.get("/{company_name}")
def get_company(company_name: str):
    """Fiche détaillée d'une compagnie."""
    name = unquote(company_name)

    if _df_companies.empty:
        raise HTTPException(503, "Données non disponibles")

    # Cherche d'abord par nom canonique (priorité), puis par nom brut CSV
    df = _df_companies[_df_companies["canonical_name"] == name].copy()
    if df.empty:
        mask = _df_companies["canonical_name"].str.lower() == name.lower()
        df = _df_companies[mask].copy()
    if df.empty:
        mask = _df_companies["Company"].str.lower() == name.lower()
        df = _df_companies[mask].copy()
    if df.empty:
        raise HTTPException(404, f"Compagnie '{name}' introuvable")

    canonical = str(df["canonical_name"].iloc[0])
    company_type = str(df["company_type"].iloc[0])
    lobs = sorted(df["lob"].dropna().unique().tolist())
    pays_list = sorted(df["Pays"].dropna().unique().tolist())

    # Évolution par année (toutes LOBs agrégées)
    evo_grp = df.groupby("annee", dropna=False).agg(
        primes=("primes", "sum"),
        croissance=("croissance", "mean"),
        part_marche=("part_marche", "mean"),
    ).reset_index().sort_values("annee")
    evolution = [
        {
            "annee": int(r["annee"]),
            "primes_mn_usd": _safe(r["primes"]),
            "croissance_pct": _safe(r["croissance"]),
            "part_marche_pct": _safe(r["part_marche"]),
        }
        for _, r in evo_grp.iterrows()
        if pd.notna(r["annee"])
    ]

    # By LOB
    lob_grp = df.groupby("lob", dropna=False).agg(
        total_primes=("primes", "sum"),
        avg_croissance=("croissance", "mean"),
    ).reset_index()
    by_lob = [
        {
            "lob": str(r["lob"]),
            "total_primes": _safe(r["total_primes"]) or 0.0,
            "avg_croissance": _safe(r["avg_croissance"]),
        }
        for _, r in lob_grp.iterrows()
    ]

    # By pays
    pays_grp = df.groupby("Pays", dropna=False).agg(
        total_primes=("primes", "sum"),
        avg_part_marche=("part_marche", "mean"),
        avg_penetration=("penetration", "mean"),
        avg_densite=("densite", "mean"),
    ).reset_index().sort_values("total_primes", ascending=False)
    by_pays = [
        {
            "pays": str(r["Pays"]),
            "total_primes": _safe(r["total_primes"]) or 0.0,
            "avg_part_marche": _safe(r["avg_part_marche"]),
            "avg_penetration": _safe(r["avg_penetration"]),
            "avg_densite": _safe(r["avg_densite"]),
        }
        for _, r in pays_grp.iterrows()
    ]

    # KPIs
    total_primes = _safe(df["primes"].sum()) or 0.0
    avg_croissance = _mean_safe(df["croissance"])
    avg_penetration = _mean_safe(df["penetration"])
    avg_densite = _mean_safe(df["densite"])
    avg_part_marche = _mean_safe(df["part_marche"])
    nb_pays = int(df["Pays"].nunique())
    nb_annees = int(df["annee"].nunique())
    derniere_annee_val = df["annee"].max()
    derniere_annee = int(derniere_annee_val) if pd.notna(derniere_annee_val) else None

    # Primes dernière année
    primes_derniere_annee: Optional[float] = None
    if derniere_annee:
        primes_derniere_annee = _safe(df[df["annee"] == derniere_annee]["primes"].sum())

    # Meilleure croissance par pays
    meilleure_croissance_pays: Optional[str] = None
    max_croissance_pct: Optional[float] = None
    if not pays_grp.empty:
        cro_by_pays = df.groupby("Pays")["croissance"].mean().dropna()
        if not cro_by_pays.empty:
            best_pays = str(cro_by_pays.idxmax())
            meilleure_croissance_pays = best_pays
            max_croissance_pct = _safe(cro_by_pays.max())

    kpis = {
        "total_primes_mn_usd": total_primes,
        "avg_croissance_pct": avg_croissance,
        "avg_penetration_pct": avg_penetration,
        "avg_densite_usd": avg_densite,
        "avg_part_marche_pct": avg_part_marche,
        "nb_pays": nb_pays,
        "nb_annees": nb_annees,
        "derniere_annee": derniere_annee,
        "primes_derniere_annee": primes_derniere_annee,
        "meilleure_croissance_pays": meilleure_croissance_pays,
        "max_croissance_pct": max_croissance_pct,
    }

    # Raw rows
    raw_rows = []
    for _, r in df.sort_values(["Pays", "annee"]).iterrows():
        raw_rows.append({
            "company": str(r["Company"]),
            "pays": str(r["Pays"]),
            "annee": int(r["annee"]) if pd.notna(r["annee"]) else None,
            "primes_mn_usd": _safe(r["primes"]),
            "croissance_pct": _safe(r["croissance"]),
            "penetration_pct": _safe(r["penetration"]),
            "densite_usd": _safe(r["densite"]),
            "part_marche_pct": _safe(r["part_marche"]),
            "lob": str(r["lob"]),
            "type": str(r["company_type"]),
        })

    return {
        "company": canonical,
        "type": company_type,
        "lob": lobs,
        "pays": pays_list,
        "evolution": evolution,
        "by_lob": by_lob,
        "by_pays": by_pays,
        "kpis": kpis,
        "raw_rows": raw_rows,
    }
