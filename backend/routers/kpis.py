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

@router.get("/financial-breakdown")
def kpis_financial_breakdown(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty:
        return {}
    
    import pandas as pd
    def safe_sum(col):
        if col in df.columns:
            val = float(pd.to_numeric(df[col], errors='coerce').fillna(0).sum())
            return round(val, 2)
        return 0.0
    
    written_premium = safe_sum("WRITTEN_PREMIUM")
    commission = safe_sum("COMMISSION")
    brokerage = safe_sum("BROKERAGE1")
    profit_commission = safe_sum("PROFIT_COMMISSION")
    print(f"[DEBUG] PROFIT_COMMISSION in DB / financial-breakdown: {profit_commission}")
    tax = safe_sum("TAX_ON_PREMIUM")
    resultat = safe_sum("RESULTAT")
    
    return {
        "written_premium": written_premium,
        "commission": commission,
        "brokerage": brokerage,
        "profit_commission": profit_commission,
        "tax": tax,
        "resultat": resultat,
        "commission_pct": round(commission / written_premium * 100, 1) if written_premium else 0,
        "brokerage_pct": round(brokerage / written_premium * 100, 1) if written_premium else 0,
        "profit_commission_pct": round(profit_commission / written_premium * 100, 1) if written_premium else 0,
        "tax_pct": round(tax / written_premium * 100, 1) if written_premium else 0,
        "resultat_pct": round(resultat / written_premium * 100, 1) if written_premium else 0,
    }

@router.get("/alerts")
def kpis_alerts(
    ulr_threshold: float = Query(80.0),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "PAYS_RISQUE" not in df.columns or "INT_BRANCHE" not in df.columns:
        return []
    result = []
    for (pays, branche), group in df.groupby(["PAYS_RISQUE", "INT_BRANCHE"]):
        if not pays or not branche:
            continue
        kpis = compute_kpi_summary(group)
        if kpis["avg_ulr"] is not None and kpis["avg_ulr"] >= ulr_threshold:
            result.append({
                "pays": pays,
                "branche": branche,
                "avg_ulr": kpis["avg_ulr"],
                "total_written_premium": kpis["total_written_premium"],
                "total_resultat": kpis["total_resultat"],
                "contract_count": kpis["contract_count"],
            })
    result.sort(key=lambda x: x["avg_ulr"], reverse=True)
    return result


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


@router.get("/profit-commission-by-branch")
def profit_commission_by_branch(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []
    df["PROFIT_COMMISSION"] = pd.to_numeric(df["PROFIT_COMMISSION"], errors="coerce").fillna(0)
    df["PROFIT_COMM_RATE"] = pd.to_numeric(df["PROFIT_COMM_RATE"], errors="coerce").fillna(0)
    df["WRITTEN_PREMIUM"] = pd.to_numeric(df["WRITTEN_PREMIUM"], errors="coerce").fillna(0)
    result = []
    for branche, group in df.groupby("INT_BRANCHE"):
        if not branche:
            continue
        contracts_with_pc = group[group["PROFIT_COMM_RATE"] > 0]
        if len(contracts_with_pc) == 0:
            continue
        result.append({
            "branche": branche,
            "profit_commission": round(float(group["PROFIT_COMMISSION"].sum()), 2),
            "avg_profit_comm_rate": round(float(contracts_with_pc["PROFIT_COMM_RATE"].mean()), 2),
            "contract_count_with_pc": len(contracts_with_pc),
            "total_contracts": len(group),
            "written_premium": round(float(group["WRITTEN_PREMIUM"].sum()), 2),
        })
    result.sort(key=lambda x: x["avg_profit_comm_rate"], reverse=True)
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


@router.get("/by-contract-type")
def kpis_by_contract_type(filters: FilterParams = Depends(parse_filter_params), _: dict = Depends(get_current_user)):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "TYPE_OF_CONTRACT" not in df.columns:
        return []
    result = []
    for type_contrat, group in df.groupby("TYPE_OF_CONTRACT"):
        if not type_contrat:
            continue
        kpis = compute_kpi_summary(group)
        import pandas as pd
        avg_commission = round(float(pd.to_numeric(group["COMMI"], errors="coerce").mean()), 2) if "COMMI" in group.columns else 0.0
        avg_commission = avg_commission if avg_commission == avg_commission else 0.0
        result.append({"type_contrat": type_contrat, "avg_commission": avg_commission, **kpis})
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result


@router.get("/by-cedante")
def kpis_by_cedante(top: int = Query(10), filters: FilterParams = Depends(parse_filter_params), _: dict = Depends(get_current_user)):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "INT_CEDANTE" not in df.columns:
        return []
    result = []
    for cedante, group in df.groupby("INT_CEDANTE"):
        if not cedante:
            continue
        kpis = compute_kpi_summary(group)
        result.append({"cedante": cedante, **kpis})
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
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


@router.get("/cedante/profile")
def cedante_profile(
    cedante: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["INT_CEDANTE"] == cedante]
    if group.empty:
        return {}
    kpis = compute_kpi_summary(group)
    avg_share = round(float(pd.to_numeric(group["SHARE_SIGNED"], errors="coerce").mean()), 2) if "SHARE_SIGNED" in group.columns else 0.0
    avg_commission = round(float(pd.to_numeric(group["COMMI"], errors="coerce").mean()), 2) if "COMMI" in group.columns else 0.0
    avg_profit_comm = round(float(pd.to_numeric(group["PROFIT_COMM_RATE"], errors="coerce").mean()), 2) if "PROFIT_COMM_RATE" in group.columns else 0.0
    avg_brokerage = round(float(pd.to_numeric(group["BROKERAGE_RATE"], errors="coerce").mean()), 2) if "BROKERAGE_RATE" in group.columns else 0.0
    pays_cedante = group["PAYS_CEDANTE"].mode().iloc[0] if "PAYS_CEDANTE" in group.columns and not group["PAYS_CEDANTE"].mode().empty else ""
    return {
        **kpis,
        "cedante": cedante,
        "pays_cedante": pays_cedante,
        "avg_share_signed": avg_share,
        "avg_commission": avg_commission,
        "avg_profit_comm_rate": avg_profit_comm,
        "avg_brokerage_rate": avg_brokerage,
    }


@router.get("/cedante/by-year")
def cedante_by_year(
    cedante: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["INT_CEDANTE"] == cedante]
    if group.empty:
        return []
    group = group[group["UNDERWRITING_YEAR"].notna()].copy()
    group["UNDERWRITING_YEAR"] = group["UNDERWRITING_YEAR"].astype(int)
    result = []
    for year, yr_group in group.groupby("UNDERWRITING_YEAR"):
        kpis = compute_kpi_summary(yr_group)
        result.append({"year": int(year), **kpis})
    result.sort(key=lambda x: x["year"])
    return result


@router.get("/cedante/by-branch")
def cedante_by_branch(
    cedante: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["INT_CEDANTE"] == cedante]
    if group.empty:
        return []
    result = []
    for branche, br_group in group.groupby("INT_BRANCHE"):
        if not branche:
            continue
        kpis = compute_kpi_summary(br_group)
        
        def safe_mean(col):
            if col not in br_group.columns:
                return 0.0
            val = pd.to_numeric(br_group[col], errors="coerce").mean()
            return round(float(val), 2) if not pd.isna(val) else 0.0

        result.append({
            "branche": branche,
            **kpis,
            "avg_commission": safe_mean("COMMI"),
            "avg_brokerage_rate": safe_mean("BROKERAGE_RATE"),
            "avg_profit_comm_rate": safe_mean("PROFIT_COMM_RATE"),
        })
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result


@router.get("/exposition/by-country")
def exposition_by_country(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "PAYS_RISQUE" not in df.columns:
        return []
    df["SUM_INSURED_100"] = pd.to_numeric(df["SUM_INSURED_100"], errors="coerce").fillna(0)
    df["SHARE_SIGNED"] = pd.to_numeric(df["SHARE_SIGNED"], errors="coerce").fillna(0)
    df["SUBJECT_PREMIUM"] = pd.to_numeric(df["SUBJECT_PREMIUM"], errors="coerce").fillna(0)
    df["WRITTEN_PREMIUM"] = pd.to_numeric(df["WRITTEN_PREMIUM"], errors="coerce").fillna(0)
    df["exposition"] = df["SUM_INSURED_100"] * df["SHARE_SIGNED"] / 100
    result = []
    for pays, group in df.groupby("PAYS_RISQUE"):
        if not pays:
            continue
        result.append({
            "pays": pays,
            "sum_insured_100": round(float(group["SUM_INSURED_100"].sum()), 2),
            "exposition": round(float(group["exposition"].sum()), 2),
            "avg_share_signed": round(float(group["SHARE_SIGNED"].mean()), 2),
            "subject_premium": round(float(group["SUBJECT_PREMIUM"].sum()), 2),
            "written_premium": round(float(group["WRITTEN_PREMIUM"].sum()), 2),
            "contract_count": len(group),
        })
    result.sort(key=lambda x: x["exposition"], reverse=True)
    return result


@router.get("/exposition/by-branch")
def exposition_by_branch(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []
    df["SUM_INSURED_100"] = pd.to_numeric(df["SUM_INSURED_100"], errors="coerce").fillna(0)
    df["SHARE_SIGNED"] = pd.to_numeric(df["SHARE_SIGNED"], errors="coerce").fillna(0)
    df["SUBJECT_PREMIUM"] = pd.to_numeric(df["SUBJECT_PREMIUM"], errors="coerce").fillna(0)
    df["WRITTEN_PREMIUM"] = pd.to_numeric(df["WRITTEN_PREMIUM"], errors="coerce").fillna(0)
    df["exposition"] = df["SUM_INSURED_100"] * df["SHARE_SIGNED"] / 100
    result = []
    for branche, group in df.groupby("INT_BRANCHE"):
        if not branche:
            continue
        result.append({
            "branche": branche,
            "sum_insured_100": round(float(group["SUM_INSURED_100"].sum()), 2),
            "exposition": round(float(group["exposition"].sum()), 2),
            "avg_share_signed": round(float(group["SHARE_SIGNED"].mean()), 2),
            "subject_premium": round(float(group["SUBJECT_PREMIUM"].sum()), 2),
            "written_premium": round(float(group["WRITTEN_PREMIUM"].sum()), 2),
            "contract_count": len(group),
        })
    result.sort(key=lambda x: x["exposition"], reverse=True)
    return result


@router.get("/exposition/top-risks")
def exposition_top_risks(
    top: int = Query(20),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty:
        return []
    df["SUM_INSURED_100"] = pd.to_numeric(df["SUM_INSURED_100"], errors="coerce").fillna(0)
    df["SHARE_SIGNED"] = pd.to_numeric(df["SHARE_SIGNED"], errors="coerce").fillna(0)
    df["WRITTEN_PREMIUM"] = pd.to_numeric(df["WRITTEN_PREMIUM"], errors="coerce").fillna(0)
    df["ULR"] = pd.to_numeric(df["ULR"], errors="coerce").fillna(0)
    df["exposition"] = df["SUM_INSURED_100"] * df["SHARE_SIGNED"] / 100
    top_df = df.nlargest(top, "exposition")
    result = []
    for _, row in top_df.iterrows():
        result.append({
            "policy_id": str(row.get("POLICY_SEQUENCE_NUMBER", "")),
            "cedante": str(row.get("INT_CEDANTE", "")),
            "branche": str(row.get("INT_BRANCHE", "")),
            "pays_risque": str(row.get("PAYS_RISQUE", "")),
            "sum_insured_100": round(float(row["SUM_INSURED_100"]), 2),
            "share_signed": round(float(row["SHARE_SIGNED"]), 2),
            "exposition": round(float(row["exposition"]), 2),
            "written_premium": round(float(row["WRITTEN_PREMIUM"]), 2),
            "ulr": round(float(row["ULR"]), 2),
        })
    return result


@router.get("/market/profile")
def market_profile(
    pays: str = Query(...),
    branche: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[(df["PAYS_RISQUE"] == pays) & (df["INT_BRANCHE"] == branche)]
    if group.empty:
        return {}
    kpis = compute_kpi_summary(group)
    def safe_mean(col):
        if col not in group.columns: return 0.0
        val = pd.to_numeric(group[col], errors="coerce").mean()
        return round(float(val), 2) if not pd.isna(val) else 0.0
    return {
        **kpis,
        "pays": pays,
        "branche": branche,
        "avg_share_signed": safe_mean("SHARE_SIGNED"),
        "avg_commission": safe_mean("COMMI"),
        "avg_profit_comm_rate": safe_mean("PROFIT_COMM_RATE"),
        "avg_brokerage_rate": safe_mean("BROKERAGE_RATE"),
    }


@router.get("/market/by-year")
def market_by_year(
    pays: str = Query(...),
    branche: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[(df["PAYS_RISQUE"] == pays) & (df["INT_BRANCHE"] == branche)]
    if group.empty: return []
    group = group[group["UNDERWRITING_YEAR"].notna()].copy()
    group["UNDERWRITING_YEAR"] = group["UNDERWRITING_YEAR"].astype(int)
    result = []
    for year, yr_group in group.groupby("UNDERWRITING_YEAR"):
        kpis = compute_kpi_summary(yr_group)
        result.append({"year": int(year), **kpis})
    result.sort(key=lambda x: x["year"])
    return result


@router.get("/country/profile")
def country_profile(
    pays: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["PAYS_RISQUE"] == pays]
    if group.empty: return {}
    kpis = compute_kpi_summary(group)
    def safe_mean(col):
        if col not in group.columns: return 0.0
        val = pd.to_numeric(group[col], errors="coerce").mean()
        return round(float(val), 2) if not pd.isna(val) else 0.0
    return {
        **kpis,
        "pays": pays,
        "avg_share_signed": safe_mean("SHARE_SIGNED"),
        "avg_commission": safe_mean("COMMI"),
        "avg_profit_comm_rate": safe_mean("PROFIT_COMM_RATE"),
        "avg_brokerage_rate": safe_mean("BROKERAGE_RATE"),
    }


@router.get("/country/by-year")
def country_by_year(
    pays: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["PAYS_RISQUE"] == pays]
    if group.empty: return []
    group = group[group["UNDERWRITING_YEAR"].notna()].copy()
    group["UNDERWRITING_YEAR"] = group["UNDERWRITING_YEAR"].astype(int)
    result = []
    for year, yr_group in group.groupby("UNDERWRITING_YEAR"):
        kpis = compute_kpi_summary(yr_group)
        result.append({"year": int(year), **kpis})
    result.sort(key=lambda x: x["year"])
    return result


@router.get("/country/by-branch")
def country_by_branch(
    pays: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["PAYS_RISQUE"] == pays]
    if group.empty: return []
    result = []
    for branche, br_group in group.groupby("INT_BRANCHE"):
        if not branche: continue
        kpis = compute_kpi_summary(br_group)
        def safe_mean(col):
            if col not in br_group.columns: return 0.0
            val = pd.to_numeric(br_group[col], errors="coerce").mean()
            return round(float(val), 2) if not pd.isna(val) else 0.0
        result.append({
            "branche": branche,
            **kpis,
            "avg_commission": safe_mean("COMMI"),
            "avg_brokerage_rate": safe_mean("BROKERAGE_RATE"),
            "avg_profit_comm_rate": safe_mean("PROFIT_COMM_RATE"),
        })
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result
