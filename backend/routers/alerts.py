"""
Router Alerts — alertes métier (ULR).
Endpoint : /alerts.
"""
from fastapi import APIRouter, Depends, Query

from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import get_df, apply_filters
from services import kpi_alerts_service

router = APIRouter()


@router.get("/alerts")
def kpis_alerts(
    ulr_threshold: float = Query(80.0),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    return kpi_alerts_service.compute_ulr_alerts(df, ulr_threshold)
