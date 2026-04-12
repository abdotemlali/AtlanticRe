from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from routers.auth import require_role, get_current_user
from routers.admin import _app_config
from services.fac_to_fac_service import (
    get_fcm_df, load_fcm_excel, apply_fcm_filters,
    get_fcm_filter_options, get_fcm_status,
    get_kpis, get_evolution_primes, get_primes_par_branche,
    get_detail_branches, get_top_partenaires_primes,
    get_top_partenaires_engagement, get_taux_part_moyen,
    get_tableau_partenaires, get_crossing_donneur_preneur,
)
from services.data_service import get_df
from repositories.log_repository import add_log

router = APIRouter()


@router.post("/refresh")
def refresh_fcm_data(user: dict = Depends(require_role("admin", "souscripteur"))):
    """Recharge le fichier Excel FCM Partenaires en mémoire."""
    try:
        result = load_fcm_excel(_app_config.get("fcm_partenaires_file_path"))
        add_log(user["username"], "FCM_DATA_REFRESH", f"{result['row_count']} lignes chargées")
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de chargement FCM : {str(e)}")


@router.get("/status")
def fcm_status(_: dict = Depends(get_current_user)):
    """Statut du chargement FCM Partenaires."""
    return get_fcm_status()


@router.get("/options")
def fcm_options(_: dict = Depends(get_current_user)):
    """Valeurs uniques pour les filtres de la page FAC-to-FAC."""
    df = get_fcm_df()
    return get_fcm_filter_options(df)


@router.get("/kpis")
def fcm_kpis(
    uy: Optional[str] = Query(None, description="Années, virgule-séparées"),
    lob: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """KPIs globaux FAC-to-FAC."""
    df = get_fcm_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_fcm_filters(df, uy=uy_list, lob=lob, branche=branche, type_contrat=type_contrat)
    return get_kpis(df)


@router.get("/evolution-primes")
def fcm_evolution_primes(
    _uy: Optional[str] = Query(None),
    lob: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Évolution des primes partenaire par année — affiche toutes les années (filtre uy ignoré)."""
    df = get_fcm_df()
    # _uy ignoré volontairement : ce graphe montre la tendance historique complète
    df = apply_fcm_filters(df, uy=None, lob=lob, branche=branche, type_contrat=type_contrat)
    return get_evolution_primes(df)


@router.get("/primes-par-branche")
def fcm_primes_par_branche(
    uy: Optional[str] = Query(None),
    _lob: Optional[str] = Query(None),
    _branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Primes partenaire agrégées par branche — toutes les branches retournées (lob et branche ignorés)."""
    df = get_fcm_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    # lob et branche ignorés : la mise en évidence est gérée côté frontend
    df = apply_fcm_filters(df, uy=uy_list, lob=None, branche=None, type_contrat=type_contrat)
    return get_primes_par_branche(df)


@router.get("/detail-branches")
def fcm_detail_branches(
    uy: Optional[str] = Query(None),
    _lob: Optional[str] = Query(None),
    _branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Tableau détail par branche — toutes les branches retournées (lob et branche ignorés)."""
    df = get_fcm_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    # lob et branche ignorés : le surlignage est géré côté frontend
    df = apply_fcm_filters(df, uy=uy_list, lob=None, branche=None, type_contrat=type_contrat)
    return get_detail_branches(df)


@router.get("/top-partenaires-primes")
def fcm_top_partenaires_primes(
    uy: Optional[str] = Query(None),
    lob: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Top 10 partenaires par Prime Partenaire."""
    df = get_fcm_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_fcm_filters(df, uy=uy_list, lob=lob, branche=branche, type_contrat=type_contrat)
    return get_top_partenaires_primes(df)


@router.get("/top-partenaires-engagement")
def fcm_top_partenaires_engagement(
    uy: Optional[str] = Query(None),
    lob: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Top 10 partenaires par Engagement Partenaire."""
    df = get_fcm_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_fcm_filters(df, uy=uy_list, lob=lob, branche=branche, type_contrat=type_contrat)
    return get_top_partenaires_engagement(df)


@router.get("/taux-part-moyen")
def fcm_taux_part_moyen(
    uy: Optional[str] = Query(None),
    lob: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Taux de part moyen par partenaire."""
    df = get_fcm_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_fcm_filters(df, uy=uy_list, lob=lob, branche=branche, type_contrat=type_contrat)
    return get_taux_part_moyen(df)


@router.get("/tableau-partenaires")
def fcm_tableau_partenaires(
    uy: Optional[str] = Query(None),
    lob: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    type_contrat: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Tableau partenaires avec colonnes dual-rôle."""
    df = get_fcm_df()
    uy_list = [int(y) for y in uy.split(",")] if uy else None
    df = apply_fcm_filters(df, uy=uy_list, lob=lob, branche=branche, type_contrat=type_contrat)
    df_contrats = get_df()
    return get_tableau_partenaires(df, df_contrats)


@router.get("/crossing-donneur-preneur")
def fcm_crossing(
    _: dict = Depends(get_current_user),
):
    """Croisement Donneurs × Preneurs — données globales, aucun filtre."""
    df_fcm = get_fcm_df()
    df_contrats = get_df()
    return get_crossing_donneur_preneur(df_fcm, df_contrats)
