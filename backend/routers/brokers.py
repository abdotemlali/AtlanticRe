"""
Router Brokers — vues analytiques ciblées sur les courtiers.
Endpoints : broker/profile, broker/by-year, broker/by-branch, broker/contracts.
"""
from fastapi import APIRouter, Depends, Query

from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import get_df, apply_filters
from services import kpi_broker_service

router = APIRouter()


@router.get("/broker/profile")
def broker_profile(
    broker: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    """Profil consolidé d'un courtier — contrats + rétrocession."""
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_broker_service.compute_broker_profile(df, broker)


@router.get("/broker/by-year")
def broker_by_year(
    broker: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    """Évolution temporelle pour un courtier."""
    # Règle #2 : ne pas tronquer par année pour l'historique
    filters.uw_years = None
    filters.uw_year_min = None
    filters.uw_year_max = None

    df = get_df()
    df = apply_filters(df, filters)
    return kpi_broker_service.compute_broker_by_year(df, broker)


@router.get("/broker/by-branch")
def broker_by_branch(
    broker: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    """Répartition par branche pour un courtier."""
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_broker_service.compute_broker_by_branch(df, broker)


@router.get("/broker/contracts")
def broker_contracts(
    broker: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    """Liste des contrats d'un courtier."""
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_broker_service.compute_broker_contracts(df, broker)
