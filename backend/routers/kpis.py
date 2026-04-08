from fastapi import APIRouter, Depends, Query
from typing import Optional
from models.schemas import FilterParams
from routers.auth import get_current_user
from services.data_service import get_df, apply_filters, apply_identity_filters, apply_analysis_filters, apply_financial_filters, compute_kpi_summary, get_status, get_filter_options, load_excel
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
    uw_years_raw: Optional[str] = Query(None),  # C1: exact list e.g. "2019,2021,2022"
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
    def split_list(s):
        return [v.strip() for v in s.split(",") if v.strip()] if s else None

    def split_list_int(s: Optional[str]) -> Optional[list]:
        """Parse CSV string to List[int]. Ex: '2019,2021' → [2019, 2021]"""
        if not s:
            return None
        try:
            return [int(v.strip()) for v in s.split(",") if v.strip()]
        except ValueError:
            return None

    return FilterParams(
        perimetre=split_list(perimetre), type_contrat_spc=split_list(type_contrat_spc),
        specialite=split_list(specialite), int_spc_search=int_spc_search,
        branche=split_list(branche), sous_branche=split_list(sous_branche),
        pays_risque=split_list(pays_risque), pays_cedante=split_list(pays_cedante),
        courtier=split_list(courtier), cedante=split_list(cedante),
        uw_year_min=uw_year_min, uw_year_max=uw_year_max,
        uw_years=split_list_int(uw_years_raw),
        statuts=split_list(statuts),
        type_of_contract=split_list(type_of_contract),
        type_cedante=split_list(type_cedante),
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
        "resultat_pct": round(resultat / written_premium * 100, 1) if written_premium else 0,
    }


def apply_view_filters(df, contract_type_view: Optional[str], vie_non_vie_view: Optional[str]):
    if contract_type_view == "FAC" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    elif contract_type_view == "TREATY" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[~df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    if vie_non_vie_view and vie_non_vie_view != "ALL" and "VIE_NON_VIE" in df.columns:
        df = df[df["VIE_NON_VIE"] == vie_non_vie_view]
    return df


@router.get("/alerts")
def kpis_alerts(
    ulr_threshold: float = Query(80.0),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    # Garantir que le filtre d'année est bien appliqué (sécurité supplémentaire)
    if "UNDERWRITING_YEAR" in df.columns:
        if filters.uw_years:
            df = df[df["UNDERWRITING_YEAR"].isin(filters.uw_years)]
        elif filters.uw_year_min is not None and filters.uw_year_max is not None:
            df = df[
                (df["UNDERWRITING_YEAR"] >= filters.uw_year_min) &
                (df["UNDERWRITING_YEAR"] <= filters.uw_year_max)
            ]
        elif filters.uw_year_min is not None:
            df = df[df["UNDERWRITING_YEAR"] >= filters.uw_year_min]
        elif filters.uw_year_max is not None:
            df = df[df["UNDERWRITING_YEAR"] <= filters.uw_year_max]
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


@router.get("/top-brokers")
def kpis_top_brokers(
    limit: int = Query(20),
    sort_by: str = Query("total_written_premium"),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "INT_BROKER" not in df.columns:
        return []

    result = []
    # Dropna to avoid empty brokers and exclude "DIRECT" if user only wants actual brokers
    for broker, group in df.groupby("INT_BROKER"):
        if not broker or str(broker).strip() == "" or str(broker).strip().upper() == "NAN":
            continue
        kpis = compute_kpi_summary(group)
        result.append({
            "broker": str(broker).strip(),
            "total_written_premium": kpis["total_written_premium"],
            "total_resultat": kpis["total_resultat"],
            "avg_ulr": kpis["avg_ulr"],
            "contract_count": kpis["contract_count"]
        })
    
    # Sort
    sort_key = sort_by if sort_by in ["total_written_premium", "total_resultat", "avg_ulr", "contract_count"] else "total_written_premium"
    reverse_sort = True if sort_key != "avg_ulr" else False  # ULR is usually better if lower, but typically we sort by largest volume
    if sort_key == "avg_ulr":
        # Keep None values at the end
        result.sort(key=lambda x: x[sort_key] if x[sort_key] is not None else float('inf'), reverse=False)
    else:
        result.sort(key=lambda x: x[sort_key] if x[sort_key] is not None else -f"inf", reverse=reverse_sort)

    return result[:limit]


@router.get("/by-country")
def kpis_by_country(
    contract_type_view: Optional[str] = Query(None),  # A1: "FAC" | "TREATY" | None
    vie_non_vie_view: Optional[str] = Query(None),    # A2: "VIE" | "NON_VIE" | None
    selected_countries: Optional[str] = Query(None),  # C: CSV de noms de pays (highlight)
    top: int = Query(10),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    df = get_df()

    # C: si selected_countries, ne pas appliquer le filtre pays_risque standard
    # pour pouvoir afficher les N sélectionnés + (top-N) complément
    if selected_countries:
        selected_list = [p.strip() for p in selected_countries.split(",") if p.strip()]
        filters_no_pays = filters.model_copy(update={"pays_risque": None})
        df = apply_filters(df, filters_no_pays)
    else:
        df = apply_filters(df, filters)

    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)

    if df.empty or "PAYS_RISQUE" not in df.columns:
        return []

    all_results = []
    for pays, group in df.groupby("PAYS_RISQUE"):
        if not pays:
            continue
        kpis = compute_kpi_summary(group)
        is_sel = bool(selected_countries and str(pays).strip() in selected_list)
        all_results.append({"pays": pays, "is_selected": is_sel, **kpis})

    all_results.sort(key=lambda x: x["total_written_premium"], reverse=True)

    if selected_countries:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["total_written_premium"], reverse=True)
        return final

    return all_results[:top]


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
def kpis_by_broker(
    top: int = Query(10),
    selected_brokers: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    # #7: si selected_brokers fourni, ne pas appliquer le filtre courtier standard
    # pour pouvoir afficher les sélectionnés + le complément top N
    if selected_brokers:
        selected_list = [b.strip() for b in selected_brokers.split(",") if b.strip()]
        filters_no_broker = filters.model_copy(update={"courtier": None})
        df = get_df()
        df = apply_filters(df, filters_no_broker)
    else:
        df = get_df()
        df = apply_filters(df, filters)

    if df.empty or "INT_BROKER" not in df.columns:
        return []

    all_results = []
    for broker, group in df.groupby("INT_BROKER"):
        if not broker or str(broker).strip() in ("", "NAN"):
            continue
        wp = float(group["WRITTEN_PREMIUM"].sum() if "WRITTEN_PREMIUM" in group.columns else 0)
        is_sel = bool(selected_brokers and str(broker).strip() in selected_list)
        all_results.append({
            "courtier": str(broker).strip(),
            "written_premium": round(wp, 2),
            "contract_count": len(group),
            "is_selected": is_sel,
        })

    all_results.sort(key=lambda x: x["written_premium"], reverse=True)

    if selected_brokers:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["written_premium"], reverse=True)
        return final

    return all_results[:top]


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


@router.get("/by-specialite")
def kpis_by_specialite(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    """
    Retourne la répartition FAC vs Traité (TTY + TTE) par prime écrite.
    Utilise la colonne INT_SPC_TYPE.
    """
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)

    if df.empty or "INT_SPC_TYPE" not in df.columns:
        return []

    df["INT_SPC_TYPE"] = df["INT_SPC_TYPE"].fillna("").astype(str).str.upper().str.strip()
    df["WRITTEN_PREMIUM"] = pd.to_numeric(df["WRITTEN_PREMIUM"], errors="coerce").fillna(0)

    fac_df = df[df["INT_SPC_TYPE"] == "FAC"]
    treaty_df = df[df["INT_SPC_TYPE"].isin(["TTY", "TTE"])]

    fac_premium = float(fac_df["WRITTEN_PREMIUM"].sum())
    treaty_premium = float(treaty_df["WRITTEN_PREMIUM"].sum())

    result = []
    if fac_premium > 0:
        result.append({
            "specialite": "FAC",
            "total_written_premium": round(fac_premium, 2),
            "contract_count": len(fac_df),
        })
    if treaty_premium > 0:
        result.append({
            "specialite": "Traité",
            "total_written_premium": round(treaty_premium, 2),
            "contract_count": len(treaty_df),
        })

    return sorted(result, key=lambda x: x["total_written_premium"], reverse=True)


@router.get("/by-cedante")
def kpis_by_cedante(
    top: int = Query(10),
    type_contrat_view: Optional[str] = Query(None),
    selected_cedantes: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    df = get_df()

    # #6: si selected_cedantes fourni, ne pas appliquer le filtre cedante standard
    # pour pouvoir afficher les sélectionnées + le complément top N
    if selected_cedantes:
        selected_list = [c.strip() for c in selected_cedantes.split(",") if c.strip()]
        filters_no_cedante = filters.model_copy(update={"cedante": None})
        df = apply_filters(df, filters_no_cedante)
    else:
        df = apply_filters(df, filters)

    if df.empty or "INT_CEDANTE" not in df.columns:
        return []

    # Compatibilité ancien paramètre type_contrat_view
    if type_contrat_view == "FAC" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    elif type_contrat_view == "TREATY" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[~df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]

    all_results = []
    for cedante, group in df.groupby("INT_CEDANTE"):
        if not cedante:
            continue
        kpis = compute_kpi_summary(group)
        is_sel = bool(selected_cedantes and str(cedante).strip() in selected_list)
        all_results.append({"cedante": cedante, "is_selected": is_sel, **kpis})
    all_results.sort(key=lambda x: x["total_written_premium"], reverse=True)

    if selected_cedantes:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["total_written_premium"], reverse=True)
        return final

    return all_results[:top]


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
    vie_non_vie_view: Optional[str] = Query(None),  # A3
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df_raw = get_df()

    # ── df_identity : filtres identitaires uniquement (années, périmètre, statuts)
    # Ne jamais appliquer branche/pays ici pour préserver les attributs globaux
    df_identity = apply_identity_filters(df_raw, filters)
    identity_group_full = df_identity[df_identity["INT_CEDANTE"] == cedante]

    if identity_group_full.empty:
        return {}

    # Vue identitaire (optionnellement filtrée par Vie/Non-vie) réservée aux KPI analytiques de fallback
    identity_group_view = identity_group_full
    if vie_non_vie_view and "VIE_NON_VIE" in identity_group_view.columns:
        identity_group_view = identity_group_view[identity_group_view["VIE_NON_VIE"] == vie_non_vie_view]

    # ── Attributs globaux calculés sur df_identity (jamais altérés par branche/pays)
    pays_cedante = identity_group_full["PAYS_CEDANTE"].mode().iloc[0] if "PAYS_CEDANTE" in identity_group_full.columns and not identity_group_full["PAYS_CEDANTE"].mode().empty else ""
    type_cedante = "ASSUREUR DIRECT"
    if "TYPE_CEDANTE" in identity_group_full.columns and not identity_group_full["TYPE_CEDANTE"].mode().empty:
        type_cedante = str(identity_group_full["TYPE_CEDANTE"].mode().iloc[0])

    # B2 — Diversification par branches (toujours sur identité complète, jamais filtrée par branche)
    branches_actives = 0
    if "INT_BRANCHE" in identity_group_full.columns and "WRITTEN_PREMIUM" in identity_group_full.columns:
        branch_sums = identity_group_full.groupby("INT_BRANCHE")["WRITTEN_PREMIUM"].apply(
            lambda x: pd.to_numeric(x, errors="coerce").fillna(0).sum()
        )
        branches_actives = int((branch_sums > 0).sum())
    elif "INT_BRANCHE" in identity_group_full.columns:
        branches_actives = int(identity_group_full["INT_BRANCHE"].dropna().nunique())

    # B3 — Alerte Saturation FAC (Calculé sur le portefeuille brut)
    fac_saturation_alerts = []
    has_type = "TYPE_OF_CONTRACT" in identity_group_full.columns
    has_spc_type = "INT_SPC_TYPE" in identity_group_full.columns
    if "INT_BRANCHE" in identity_group_full.columns and "WRITTEN_PREMIUM" in identity_group_full.columns and (has_type or has_spc_type):
        fac_mask = pd.Series(False, index=identity_group_full.index)
        if has_type: fac_mask = fac_mask | (identity_group_full["TYPE_OF_CONTRACT"] == "FAC")
        if has_spc_type: fac_mask = fac_mask | (identity_group_full["INT_SPC_TYPE"] == "FAC")
        
        fac_group = identity_group_full[fac_mask]
        
        # Grouper par branche, compter les lignes (affaires) et sommer les primes
        for branche, br_df in fac_group.groupby("INT_BRANCHE"):
            count = len(br_df)
            prime = pd.to_numeric(br_df["WRITTEN_PREMIUM"], errors="coerce").fillna(0).sum()
            if count > 5 and prime > 1000000:
                fac_saturation_alerts.append(str(branche))

    # ── df_analysis : tous les filtres appliqués (pour les KPIs des graphiques)
    df_analysis = apply_analysis_filters(apply_financial_filters(df_identity, filters), filters)
    analysis_group = df_analysis[df_analysis["INT_CEDANTE"] == cedante]
    if vie_non_vie_view and "VIE_NON_VIE" in analysis_group.columns:
        analysis_group = analysis_group[analysis_group["VIE_NON_VIE"] == vie_non_vie_view]

    # KPIs d'analyse — reflètent les filtres actifs
    kpis = compute_kpi_summary(analysis_group) if not analysis_group.empty else compute_kpi_summary(identity_group_view)

    avg_share = round(float(pd.to_numeric(analysis_group["SHARE_SIGNED"] if not analysis_group.empty else identity_group_view["SHARE_SIGNED"], errors="coerce").mean()), 2) if "SHARE_SIGNED" in identity_group_full.columns else 0.0
    avg_commission = round(float(pd.to_numeric(analysis_group["COMMI"] if not analysis_group.empty else identity_group_view["COMMI"], errors="coerce").mean()), 2) if "COMMI" in identity_group_full.columns else 0.0
    avg_profit_comm = round(float(pd.to_numeric(analysis_group["PROFIT_COMM_RATE"] if not analysis_group.empty else identity_group_view["PROFIT_COMM_RATE"], errors="coerce").mean()), 2) if "PROFIT_COMM_RATE" in identity_group_full.columns else 0.0
    avg_brokerage = round(float(pd.to_numeric(analysis_group["BROKERAGE_RATE"] if not analysis_group.empty else identity_group_view["BROKERAGE_RATE"], errors="coerce").mean()), 2) if "BROKERAGE_RATE" in identity_group_full.columns else 0.0

    # filtered_view = True si des filtres d'analyse ou financiers sont actifs
    filtered_view = bool(
        filters.branche or filters.sous_branche or filters.pays_risque or
        filters.pays_cedante or filters.type_of_contract or filters.type_contrat_spc or
        filters.specialite or filters.prime_min is not None or filters.prime_max is not None or
        filters.ulr_min is not None or filters.ulr_max is not None
    )

    return {
        **kpis,
        "cedante": cedante,
        "pays_cedante": pays_cedante,
        "avg_share_signed": avg_share,
        "avg_commission": avg_commission,
        "avg_profit_comm_rate": avg_profit_comm,
        "avg_brokerage_rate": avg_brokerage,
        "type_cedante": type_cedante,         # B1 — calculé sur df_identity
        "branches_actives": branches_actives,  # B2 — calculé sur df_identity (immunisé contre filtre branche)
        "fac_saturation_alerts": fac_saturation_alerts, # Alerte métier ciblée
        "filtered_view": filtered_view,        # indique au frontend si une vue partielle est active
    }


@router.get("/cedante/by-year")
def cedante_by_year(
    cedante: str = Query(...),
    vie_non_vie_view: Optional[str] = Query(None),  # A3
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    
    # ── Règle Métier : L'évolution historique ne doit pas être tronquée par le filtre de l'année
    filters.uw_years = None
    filters.uw_year_min = None
    filters.uw_year_max = None
    
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["INT_CEDANTE"] == cedante]
    if vie_non_vie_view and "VIE_NON_VIE" in group.columns:
        group = group[group["VIE_NON_VIE"] == vie_non_vie_view]
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
    vie_non_vie_view: Optional[str] = Query(None),  # A3
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    group = df[df["INT_CEDANTE"] == cedante]
    if vie_non_vie_view and "VIE_NON_VIE" in group.columns:
        group = group[group["VIE_NON_VIE"] == vie_non_vie_view]
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
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
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
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
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
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
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
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
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
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)
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


@router.get("/cedante/fac-saturation")
def cedante_fac_saturation(
    cedante: str = Query(...),
    seuil_prime: float = Query(1_000_000),   # B3: modifiable, default 1M DH
    seuil_affaires: int = Query(5),           # B3: modifiable, default 5 affaires
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    df_cedante = df[df["INT_CEDANTE"] == cedante] if "INT_CEDANTE" in df.columns else df[:0]
    if "TYPE_OF_CONTRACT" in df_cedante.columns:
        df_cedante = df_cedante[df_cedante["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    if df_cedante.empty or "INT_BRANCHE" not in df_cedante.columns:
        return []
    result = []
    for branche in df_cedante["INT_BRANCHE"].dropna().unique():
        if not branche:
            continue
        df_br = df_cedante[df_cedante["INT_BRANCHE"] == branche]
        total_prime = float(df_br["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in df_br.columns else 0.0
        nb_affaires = int(len(df_br))
        is_saturated = (total_prime > seuil_prime) and (nb_affaires > seuil_affaires)
        result.append({
            "branche": branche,
            "total_prime_fac": round(total_prime, 2),
            "nb_affaires_fac": nb_affaires,
            "is_saturated": is_saturated,
            "seuil_prime": seuil_prime,
            "seuil_affaires": seuil_affaires,
        })
    return sorted(result, key=lambda x: x["total_prime_fac"], reverse=True)


@router.get("/cedante/fac-saturation-global")
def cedante_fac_saturation_global(
    seuil_prime: float = Query(1_000_000),
    seuil_affaires: int = Query(5),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    if "TYPE_OF_CONTRACT" not in df.columns or "INT_CEDANTE" not in df.columns or "INT_BRANCHE" not in df.columns:
        return []
    df_fac = df[df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    if df_fac.empty:
        return []
    result = []
    for cedante_name, ced_df in df_fac.groupby("INT_CEDANTE"):
        if not cedante_name:
            continue
        branches_detail = []
        for branche, br_df in ced_df.groupby("INT_BRANCHE"):
            if not branche:
                continue
            total_prime = float(pd.to_numeric(br_df["WRITTEN_PREMIUM"], errors="coerce").fillna(0).sum()) if "WRITTEN_PREMIUM" in br_df.columns else 0.0
            nb_affaires = int(len(br_df))
            is_saturated = (total_prime > seuil_prime) and (nb_affaires > seuil_affaires)
            saturation_score = round((total_prime / seuil_prime) + (nb_affaires / seuil_affaires), 4)
            branches_detail.append({
                "branche": branche,
                "total_prime_fac": round(total_prime, 2),
                "nb_affaires_fac": nb_affaires,
                "is_saturated": is_saturated,
                "saturation_score": saturation_score,
                "seuil_prime": seuil_prime,
                "seuil_affaires": seuil_affaires,
            })
        if not branches_detail:
            continue
        total_prime_cedante = round(sum(b["total_prime_fac"] for b in branches_detail), 2)
        nb_branches_fac = len(branches_detail)
        branches_saturees = [b["branche"] for b in branches_detail if b["is_saturated"]]
        nb_branches_saturees = len(branches_saturees)
        score_global = round(sum(b["saturation_score"] for b in branches_detail), 4)
        result.append({
            "cedante": cedante_name,
            "total_prime_fac": total_prime_cedante,
            "nb_branches_fac": nb_branches_fac,
            "nb_branches_saturees": nb_branches_saturees,
            "branches_saturees": branches_saturees,
            "score_global": score_global,
            "branches_detail": sorted(branches_detail, key=lambda x: x["total_prime_fac"], reverse=True),
        })
    return sorted(result, key=lambda x: x["score_global"], reverse=True)


@router.get("/by-country-contract-type")
def kpis_by_country_contract_type(
    vie_non_vie_view: Optional[str] = Query(None),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    df = apply_view_filters(df, None, vie_non_vie_view)
    if df.empty or "PAYS_RISQUE" not in df.columns or "TYPE_OF_CONTRACT" not in df.columns:
        return []
        
    df["TYPE_CLEAN"] = df["TYPE_OF_CONTRACT"].fillna("").astype(str)
    df["ContractMode"] = "TREATY"
    df.loc[df["TYPE_CLEAN"].str.upper().str.contains("FAC", na=False), "ContractMode"] = "FAC"
    
    result = []
    for pays, group in df.groupby("PAYS_RISQUE"):
        if not pays: continue
        total_prime = float(group["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in group.columns else 0.0
        
        fac_group = group[group["ContractMode"] == "FAC"]
        treaty_group = group[group["ContractMode"] == "TREATY"]
        
        fac_prime = float(fac_group["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in fac_group.columns else 0.0
        treaty_prime = float(treaty_group["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in treaty_group.columns else 0.0
        
        fac_count = int(len(fac_group))
        treaty_count = int(len(treaty_group))
        
        result.append({
            "pays": pays,
            "total_written_premium": round(total_prime, 2),
            "fac_written_premium": round(fac_prime, 2),
            "treaty_written_premium": round(treaty_prime, 2),
            "fac_contract_count": fac_count,
            "treaty_contract_count": treaty_count,
            "total_contract_count": len(group)
        })
        
    return sorted(result, key=lambda x: x["total_written_premium"], reverse=True)
