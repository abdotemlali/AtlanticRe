from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from routers.auth import require_role, get_current_user
from routers.admin import _app_config
from services.retro_service import (
    get_retro_df, load_retro_excel, apply_retro_filters,
    get_retro_filter_options, compute_retro_summary,
    compute_by_traite, compute_by_year, compute_by_nature,
    compute_by_courtier, compute_by_securite,
    compute_placement_status, compute_courtier_croise,
    get_retro_status,
)
from services.data_service import get_df
from repositories.log_repository import add_log

router = APIRouter()


@router.post("/refresh")
def refresh_retro_data(user: dict = Depends(require_role("admin", "souscripteur"))):
    """Recharge le fichier Excel rétrocession en mémoire."""
    try:
        result = load_retro_excel(_app_config.get("retro_excel_file_path"))
        add_log(user["username"], "RETRO_DATA_REFRESH", f"{result['row_count']} lignes chargées")
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de chargement rétrocession : {str(e)}")


@router.get("/status")
def retro_status(_: dict = Depends(get_current_user)):
    """Statut du chargement rétrocession."""
    return get_retro_status()


@router.get("/options")
def retro_options(_: dict = Depends(get_current_user)):
    """Valeurs uniques pour alimenter les filtres de la page."""
    df = get_retro_df()
    return get_retro_filter_options(df)


@router.get("/summary")
def retro_summary(
    uy: Optional[str] = Query(None, description="UY list, virgule-séparée"),
    nature: Optional[str] = Query(None),
    traite: Optional[str] = Query(None),
    courtier: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """KPIs globaux rétrocession."""
    df = get_retro_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_retro_filters(df, uy=uy_list, nature=nature, traite=traite, courtier=courtier)
    return compute_retro_summary(df)


@router.get("/by-traite")
def retro_by_traite(
    uy: Optional[str] = Query(None),
    nature: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Performance agrégée par traité."""
    df = get_retro_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_retro_filters(df, uy=uy_list, nature=nature)
    return compute_by_traite(df)


@router.get("/by-year")
def retro_by_year(
    traite: Optional[str] = Query(None),
    nature: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Évolution temporelle EPI + PMD par année."""
    df = get_retro_df()
    df = apply_retro_filters(df, traite=traite, nature=nature)
    return compute_by_year(df)


@router.get("/by-nature")
def retro_by_nature(
    uy: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Répartition Proportionnel vs Non Proportionnel."""
    df = get_retro_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_retro_filters(df, uy=uy_list)
    return compute_by_nature(df)


@router.get("/by-courtier")
def retro_by_courtier(
    uy: Optional[str] = Query(None),
    nature: Optional[str] = Query(None),
    traite: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Performance par courtier placeur."""
    df = get_retro_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_retro_filters(df, uy=uy_list, nature=nature, traite=traite)
    return compute_by_courtier(df)


@router.get("/by-securite")
def retro_by_securite(
    uy: Optional[str] = Query(None),
    nature: Optional[str] = Query(None),
    traite: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Vue par sécurité pour le Panel de Sécurités."""
    df = get_retro_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_retro_filters(df, uy=uy_list, nature=nature, traite=traite)
    return compute_by_securite(df)


@router.get("/placement-status")
def retro_placement_status(
    uy: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Statut de placement par traité/UY — alertes."""
    df = get_retro_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_retro_filters(df, uy=uy_list)
    return compute_placement_status(df)


@router.get("/courtier-croise")
def retro_courtier_croise(
    uy: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Croisement courtiers rétrocession × contrats."""
    df_retro = get_retro_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df_retro = apply_retro_filters(df_retro, uy=uy_list)
    df_contrats = get_df()
    return compute_courtier_croise(df_retro, df_contrats, uy=uy_list)
