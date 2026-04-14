"""
Service de lecture des données externes (marché africain) stockées en MySQL.

Joint les 4 tables externes (non-vie, vie, gouvernance, macro) avec la table
de référence ref_pays, et expose des helpers pour profils pays, séries
temporelles, agrégats régionaux et inputs de scoring.
"""
from functools import lru_cache
from typing import Optional, List, Dict, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.external_db_models import (
    RefPays,
    ExtMarcheNonVie,
    ExtMarcheVie,
    ExtGouvernance,
    ExtMacroeconomie,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _empty_market_row(nom_pays: str, ref: Optional[RefPays] = None, annee: Optional[int] = None) -> Dict[str, Any]:
    return {
        "pays": nom_pays,
        "code_iso3": ref.code_iso3 if ref else None,
        "region": ref.region if ref else None,
        "annee": annee,
        "primes_non_vie_mn_usd": None,
        "croissance_primes_non_vie_pct": None,
        "taux_penetration_non_vie_pct": None,
        "ratio_sp_non_vie_pct": None,
        "densite_non_vie_usd": None,
        "primes_vie_mn_usd": None,
        "croissance_primes_vie_pct": None,
        "taux_penetration_vie_pct": None,
        "densite_vie_usd": None,
        "fdi_inflows_pct_gdp": None,
        "political_stability": None,
        "regulatory_quality": None,
        "kaopen": None,
        "gdp_growth_pct": None,
        "current_account_mn": None,
        "exchange_rate": None,
        "gdp_per_capita": None,
        "gdp_mn": None,
        "inflation_rate_pct": None,
    }


def _apply_non_vie(row: Dict[str, Any], nv: Optional[ExtMarcheNonVie]) -> None:
    if not nv:
        return
    row["primes_non_vie_mn_usd"] = nv.primes_emises_mn_usd
    row["croissance_primes_non_vie_pct"] = nv.croissance_primes_pct
    row["taux_penetration_non_vie_pct"] = nv.taux_penetration_pct
    row["ratio_sp_non_vie_pct"] = nv.ratio_sp_pct
    row["densite_non_vie_usd"] = nv.densite_assurance_usd


def _apply_vie(row: Dict[str, Any], v: Optional[ExtMarcheVie]) -> None:
    if not v:
        return
    row["primes_vie_mn_usd"] = v.primes_emises_mn_usd
    row["croissance_primes_vie_pct"] = v.croissance_primes_pct
    row["taux_penetration_vie_pct"] = v.taux_penetration_pct
    row["densite_vie_usd"] = v.densite_assurance_usd


def _apply_gouv(row: Dict[str, Any], g: Optional[ExtGouvernance]) -> None:
    if not g:
        return
    row["fdi_inflows_pct_gdp"] = g.fdi_inflows_pct_gdp
    row["political_stability"] = g.political_stability
    row["regulatory_quality"] = g.regulatory_quality
    row["kaopen"] = g.kaopen


def _apply_macro(row: Dict[str, Any], m: Optional[ExtMacroeconomie]) -> None:
    if not m:
        return
    row["gdp_growth_pct"] = m.gdp_growth_pct
    row["current_account_mn"] = m.current_account_mn
    row["exchange_rate"] = m.exchange_rate
    row["gdp_per_capita"] = m.gdp_per_capita
    row["gdp_mn"] = m.gdp_mn
    row["inflation_rate_pct"] = m.inflation_rate_pct


def _resolve_pays_name(db: Session, identifier: str) -> Optional[RefPays]:
    """Résout un identifiant (nom_pays, code_iso3 ou pays_risque_match) vers un RefPays."""
    if not identifier:
        return None
    ident = identifier.strip()
    ref = (
        db.query(RefPays)
        .filter(
            (RefPays.nom_pays == ident)
            | (RefPays.code_iso3 == ident.upper())
            | (RefPays.pays_risque_match == ident)
        )
        .first()
    )
    return ref


# ── Public API ───────────────────────────────────────────────────────────────

def get_market_profile(pays: str, annee: Optional[int] = None) -> Dict[str, Any]:
    """
    Retourne toutes les métriques pour un pays (par nom interne, code ISO3
    ou pays_risque_match). Si `annee` est None, retourne la moyenne 2015-2024.
    """
    db = SessionLocal()
    try:
        ref = _resolve_pays_name(db, pays)
        if not ref:
            return _empty_market_row(pays, None, annee)

        nom = ref.nom_pays

        if annee is not None:
            row = _empty_market_row(nom, ref, annee)
            _apply_non_vie(row, db.query(ExtMarcheNonVie).filter_by(pays=nom, annee=annee).first())
            _apply_vie(row, db.query(ExtMarcheVie).filter_by(pays=nom, annee=annee).first())
            _apply_gouv(row, db.query(ExtGouvernance).filter_by(pays=nom, annee=annee).first())
            _apply_macro(row, db.query(ExtMacroeconomie).filter_by(pays=nom, annee=annee).first())
            return row

        # Moyenne toutes années
        nv = db.query(
            func.avg(ExtMarcheNonVie.primes_emises_mn_usd),
            func.avg(ExtMarcheNonVie.croissance_primes_pct),
            func.avg(ExtMarcheNonVie.taux_penetration_pct),
            func.avg(ExtMarcheNonVie.ratio_sp_pct),
            func.avg(ExtMarcheNonVie.densite_assurance_usd),
        ).filter(ExtMarcheNonVie.pays == nom).one()

        v = db.query(
            func.avg(ExtMarcheVie.primes_emises_mn_usd),
            func.avg(ExtMarcheVie.croissance_primes_pct),
            func.avg(ExtMarcheVie.taux_penetration_pct),
            func.avg(ExtMarcheVie.densite_assurance_usd),
        ).filter(ExtMarcheVie.pays == nom).one()

        g = db.query(
            func.avg(ExtGouvernance.fdi_inflows_pct_gdp),
            func.avg(ExtGouvernance.political_stability),
            func.avg(ExtGouvernance.regulatory_quality),
            func.avg(ExtGouvernance.kaopen),
        ).filter(ExtGouvernance.pays == nom).one()

        m = db.query(
            func.avg(ExtMacroeconomie.gdp_growth_pct),
            func.avg(ExtMacroeconomie.current_account_mn),
            func.avg(ExtMacroeconomie.exchange_rate),
            func.avg(ExtMacroeconomie.gdp_per_capita),
            func.avg(ExtMacroeconomie.gdp_mn),
            func.avg(ExtMacroeconomie.inflation_rate_pct),
        ).filter(ExtMacroeconomie.pays == nom).one()

        row = _empty_market_row(nom, ref, None)
        (row["primes_non_vie_mn_usd"], row["croissance_primes_non_vie_pct"],
         row["taux_penetration_non_vie_pct"], row["ratio_sp_non_vie_pct"],
         row["densite_non_vie_usd"]) = nv
        (row["primes_vie_mn_usd"], row["croissance_primes_vie_pct"],
         row["taux_penetration_vie_pct"], row["densite_vie_usd"]) = v
        (row["fdi_inflows_pct_gdp"], row["political_stability"],
         row["regulatory_quality"], row["kaopen"]) = g
        (row["gdp_growth_pct"], row["current_account_mn"], row["exchange_rate"],
         row["gdp_per_capita"], row["gdp_mn"], row["inflation_rate_pct"]) = m
        return row
    finally:
        db.close()


@lru_cache(maxsize=128)
def get_all_countries_latest(annee: int = 2024) -> List[Dict[str, Any]]:
    """Retourne toutes les métriques de tous les pays pour une année donnée."""
    db = SessionLocal()
    try:
        refs = db.query(RefPays).order_by(RefPays.nom_pays).all()

        nv_map = {x.pays: x for x in db.query(ExtMarcheNonVie).filter_by(annee=annee).all()}
        v_map = {x.pays: x for x in db.query(ExtMarcheVie).filter_by(annee=annee).all()}
        g_map = {x.pays: x for x in db.query(ExtGouvernance).filter_by(annee=annee).all()}
        m_map = {x.pays: x for x in db.query(ExtMacroeconomie).filter_by(annee=annee).all()}

        rows: List[Dict[str, Any]] = []
        for ref in refs:
            nom = ref.nom_pays
            row = _empty_market_row(nom, ref, annee)
            _apply_non_vie(row, nv_map.get(nom))
            _apply_vie(row, v_map.get(nom))
            _apply_gouv(row, g_map.get(nom))
            _apply_macro(row, m_map.get(nom))
            rows.append(row)
        return rows
    finally:
        db.close()


def get_country_timeseries(pays_iso3: str) -> List[Dict[str, Any]]:
    """Retourne la série temporelle 2015-2024 pour un pays (lookup via code_iso3)."""
    db = SessionLocal()
    try:
        ref = _resolve_pays_name(db, pays_iso3)
        if not ref:
            return []
        nom = ref.nom_pays

        nv_map = {x.annee: x for x in db.query(ExtMarcheNonVie).filter_by(pays=nom).all()}
        v_map = {x.annee: x for x in db.query(ExtMarcheVie).filter_by(pays=nom).all()}
        g_map = {x.annee: x for x in db.query(ExtGouvernance).filter_by(pays=nom).all()}
        m_map = {x.annee: x for x in db.query(ExtMacroeconomie).filter_by(pays=nom).all()}

        annees = sorted(set(nv_map) | set(v_map) | set(g_map) | set(m_map))
        rows: List[Dict[str, Any]] = []
        for annee in annees:
            row = _empty_market_row(nom, ref, annee)
            _apply_non_vie(row, nv_map.get(annee))
            _apply_vie(row, v_map.get(annee))
            _apply_gouv(row, g_map.get(annee))
            _apply_macro(row, m_map.get(annee))
            rows.append(row)
        return rows
    finally:
        db.close()


def _avg(values: List[Optional[float]]) -> Optional[float]:
    xs = [x for x in values if x is not None]
    return sum(xs) / len(xs) if xs else None


@lru_cache(maxsize=128)
def get_region_aggregates(annee: int = 2024) -> List[Dict[str, Any]]:
    """Agrège les métriques par région géographique pour une année donnée."""
    rows = get_all_countries_latest(annee)
    by_region: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        reg = r.get("region") or "N/A"
        by_region.setdefault(reg, []).append(r)

    result: List[Dict[str, Any]] = []
    for region, items in sorted(by_region.items()):
        result.append({
            "region": region,
            "annee": annee,
            "nb_pays": len(items),
            "avg_primes_non_vie_mn_usd": _avg([x["primes_non_vie_mn_usd"] for x in items]),
            "avg_primes_vie_mn_usd": _avg([x["primes_vie_mn_usd"] for x in items]),
            "avg_gdp_mn": _avg([x["gdp_mn"] for x in items]),
            "avg_gdp_growth_pct": _avg([x["gdp_growth_pct"] for x in items]),
            "avg_political_stability": _avg([x["political_stability"] for x in items]),
            "avg_regulatory_quality": _avg([x["regulatory_quality"] for x in items]),
            "avg_inflation_rate_pct": _avg([x["inflation_rate_pct"] for x in items]),
        })
    return result


def get_scoring_inputs(pays_risque: str, annee: int = 2024) -> Dict[str, Any]:
    """
    Retourne les inputs pour le scoring en joignant sur pays_risque_match.
    `pays_risque` correspond exactement aux valeurs de PAYS_RISQUE dans les
    données internes Atlantic Re.
    """
    db = SessionLocal()
    try:
        ref = (
            db.query(RefPays)
            .filter(RefPays.pays_risque_match == pays_risque)
            .first()
        )
        if not ref:
            ref = _resolve_pays_name(db, pays_risque)
        if not ref:
            return _empty_market_row(pays_risque, None, annee)

        return get_market_profile(ref.nom_pays, annee)
    finally:
        db.close()


def clear_caches() -> None:
    """Invalide les caches LRU (à appeler après un reseed)."""
    get_all_countries_latest.cache_clear()
    get_region_aggregates.cache_clear()
