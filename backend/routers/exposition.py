"""
Router Exposition — concentration et exposition des risques.
Endpoints : by-country, by-branch, top-risks.
Montage dans main.py avec prefix="/api/kpis/exposition".
"""
from fastapi import APIRouter, Depends, Query

from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import get_df, apply_filters
from services import kpi_exposition_service

router = APIRouter()


@router.get("/by-country")
def exposition_by_country(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_exposition_service.compute_exposition_by_country(df)


@router.get("/by-branch")
def exposition_by_branch(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_exposition_service.compute_exposition_by_branch(df)


@router.get("/top-risks")
def exposition_top_risks(
    top: int = Query(20),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_exposition_service.compute_top_risks(df, top)
