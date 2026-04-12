"""
Router Exposition — concentration et exposition des risques.
Endpoints : by-country, by-branch, top-risks.
Montage dans main.py avec prefix="/api/kpis/exposition".
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import get_df, apply_filters
from services import kpi_exposition_service

router = APIRouter()


@router.get("/by-country")
def exposition_by_country(
    selected_pays: Optional[str] = Query(None, description="Pays sélectionnés (CSV) — mis en évidence côté frontend"),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    filters.pays_risque = None  # ignoré : tous les pays retournés, mise en évidence côté frontend
    df = apply_filters(df, filters)
    pays_list = [p.strip() for p in selected_pays.split(",") if p.strip()] if selected_pays else None
    return kpi_exposition_service.compute_exposition_by_country(df, selected_pays=pays_list)


@router.get("/by-branch")
def exposition_by_branch(
    selected_branche: Optional[str] = Query(None, description="Branches sélectionnées (CSV) — mis en évidence côté frontend"),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    filters.branche = None  # ignoré : toutes les branches retournées, mise en évidence côté frontend
    df = apply_filters(df, filters)
    branche_list = [b.strip() for b in selected_branche.split(",") if b.strip()] if selected_branche else None
    return kpi_exposition_service.compute_exposition_by_branch(df, selected_branche=branche_list)


@router.get("/top-risks")
def exposition_top_risks(
    top: int = Query(20),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_exposition_service.compute_top_risks(df, top)
