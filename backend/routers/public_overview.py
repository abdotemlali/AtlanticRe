"""
Router public (sans authentification) — Vue d'ensemble Modélisation.
Préfixe : /api/public
"""
from fastapi import APIRouter
from sqlalchemy import func

from core.database import SessionLocal
from models.external_db_models import (
    RefPays,
    ExtMarcheNonVie,
    ExtMarcheVie,
    ExtGouvernance,
    ExtMacroeconomie,
)

router = APIRouter()

ANNEE_MIN = 2022
ANNEE_MAX = 2024


def _avg(session, model, col, annee_min: int, annee_max: int):
    result = (
        session.query(func.avg(col))
        .filter(model.annee >= annee_min, model.annee <= annee_max)
        .scalar()
    )
    return round(float(result), 4) if result is not None else None


def _sum(session, model, col, annee_min: int, annee_max: int):
    """Somme des dernières valeurs par pays (évite de sommer plusieurs années)."""
    # On prend la valeur de l'année la plus récente disponible pour chaque pays
    # puis on somme → représentatif du stock à date
    subq = (
        session.query(
            model.pays,
            func.max(model.annee).label("max_annee"),
        )
        .filter(model.annee >= annee_min, model.annee <= annee_max)
        .group_by(model.pays)
        .subquery()
    )
    result = (
        session.query(func.sum(col))
        .join(subq, (model.pays == subq.c.pays) & (model.annee == subq.c.max_annee))
        .scalar()
    )
    return round(float(result), 2) if result is not None else None


@router.get("/overview/stats")
def get_overview_stats():
    """
    Statistiques agrégées sur les 34 pays africains (2022–2024).
    Endpoint public — aucune authentification requise.
    """
    db = SessionLocal()
    try:
        nb_pays = db.query(func.count(RefPays.id)).scalar() or 0
        regions = [
            r[0]
            for r in db.query(RefPays.region).distinct().order_by(RefPays.region).all()
            if r[0]
        ]

        # ── Économique ────────────────────────────────────────────────────────
        economique = {
            "gdp_growth_pct_avg": _avg(
                db, ExtMacroeconomie, ExtMacroeconomie.gdp_growth_pct, ANNEE_MIN, ANNEE_MAX
            ),
            "exchange_rate_avg": _avg(
                db, ExtMacroeconomie, ExtMacroeconomie.exchange_rate, ANNEE_MIN, ANNEE_MAX
            ),
            "gdp_per_capita_avg": _avg(
                db, ExtMacroeconomie, ExtMacroeconomie.gdp_per_capita, ANNEE_MIN, ANNEE_MAX
            ),
            "inflation_rate_pct_avg": _avg(
                db, ExtMacroeconomie, ExtMacroeconomie.inflation_rate_pct, ANNEE_MIN, ANNEE_MAX
            ),
            "gdp_mn_total": _sum(
                db, ExtMacroeconomie, ExtMacroeconomie.gdp_mn, ANNEE_MIN, ANNEE_MAX
            ),
            "current_account_mn_avg": _avg(
                db, ExtMacroeconomie, ExtMacroeconomie.current_account_mn, ANNEE_MIN, ANNEE_MAX
            ),
            "integration_regionale_score_avg": _avg(
                db, ExtMacroeconomie, ExtMacroeconomie.integration_regionale_score, ANNEE_MIN, ANNEE_MAX
            ),
        }

        # ── Assurance Vie ────────────────────────────────────────────────────
        assurance_vie = {
            "primes_mn_usd_total": _sum(
                db, ExtMarcheVie, ExtMarcheVie.primes_emises_mn_usd, ANNEE_MIN, ANNEE_MAX
            ),
            "croissance_pct_avg": _avg(
                db, ExtMarcheVie, ExtMarcheVie.croissance_primes_pct, ANNEE_MIN, ANNEE_MAX
            ),
            "taux_penetration_pct_avg": _avg(
                db, ExtMarcheVie, ExtMarcheVie.taux_penetration_pct, ANNEE_MIN, ANNEE_MAX
            ),
            "densite_usd_avg": _avg(
                db, ExtMarcheVie, ExtMarcheVie.densite_assurance_usd, ANNEE_MIN, ANNEE_MAX
            ),
        }

        # ── Assurance Non-Vie ────────────────────────────────────────────────
        assurance_non_vie = {
            "primes_mn_usd_total": _sum(
                db, ExtMarcheNonVie, ExtMarcheNonVie.primes_emises_mn_usd, ANNEE_MIN, ANNEE_MAX
            ),
            "croissance_pct_avg": _avg(
                db, ExtMarcheNonVie, ExtMarcheNonVie.croissance_primes_pct, ANNEE_MIN, ANNEE_MAX
            ),
            "taux_penetration_pct_avg": _avg(
                db, ExtMarcheNonVie, ExtMarcheNonVie.taux_penetration_pct, ANNEE_MIN, ANNEE_MAX
            ),
            "densite_usd_avg": _avg(
                db, ExtMarcheNonVie, ExtMarcheNonVie.densite_assurance_usd, ANNEE_MIN, ANNEE_MAX
            ),
            "ratio_sp_pct_avg": _avg(
                db, ExtMarcheNonVie, ExtMarcheNonVie.ratio_sp_pct, ANNEE_MIN, ANNEE_MAX
            ),
        }

        # ── Réglementaire ────────────────────────────────────────────────────
        reglementaire = {
            "fdi_inflows_pct_gdp_avg": _avg(
                db, ExtGouvernance, ExtGouvernance.fdi_inflows_pct_gdp, ANNEE_MIN, ANNEE_MAX
            ),
            "political_stability_avg": _avg(
                db, ExtGouvernance, ExtGouvernance.political_stability, ANNEE_MIN, ANNEE_MAX
            ),
            "regulatory_quality_avg": _avg(
                db, ExtGouvernance, ExtGouvernance.regulatory_quality, ANNEE_MIN, ANNEE_MAX
            ),
            "kaopen_avg": _avg(
                db, ExtGouvernance, ExtGouvernance.kaopen, ANNEE_MIN, ANNEE_MAX
            ),
        }

        return {
            "nb_pays": nb_pays,
            "regions": regions,
            "annee_min": ANNEE_MIN,
            "annee_max": ANNEE_MAX,
            "economique": economique,
            "assurance_vie": assurance_vie,
            "assurance_non_vie": assurance_non_vie,
            "reglementaire": reglementaire,
        }

    finally:
        db.close()


# ── Raw datasets for Cartographie pages ──────────────────────────────────────
# Each endpoint returns the full time series for the 34 African countries,
# joined with ref_pays to expose nom_pays, code_iso3 and region.

def _ref_map(db):
    return {r.nom_pays: r for r in db.query(RefPays).all()}


@router.get("/cartographie/non-vie")
def cartographie_non_vie():
    """Toutes les lignes ext_marche_non_vie avec région + ISO3."""
    db = SessionLocal()
    try:
        refs = _ref_map(db)
        rows = db.query(ExtMarcheNonVie).all()
        return [
            {
                "pays": r.pays,
                "code_iso3": refs[r.pays].code_iso3 if r.pays in refs else None,
                "region": refs[r.pays].region if r.pays in refs else None,
                "annee": r.annee,
                "primes_emises_mn_usd": r.primes_emises_mn_usd,
                "croissance_primes_pct": r.croissance_primes_pct,
                "taux_penetration_pct": r.taux_penetration_pct,
                "ratio_sp_pct": r.ratio_sp_pct,
                "densite_assurance_usd": r.densite_assurance_usd,
            }
            for r in rows
        ]
    finally:
        db.close()


@router.get("/cartographie/vie")
def cartographie_vie():
    db = SessionLocal()
    try:
        refs = _ref_map(db)
        rows = db.query(ExtMarcheVie).all()
        return [
            {
                "pays": r.pays,
                "code_iso3": refs[r.pays].code_iso3 if r.pays in refs else None,
                "region": refs[r.pays].region if r.pays in refs else None,
                "annee": r.annee,
                "primes_emises_mn_usd": r.primes_emises_mn_usd,
                "croissance_primes_pct": r.croissance_primes_pct,
                "taux_penetration_pct": r.taux_penetration_pct,
                "densite_assurance_usd": r.densite_assurance_usd,
            }
            for r in rows
        ]
    finally:
        db.close()


@router.get("/cartographie/macroeconomie")
def cartographie_macro():
    db = SessionLocal()
    try:
        refs = _ref_map(db)
        rows = db.query(ExtMacroeconomie).all()
        return [
            {
                "pays": r.pays,
                "code_iso3": refs[r.pays].code_iso3 if r.pays in refs else None,
                "region": refs[r.pays].region if r.pays in refs else None,
                "annee": r.annee,
                "gdp_growth_pct": r.gdp_growth_pct,
                "current_account_mn": r.current_account_mn,
                "exchange_rate": r.exchange_rate,
                "gdp_per_capita": r.gdp_per_capita,
                "gdp_mn": r.gdp_mn,
                "inflation_rate_pct": r.inflation_rate_pct,
                "integration_regionale_score": r.integration_regionale_score,
            }
            for r in rows
        ]
    finally:
        db.close()


@router.get("/cartographie/gouvernance")
def cartographie_gouvernance():
    db = SessionLocal()
    try:
        refs = _ref_map(db)
        rows = db.query(ExtGouvernance).all()
        return [
            {
                "pays": r.pays,
                "code_iso3": refs[r.pays].code_iso3 if r.pays in refs else None,
                "region": refs[r.pays].region if r.pays in refs else None,
                "annee": r.annee,
                "fdi_inflows_pct_gdp": r.fdi_inflows_pct_gdp,
                "political_stability": r.political_stability,
                "regulatory_quality": r.regulatory_quality,
                "kaopen": r.kaopen,
            }
            for r in rows
        ]
    finally:
        db.close()
