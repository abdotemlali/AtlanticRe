"""
Router : /api/target-share
Endpoints pour le calcul des parts cibles sur les traités TTY
(module "Cibles TTY").
"""
from typing import Optional
import math

from fastapi import APIRouter, Depends, Query

from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import get_df, apply_filters
from services.target_share_service import (
    compute_target_shares,
    compute_target_share_summary,
)

router = APIRouter()


def _split_list(s: Optional[str]):
    return [v.strip() for v in s.split(",") if v.strip()] if s else None


def _split_list_int(s: Optional[str]):
    if not s:
        return None
    try:
        return [int(v.strip()) for v in s.split(",") if v.strip()]
    except ValueError:
        return None


@router.get("/list")
def target_share_list(
    # Filtres locaux additionnels (en plus des filtres globaux)
    underwriting_year: Optional[str] = Query(
        None, description="Liste CSV d'années de souscription (filtre local)"
    ),
    branch: Optional[str] = Query(
        None, description="Liste CSV de branches (filtre local)"
    ),
    vie_non_vie: Optional[str] = Query(
        None, description="VIE ou NON_VIE (filtre local)"
    ),
    vie_non_vie_view: Optional[str] = Query(
        None,
        description="Alias accepté depuis LocalFilterPanel (buildParams)",
    ),
    type_of_contract: Optional[str] = Query(
        None, description="Liste CSV de types de contrat (filtre local)"
    ),
    cedante: Optional[str] = Query(
        None, description="Liste CSV de cédantes (filtre local)"
    ),
    broker: Optional[str] = Query(
        None, description="Liste CSV de courtiers (filtre local)"
    ),
    country: Optional[str] = Query(
        None, description="Liste CSV de pays (filtre local)"
    ),
    # Paramètres d'interface (Pagination & Tri & Filtres UI)
    pill: str = Query("hausse", description="'stable', 'baisse' ou 'hausse'"),
    search: str = Query("", description="Recherche texte libre"),
    sort_by: str = Query("potentiel_additionnel", description="Clé de tri"),
    sort_desc: bool = Query(True, description="Tri décroissant ?"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=1000),
    export: bool = Query(False, description="Exporte les résultats sans pagination"),

    # Paramètres d'ajustement (valeurs par défaut = comportement historique)
    ulr_low_threshold: float = Query(60, ge=0, le=200),
    ulr_low_bonus: int = Query(1, ge=0, le=5),
    lob_threshold: int = Query(4, ge=1, le=20),
    lob_bonus: int = Query(1, ge=0, le=5),
    low_share_threshold: float = Query(5, ge=0, le=100),
    low_share_bonus: int = Query(1, ge=0, le=5),
    ulr_high_threshold: float = Query(80, ge=0, le=200),
    ulr_high_malus: int = Query(-1, ge=-5, le=0),
    max_increase_per_renewal: int = Query(2, ge=0, le=10),
    max_multiple: float = Query(3, ge=1, le=10),
    cap_mdh: float = Query(10_000_000, ge=1_000_000),

    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    """
    Retourne la liste des traités TTY avec leur part cible calculée et un
    résumé agrégé.
    """
    df = get_df()
    df = apply_filters(df, filters)

    # ── Filtres locaux additionnels ──────────────────────────────────────
    years = _split_list_int(underwriting_year)
    if years and "UNDERWRITING_YEAR" in df.columns:
        df = df[df["UNDERWRITING_YEAR"].isin(years)]

    branches = _split_list(branch)
    if branches and "INT_BRANCHE" in df.columns:
        df = df[df["INT_BRANCHE"].isin(branches)]

    vnv = vie_non_vie or vie_non_vie_view
    if vnv and "VIE_NON_VIE" in df.columns:
        df = df[df["VIE_NON_VIE"] == vnv]

    types_ctr = _split_list(type_of_contract)
    if types_ctr and "TYPE_OF_CONTRACT" in df.columns:
        df = df[df["TYPE_OF_CONTRACT"].isin(types_ctr)]

    local_cedantes = _split_list(cedante)
    if local_cedantes and "INT_CEDANTE" in df.columns:
        df = df[df["INT_CEDANTE"].isin(local_cedantes)]

    local_brokers = _split_list(broker)
    if local_brokers and "COURTIER" in df.columns:
        df = df[df["COURTIER"].isin(local_brokers)]

    local_countries = _split_list(country)
    if local_countries and "PAYS_RISQUE" in df.columns:
        df = df[df["PAYS_RISQUE"].isin(local_countries)]

    results = compute_target_shares(
        df,
        ulr_low_threshold=ulr_low_threshold,
        ulr_low_bonus=ulr_low_bonus,
        lob_threshold=lob_threshold,
        lob_bonus=lob_bonus,
        low_share_threshold=low_share_threshold,
        low_share_bonus=low_share_bonus,
        ulr_high_threshold=ulr_high_threshold,
        ulr_high_malus=ulr_high_malus,
        max_increase_per_renewal=max_increase_per_renewal,
        max_multiple=max_multiple,
        cap_mdh=cap_mdh,
    )
    summary = compute_target_share_summary(results)

    # ── Application des filtres UI (pill + search) sur le serveur ──────────
    if pill == 'stable':
        results = [r for r in results if r["badge"] == "STABLE"]
    elif pill == 'baisse':
        results = [r for r in results if r["badge"] == "BAISSE"]
    elif pill == 'hausse':
        results = [r for r in results if r["badge"] == "HAUSSE"]

    search_q = search.strip().lower() if search else ""
    if search_q:
        results = [
            r for r in results
            if search_q in r.get("cedante", "").lower()
            or search_q in r.get("branche", "").lower()
            or search_q in r.get("pays", "").lower()
        ]

    # ── Tri ──────────────────────────────────────────────────────────────────
    def get_sort_key(r):
        v = r.get(sort_by)
        if isinstance(v, str):
            return (0, v.lower()) if v else (1, "")
        elif v is None:
            return (1, 0)
        else:
            return (0, v)

    results.sort(key=get_sort_key, reverse=sort_desc)
    
    total_elements = len(results)

    if export:
        return {"data": results, "summary": summary}

    # ── Extraction des sous-ensembles (Top 15, Scatter) ────────────────────
    
    # Limitation des points pour le ScatterChart (1500 max)
    scatter_data = [
        {
            "x": r["share_signed"],
            "y": r["part_cible"],
            "badge": r["badge"],
            "cedante": r["cedante"],
            "branche": r["branche"],
            "potentiel": r["potentiel_additionnel"]
        } for r in results[:1500] 
    ]
    
    # Top 15 data : pour 'baisse' on prend les plus grandes diminutions (potentiel le plus négatif)
    # pour les autres (hausse / stable) on prend les plus grand potentiel additionnel
    if pill == 'baisse':
        top15_results = sorted(results, key=lambda x: (x.get("potentiel_additionnel") or 0), reverse=False)[:15]
    else:
        top15_results = sorted(results, key=lambda x: (x.get("potentiel_additionnel") or 0), reverse=True)[:15]
    top15_data = [
        {
            "label": f"{r['cedante']} — {r['branche']}",
            "potentiel": r["potentiel_additionnel"],
            "badge": r["badge"]
        } for r in top15_results
    ]
    top15_data.reverse()

    # ── Pagination de la table ───────────────────────────────────────────────
    start = (page - 1) * page_size
    paged_results = results[start:start + page_size]

    return {
        "summary": summary,
        "total_items": total_elements,
        "data": paged_results,
        "scatter": scatter_data,
        "top15": top15_data
    }


@router.get("/filter-options")
def target_share_filter_options(
    _: dict = Depends(get_current_user),
):
    """
    Retourne les valeurs uniques disponibles parmi les traités TTY,
    pour alimenter les filtres locaux de la vue.
    """
    df = get_df()
    if df is None or df.empty or "INT_SPC_TYPE" not in df.columns:
        return {
            "branches": [],
            "years": [],
            "types_of_contract": [],
            "vie_non_vie": [],
        }

    tty = df[df["INT_SPC_TYPE"] == "TTY"]

    def _unique_sorted(col: str):
        if col not in tty.columns:
            return []
        return sorted(
            {str(v).strip() for v in tty[col].dropna().tolist() if str(v).strip()}
        )

    years = []
    if "UNDERWRITING_YEAR" in tty.columns:
        years = sorted(
            {int(y) for y in tty["UNDERWRITING_YEAR"].dropna().tolist()}
        )

    return {
        "branches": _unique_sorted("INT_BRANCHE"),
        "years": years,
        "types_of_contract": _unique_sorted("TYPE_OF_CONTRACT"),
        "vie_non_vie": _unique_sorted("VIE_NON_VIE"),
    }
