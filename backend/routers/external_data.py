"""
Router FastAPI — contexte marché externe (données africaines).
Préfixe : /api/market-context
Accès lecture seule pour les rôles lecteur, souscripteur, admin.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List

from models.schemas import ExternalCountryMarket, RegionAggregate, CountryTimeSeries
from routers.auth import get_current_user
from services import external_data_service

router = APIRouter(prefix="/market-context", tags=["Market Context"])


ALLOWED_ROLES = {"lecteur", "souscripteur", "admin"}


def require_reader(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Accès refusé")
    return user


@router.get("/countries", response_model=List[ExternalCountryMarket])
def list_countries(
    annee: int = Query(2024, ge=2000, le=2100),
    _: dict = Depends(require_reader),
):
    """Tous les pays avec métriques pour une année donnée."""
    return external_data_service.get_all_countries_latest(annee)


@router.get("/country/{pays_iso3}", response_model=CountryTimeSeries)
def country_profile(
    pays_iso3: str,
    _: dict = Depends(require_reader),
):
    """Profil complet d'un pays (toutes années). `pays_iso3` accepte aussi le nom interne."""
    series = external_data_service.get_country_timeseries(pays_iso3)
    if not series:
        raise HTTPException(status_code=404, detail=f"Pays introuvable: {pays_iso3}")
    first = series[0]
    return {
        "pays": first["pays"],
        "code_iso3": first.get("code_iso3"),
        "region": first.get("region"),
        "series": series,
    }


@router.get("/regions", response_model=List[RegionAggregate])
def region_aggregates(
    annee: int = Query(2024, ge=2000, le=2100),
    _: dict = Depends(require_reader),
):
    """Agrégats par région géographique."""
    return external_data_service.get_region_aggregates(annee)


@router.get("/timeseries/{pays_iso3}", response_model=List[ExternalCountryMarket])
def country_timeseries(
    pays_iso3: str,
    _: dict = Depends(require_reader),
):
    """Série temporelle 2015-2024 pour un pays."""
    series = external_data_service.get_country_timeseries(pays_iso3)
    if not series:
        raise HTTPException(status_code=404, detail=f"Pays introuvable: {pays_iso3}")
    return series


@router.get("/scoring-inputs/{pays_risque}", response_model=ExternalCountryMarket)
def scoring_inputs(
    pays_risque: str,
    annee: int = Query(2024, ge=2000, le=2100),
    _: dict = Depends(require_reader),
):
    """Inputs scoring pour un pays via `pays_risque_match`."""
    return external_data_service.get_scoring_inputs(pays_risque, annee)
