"""
Parseur de filtres partagé — extrait de routers/kpis.py (lignes 12-66).
Utilisé par tous les routers KPI via Depends(parse_filter_params).
"""
from fastapi import Query
from typing import Optional
from models.schemas import FilterParams


def _split_list(s: Optional[str]):
    """Parse CSV string to List[str]. Ex: 'MOROCCO,TUNISIA' → ['MOROCCO', 'TUNISIA']"""
    return [v.strip() for v in s.split(",") if v.strip()] if s else None


def _split_list_int(s: Optional[str]):
    """Parse CSV string to List[int]. Ex: '2019,2021' → [2019, 2021]"""
    if not s:
        return None
    try:
        return [int(v.strip()) for v in s.split(",") if v.strip()]
    except ValueError:
        return None


def parse_filter_params(
    perimetre: Optional[str] = Query(None),
    type_contrat_spc: Optional[str] = Query(None),
    specialite: Optional[str] = Query(None),
    int_spc_search: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    sous_branche: Optional[str] = Query(None),
    pays_risque: Optional[str] = Query(None),
    pays_cedante: Optional[str] = Query(None),
    marche_africain: Optional[bool] = Query(None),
    courtier: Optional[str] = Query(None),
    cedante: Optional[str] = Query(None),
    uw_year_min: Optional[int] = Query(None),
    uw_year_max: Optional[int] = Query(None),
    uw_years_raw: Optional[str] = Query(None),
    statuts: Optional[str] = Query(None),
    type_of_contract: Optional[str] = Query(None),
    prime_min: Optional[float] = Query(None),
    prime_max: Optional[float] = Query(None),
    ulr_min: Optional[float] = Query(None),
    ulr_max: Optional[float] = Query(None),
    share_min: Optional[float] = Query(None),
    share_max: Optional[float] = Query(None),
    commission_min: Optional[float] = Query(None),
    commission_max: Optional[float] = Query(None),
    courtage_min: Optional[float] = Query(None),
    courtage_max: Optional[float] = Query(None),
    type_cedante: Optional[str] = Query(None),
) -> FilterParams:
    return FilterParams(
        perimetre=_split_list(perimetre),
        type_contrat_spc=_split_list(type_contrat_spc),
        specialite=_split_list(specialite),
        int_spc_search=int_spc_search,
        branche=_split_list(branche),
        sous_branche=_split_list(sous_branche),
        pays_risque=_split_list(pays_risque),
        pays_cedante=_split_list(pays_cedante),
        marche_africain=marche_africain,
        courtier=_split_list(courtier),
        cedante=_split_list(cedante),
        uw_year_min=uw_year_min,
        uw_year_max=uw_year_max,
        uw_years=_split_list_int(uw_years_raw),
        statuts=_split_list(statuts),
        type_of_contract=_split_list(type_of_contract),
        type_cedante=_split_list(type_cedante),
        prime_min=prime_min,
        prime_max=prime_max,
        ulr_min=ulr_min,
        ulr_max=ulr_max,
        share_min=share_min,
        share_max=share_max,
        commission_min=commission_min,
        commission_max=commission_max,
        courtage_min=courtage_min,
        courtage_max=courtage_max,
    )
