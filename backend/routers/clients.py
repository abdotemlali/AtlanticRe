"""
Router : /api/clients
Endpoints pour la détection et l'export des cédantes inactives.
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from routers.auth import require_role
from services.data_service import get_df
from services import client_service

router = APIRouter()


@router.get("/inactive")
def get_inactive_clients(
    years_threshold: int = Query(2, ge=1, le=20, description="Nombre d'années d'absence minimum"),
    min_contracts:   int = Query(3, ge=1, le=1000, description="Nombre minimum de contrats historiques"),
    page:            int = Query(1, ge=1),
    page_size:       int = Query(50, ge=1, le=500),
    sort_by:         str = Query("last_year", description="Champ de tri : last_year | total_contracts | years_absent | int_cedante"),
    sort_order:      str = Query("desc", pattern="^(asc|desc)$"),
    _: dict = Depends(require_role("admin", "souscripteur")),
):
    df = get_df()
    result = client_service.get_inactive_clients(df, years_threshold, min_contracts)

    clients = result["clients"]

    # ── Sort ──────────────────────────────────────────────────────────────────
    sort_map = {
        "last_year":       "last_year_active",
        "total_contracts": "total_contracts",
        "years_absent":    "years_absent",
        "int_cedante":     "int_cedante",
    }
    sort_field = sort_map.get(sort_by, "last_year_active")
    reverse = sort_order == "desc"
    clients = sorted(clients, key=lambda x: x.get(sort_field, 0), reverse=reverse)

    # ── Pagination ────────────────────────────────────────────────────────────
    total = len(clients)
    start = (page - 1) * page_size
    end   = start + page_size

    return {
        "total":          total,
        "page":           page,
        "page_size":      page_size,
        "years_threshold": years_threshold,
        "min_contracts":  min_contracts,
        "reference_year": result["reference_year"],
        "clients":        clients[start:end],
    }


@router.get("/inactive/export")
def export_inactive_clients(
    years_threshold: int = Query(2, ge=1, le=20),
    min_contracts:   int = Query(3, ge=1, le=1000),
    sort_by:         str = Query("last_year"),
    sort_order:      str = Query("desc", pattern="^(asc|desc)$"),
    _: dict = Depends(require_role("admin", "souscripteur")),
):
    df = get_df()
    result = client_service.get_inactive_clients(df, years_threshold, min_contracts)
    clients = result["clients"]

    sort_map = {
        "last_year":       "last_year_active",
        "total_contracts": "total_contracts",
        "years_absent":    "years_absent",
        "int_cedante":     "int_cedante",
    }
    sort_field = sort_map.get(sort_by, "last_year_active")
    clients = sorted(clients, key=lambda x: x.get(sort_field, 0), reverse=(sort_order == "desc"))

    output = client_service.export_inactive_clients_excel(
        clients=clients,
        reference_year=result["reference_year"] or 0,
        years_threshold=years_threshold,
        min_contracts=min_contracts,
    )

    return StreamingResponse(
        iter([output.read()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=clients_inactifs.xlsx"},
    )
