from fastapi import APIRouter, Depends, Query
from typing import Optional
from models.schemas import FilterParams
from routers.auth import get_current_user
from services.data_service import get_df, apply_filters, compute_kpi_summary, get_status, get_filter_options, load_excel
from routers.auth import require_role
from repositories.log_repository import add_log

router = APIRouter()

# ── Shared filter parser ──────────────────────────────────────────────────────
def parse_filter_params(
    perimetre: Optional[str] = Query(None),
    type_contrat_spc: Optional[str] = Query(None),
    specialite: Optional[str] = Query(None),
    int_spc_search: Optional[str] = Query(None),
    branche: Optional[str] = Query(None),
    sous_branche: Optional[str] = Query(None),
    pays_risque: Optional[str] = Query(None),
    pays_cedante: Optional[str] = Query(None),
    courtier: Optional[str] = Query(None),
    cedante: Optional[str] = Query(None),
    uw_year_min: Optional[int] = Query(None),
    uw_year_max: Optional[int] = Query(None),
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
) -> FilterParams:
    def split_list(s):
        return [v.strip() for v in s.split(",") if v.strip()] if s else None

    return FilterParams(
        perimetre=split_list(perimetre), type_contrat_spc=split_list(type_contrat_spc),
        specialite=split_list(specialite), int_spc_search=int_spc_search,
        branche=split_list(branche), sous_branche=split_list(sous_branche),
        pays_risque=split_list(pays_risque), pays_cedante=split_list(pays_cedante),
        courtier=split_list(courtier), cedante=split_list(cedante),
        uw_year_min=uw_year_min, uw_year_max=uw_year_max, statuts=split_list(statuts),
        type_of_contract=split_list(type_of_contract),
        prime_min=prime_min, prime_max=prime_max, ulr_min=ulr_min, ulr_max=ulr_max,
        share_min=share_min, share_max=share_max, commission_min=commission_min,
        commission_max=commission_max, courtage_min=courtage_min, courtage_max=courtage_max,
    )


@router.get("/summary")
def kpis_summary(filters: FilterParams = Depends(parse_filter_params), _: dict = Depends(get_current_user)):
    df = get_df()
    df = apply_filters(df, filters)
    return compute_kpi_summary(df)


@router.get("/by-country")
def kpis_by_country(filters: FilterParams = Depends(parse_filter_params), _: dict = Depends(get_current_user)):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "PAYS_RISQUE" not in df.columns:
        return []
    result = []
    for pays, group in df.groupby("PAYS_RISQUE"):
        if not pays:
            continue
        kpis = compute_kpi_summary(group)
        result.append({"pays": pays, **kpis})
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result


@router.get("/by-branch")
def kpis_by_branch(filters: FilterParams = Depends(parse_filter_params), _: dict = Depends(get_current_user)):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []
    result = []
    for branche, group in df.groupby("INT_BRANCHE"):
        if not branche:
            continue
        kpis = compute_kpi_summary(group)
        result.append({"branche": branche, **kpis})
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result


@router.get("/by-broker")
def kpis_by_broker(top: int = Query(10), filters: FilterParams = Depends(parse_filter_params), _: dict = Depends(get_current_user)):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "INT_BROKER" not in df.columns:
        return []
    result = []
    for broker, group in df.groupby("INT_BROKER"):
        if not broker:
            continue
        wp = float(group["WRITTEN_PREMIUM"].sum() if "WRITTEN_PREMIUM" in group.columns else 0)
        result.append({"courtier": broker, "written_premium": round(wp, 2), "contract_count": len(group)})
    result.sort(key=lambda x: x["written_premium"], reverse=True)
    return result[:top]


@router.get("/by-year")
def kpis_by_year(filters: FilterParams = Depends(parse_filter_params), _: dict = Depends(get_current_user)):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "UNDERWRITING_YEAR" not in df.columns:
        return []
    df_valid = df[df["UNDERWRITING_YEAR"].notna()].copy()
    df_valid["UNDERWRITING_YEAR"] = df_valid["UNDERWRITING_YEAR"].astype(int)
    result = []
    for year, group in df_valid.groupby("UNDERWRITING_YEAR"):
        kpis = compute_kpi_summary(group)
        result.append({"year": int(year), **kpis})
    result.sort(key=lambda x: x["year"])
    return result


@router.post("/pivot")
def kpis_pivot(request: dict, _: dict = Depends(get_current_user)):
    filters_raw = request.get("filters", {})
    row_axis = request.get("row_axis", "INT_BRANCHE")
    col_axis = request.get("col_axis", "UNDERWRITING_YEAR")
    value_key = request.get("value", "WRITTEN_PREMIUM")

    df = get_df()
    if filters_raw:
        try:
            def tl(v):
                if v is None: return None
                if isinstance(v, list): return v or None
                if isinstance(v, str) and v: return [x.strip() for x in v.split(",") if x.strip()]
                return None
            fp = FilterParams(
                perimetre=tl(filters_raw.get("perimetre")), type_contrat_spc=tl(filters_raw.get("type_contrat_spc")),
                specialite=tl(filters_raw.get("specialite")), int_spc_search=filters_raw.get("int_spc_search") or None,
                branche=tl(filters_raw.get("branche")), sous_branche=tl(filters_raw.get("sous_branche")),
                pays_risque=tl(filters_raw.get("pays_risque")), pays_cedante=tl(filters_raw.get("pays_cedante")),
                courtier=tl(filters_raw.get("courtier")), cedante=tl(filters_raw.get("cedante")),
                statuts=tl(filters_raw.get("statuts")), type_of_contract=tl(filters_raw.get("type_of_contract")),
            )
            df = apply_filters(df, fp)
        except Exception:
            pass

    if df.empty:
        return {"rows": [], "columns": [], "data": []}

    col_map = {"WRITTEN_PREMIUM": "WRITTEN_PREMIUM", "RESULTAT": "RESULTAT", "ULR": "ULR"}
    value_col = col_map.get(value_key, "WRITTEN_PREMIUM")
    row_axis = row_axis if row_axis in df.columns else "INT_BRANCHE"
    col_axis = col_axis if col_axis in df.columns else "UNDERWRITING_YEAR"

    try:
        pivot = df.pivot_table(values=value_col, index=row_axis, columns=col_axis, aggfunc="sum", fill_value=0)
        columns = [str(c) for c in pivot.columns.tolist()]
        data = []
        for r in pivot.index:
            row_data = {"label": str(r)}
            for c in pivot.columns:
                val = float(pivot.loc[r, c])
                row_data[str(c)] = 0.0 if val != val else round(val, 2)
            data.append(row_data)
        return {"rows": [str(r) for r in pivot.index.tolist()], "columns": columns, "data": data}
    except Exception as e:
        return {"rows": [], "columns": [], "data": [], "error": str(e)}
