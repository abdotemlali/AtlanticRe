"""
Router Cédantes — vues analytiques ciblées sur les acteurs (cédantes, marchés, pays).
Endpoints : cedante/profile, cedante/by-year, cedante/by-branch,
            cedante/fac-saturation, cedante/fac-saturation-global,
            market/profile, market/by-year,
            country/profile, country/by-year, country/by-branch.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import (
    get_df, apply_filters,
    apply_identity_filters, apply_analysis_filters, apply_financial_filters,
)
from services.kpi_helpers import apply_view_filters
from services import kpi_cedante_service
from services import kpi_country_service

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
#  CEDANTE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/cedante/profile")
def cedante_profile(
    cedante: str = Query(...),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    """
    Profil cédante — Règle Métier n°1 : double DataFrame.
    df_identity : filtres identitaires uniquement → type cédante, branches actives, saturation
    df_full     : tous les filtres appliqués → KPIs financiers
    """
    df_raw = get_df()

    # df_identity : filtres identitaires uniquement (années, périmètre, statuts)
    df_identity = apply_identity_filters(df_raw, filters)

    # df_full : tous les filtres
    df_full = apply_analysis_filters(apply_financial_filters(df_identity, filters), filters)

    return kpi_cedante_service.compute_cedante_profile(
        cedante, df_identity, df_full, vie_non_vie_view, filters
    )


@router.get("/cedante/by-year")
def cedante_by_year(
    cedante: str = Query(...),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    # Règle #2 : l'évolution historique ne doit pas être tronquée par le filtre d'année
    filters.uw_years = None
    filters.uw_year_min = None
    filters.uw_year_max = None

    df = get_df()
    df = apply_filters(df, filters)
    return kpi_cedante_service.compute_cedante_by_year(df, cedante, vie_non_vie_view)


@router.get("/cedante/by-branch")
def cedante_by_branch(
    cedante: str = Query(...),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_cedante_service.compute_cedante_by_branch(df, cedante, vie_non_vie_view)


@router.get("/cedante/fac-saturation")
def cedante_fac_saturation(
    cedante: str = Query(...),
    seuil_prime: float = Query(1_000_000),
    seuil_affaires: int = Query(5),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_identity_filters(df, filters)
    return kpi_cedante_service.compute_fac_saturation(df, cedante, seuil_prime, seuil_affaires)


@router.get("/cedante/fac-saturation-global")
def cedante_fac_saturation_global(
    seuil_prime: float = Query(1_000_000),
    seuil_affaires: int = Query(5),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_identity_filters(df, filters)
    return kpi_cedante_service.compute_fac_saturation_global(df, seuil_prime, seuil_affaires)


# ══════════════════════════════════════════════════════════════════════════════
#  MARKET ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/market/profile")
def market_profile(
    pays: str = Query(...),
    branche: str = Query(...),
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
    return kpi_country_service.compute_market_profile(df, pays, branche)


@router.get("/market/by-year")
def market_by_year(
    pays: str = Query(...),
    branche: str = Query(...),
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
    return kpi_country_service.compute_market_by_year(df, pays, branche)


# ══════════════════════════════════════════════════════════════════════════════
#  COUNTRY ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/country/profile")
def country_profile(
    pays: str = Query(...),
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
    return kpi_country_service.compute_country_profile(df, pays)


@router.get("/country/by-year")
def country_by_year(
    pays: str = Query(...),
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
    return kpi_country_service.compute_country_by_year(df, pays)


@router.get("/country/by-branch")
def country_by_branch(
    pays: str = Query(...),
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
    return kpi_country_service.compute_country_by_branch(df, pays)
