"""
Router KPIs Global — indicateurs globaux du portefeuille.
Endpoints : summary, financial-breakdown, by-year, by-branch, by-country,
            by-cedante, by-broker, by-contract-type, by-specialite,
            profit-commission-by-branch, by-country-contract-type,
            top-brokers, pivot.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import (
    get_df, apply_filters, compute_kpi_summary,
    get_status, get_filter_options, load_excel,
)
from services.kpi_helpers import apply_view_filters
from services import kpi_summary_service
from services import kpi_country_service
from services import kpi_branch_service
from services import kpi_cedante_service
from services import kpi_broker_service
from services import kpi_year_service
from services import kpi_pivot_service

router = APIRouter()


@router.get("/summary")
def kpis_summary(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return compute_kpi_summary(df)


@router.get("/financial-breakdown")
def kpis_financial_breakdown(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_summary_service.compute_financial_breakdown(df)


@router.get("/by-year")
def kpis_by_year(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_year_service.compute_kpis_by_year(df)


@router.get("/by-branch")
def kpis_by_branch(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_branch_service.compute_kpis_by_branch(df)


@router.get("/profit-commission-by-branch")
def profit_commission_by_branch(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_branch_service.compute_profit_commission_by_branch(df)


@router.get("/by-country")
def kpis_by_country(
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    selected_countries: Optional[str] = Query(None),
    top: int = Query(10),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()

    # Si selected_countries, ne pas appliquer le filtre pays_risque standard
    if selected_countries:
        selected_list = [p.strip() for p in selected_countries.split(",") if p.strip()]
        filters_no_pays = filters.model_copy(update={"pays_risque": None})
        df = apply_filters(df, filters_no_pays)
    else:
        selected_list = None
        df = apply_filters(df, filters)

    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
    return kpi_country_service.compute_kpis_by_country(df, selected_list, top)


@router.get("/by-cedante")
def kpis_by_cedante(
    top: int = Query(10),
    type_contrat_view: Optional[str] = Query(None),
    selected_cedantes: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()

    if selected_cedantes:
        selected_list = [c.strip() for c in selected_cedantes.split(",") if c.strip()]
        filters_no_cedante = filters.model_copy(update={"cedante": None})
        df = apply_filters(df, filters_no_cedante)
    else:
        selected_list = None
        df = apply_filters(df, filters)

    return kpi_cedante_service.compute_kpis_by_cedante(df, selected_list, type_contrat_view, top)


@router.get("/by-broker")
def kpis_by_broker(
    top: int = Query(10),
    selected_brokers: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()

    if selected_brokers:
        selected_list = [b.strip() for b in selected_brokers.split(",") if b.strip()]
        filters_no_broker = filters.model_copy(update={"courtier": None})
        df = apply_filters(df, filters_no_broker)
    else:
        selected_list = None
        df = apply_filters(df, filters)

    return kpi_broker_service.compute_kpis_by_broker(df, selected_list, top)


@router.get("/top-brokers")
def kpis_top_brokers(
    limit: int = Query(20),
    sort_by: str = Query("total_written_premium"),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_broker_service.compute_top_brokers(df, limit, sort_by)


@router.get("/by-contract-type")
def kpis_by_contract_type(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_year_service.compute_kpis_by_contract_type(df)


@router.get("/by-specialite")
def kpis_by_specialite(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_branch_service.compute_kpis_by_specialite(df)


@router.get("/by-country-contract-type")
def kpis_by_country_contract_type(
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, None, vie_non_vie_view)
    return kpi_country_service.compute_by_country_contract_type(df)


@router.post("/pivot")
def kpis_pivot(
    request: dict,
    _: dict = Depends(get_current_user),
):
    filters_raw = request.get("filters", {})
    row_axis = request.get("row_axis", "INT_BRANCHE")
    col_axis = request.get("col_axis", "UNDERWRITING_YEAR")
    value_key = request.get("value", "WRITTEN_PREMIUM")

    df = kpi_pivot_service.parse_pivot_filters(filters_raw)
    return kpi_pivot_service.compute_pivot(df, row_axis, col_axis, value_key)
