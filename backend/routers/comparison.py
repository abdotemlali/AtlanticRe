from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import get_df, apply_filters, apply_identity_filters, compute_kpi_summary

router = APIRouter()


def _strip_year_filter(df_raw, filters):
    """Return df filtered on everything EXCEPT year-related filters."""
    return apply_filters(df_raw, filters.model_copy(update={
        "uw_years": None,
        "uw_year_min": None,
        "uw_year_max": None,
        "underwriting_years": None,
    }))


def _get_market_kpis(df_filtered, df_all_years, pays: str, branche: str) -> dict:
    mask_filtered = (df_filtered["PAYS_RISQUE"] == pays) & (df_filtered["INT_BRANCHE"] == branche)
    group = df_filtered[mask_filtered]
    kpis = compute_kpi_summary(group)

    mask_all = (df_all_years["PAYS_RISQUE"] == pays) & (df_all_years["INT_BRANCHE"] == branche)
    group_all = df_all_years[mask_all]

    by_year = []
    if "UNDERWRITING_YEAR" in group_all.columns and not group_all.empty:
        yr_df = group_all[group_all["UNDERWRITING_YEAR"].notna()].copy()
        yr_df["UNDERWRITING_YEAR"] = yr_df["UNDERWRITING_YEAR"].astype(int)
        for year, yr_group in yr_df.groupby("UNDERWRITING_YEAR"):
            yr_kpis = compute_kpi_summary(yr_group)
            by_year.append({"year": int(year), **yr_kpis})
        by_year.sort(key=lambda x: x["year"])

    return {
        "pays": pays, "branche": branche,
        "written_premium": kpis["total_written_premium"],
        "resultat": kpis["total_resultat"],
        "avg_ulr": kpis["avg_ulr"],
        "sum_insured": kpis["total_sum_insured"],
        "contract_count": kpis["contract_count"],
        "avg_commission": float(group["COMMI"].mean() if "COMMI" in group.columns and len(group) > 0 else 0) or 0.0,
        "by_year": by_year,
    }


def _get_country_kpis(df_filtered, df_all_years, pays: str) -> dict:
    group = df_filtered[df_filtered["PAYS_RISQUE"] == pays]
    kpis = compute_kpi_summary(group)

    group_all = df_all_years[df_all_years["PAYS_RISQUE"] == pays]

    by_year = []
    if "UNDERWRITING_YEAR" in group_all.columns and not group_all.empty:
        yr_df = group_all[group_all["UNDERWRITING_YEAR"].notna()].copy()
        yr_df["UNDERWRITING_YEAR"] = yr_df["UNDERWRITING_YEAR"].astype(int)
        for year, yr_group in yr_df.groupby("UNDERWRITING_YEAR"):
            yr_kpis = compute_kpi_summary(yr_group)
            by_year.append({"year": int(year), **yr_kpis})
        by_year.sort(key=lambda x: x["year"])

    return {
        "pays": pays, "branche": "Toutes branches",
        "written_premium": kpis["total_written_premium"],
        "resultat": kpis["total_resultat"],
        "avg_ulr": kpis["avg_ulr"],
        "sum_insured": kpis["total_sum_insured"],
        "contract_count": kpis["contract_count"],
        "avg_commission": float(group["COMMI"].mean() if "COMMI" in group.columns and len(group) > 0 else 0) or 0.0,
        "by_year": by_year,
    }


def _format_branche_label(requested_branches: Optional[List[str]], available_branches: set) -> str:
    if not requested_branches:
        return "Toutes branches"
    req_set = set(requested_branches)
    
    if req_set == {"VIE"}:
        return "Vie"
        
    non_vie = available_branches - {"VIE"}
    if req_set == available_branches:
        return "Toutes branches"
    elif non_vie and req_set == non_vie:
        return "Non-Vie"
    else:
        return ", ".join(sorted(req_set))


# AJOUTÉ — helper pour KPIs d'un pays avec branches optionnelles
def _get_country_kpis_with_branches(df_filtered, df_all_years, pays: str, branches: Optional[List[str]] = None, vie_view: Optional[str] = None) -> dict:
    """Calcule les KPIs d'un pays, filtré optionnellement par branches et/ou Vie/Non-Vie."""
    group = df_filtered[df_filtered["PAYS_RISQUE"] == pays]
    group_all = df_all_years[df_all_years["PAYS_RISQUE"] == pays]

    available_branches = set(df_filtered[df_filtered["PAYS_RISQUE"] == pays]["INT_BRANCHE"].dropna().unique()) \
        if "INT_BRANCHE" in df_filtered.columns else set()

    # Filtre Vie / Non-Vie par pays (utilise VIE_NON_VIE combinant INT_BRANCHE + INT_SPC)
    if vie_view == "VIE" and "VIE_NON_VIE" in group.columns:
        group = group[group["VIE_NON_VIE"] == "VIE"]
        group_all = group_all[group_all["VIE_NON_VIE"] == "VIE"]
    elif vie_view == "NON_VIE" and "VIE_NON_VIE" in group.columns:
        group = group[group["VIE_NON_VIE"] == "NON_VIE"]
        group_all = group_all[group_all["VIE_NON_VIE"] == "NON_VIE"]

    # Filtre branche spécifique si fourni
    if branches:
        group = group[group["INT_BRANCHE"].isin(branches)]
        group_all = group_all[group_all["INT_BRANCHE"].isin(branches)]

    kpis = compute_kpi_summary(group)

    branche_label = _format_branche_label(branches, available_branches)

    by_year = []
    if "UNDERWRITING_YEAR" in group_all.columns and not group_all.empty:
        yr_df = group_all[group_all["UNDERWRITING_YEAR"].notna()].copy()
        yr_df["UNDERWRITING_YEAR"] = yr_df["UNDERWRITING_YEAR"].astype(int)
        for year, yr_group in yr_df.groupby("UNDERWRITING_YEAR"):
            yr_kpis = compute_kpi_summary(yr_group)
            by_year.append({"year": int(year), **yr_kpis})
        by_year.sort(key=lambda x: x["year"])

    return {
        "pays": pays,
        "branche": branche_label,
        "written_premium": kpis["total_written_premium"],
        "resultat": kpis["total_resultat"],
        "avg_ulr": kpis["avg_ulr"],
        "sum_insured": kpis["total_sum_insured"],
        "contract_count": kpis["contract_count"],
        "avg_commission": float(group["COMMI"].mean() if "COMMI" in group.columns and len(group) > 0 else 0) or 0.0,
        "by_year": by_year,
        "has_data": kpis["contract_count"] > 0,
    }


def _compute_radar(kpis_a: dict, kpis_b: dict) -> tuple:
    def norm(val, ref):
        return round(min(100, max(0, (val / ref) * 100 if ref else 0)), 1)
    
    fields = {
        "Prime écrite": ("written_premium", 1),
        "Résultat": ("resultat", 1),
        "Loss Ratio": (None, None),  # special case
        "Portefeuille": ("contract_count", 1),
        "Somme Assurée": ("sum_insured", 1),
    }
    
    radar_a, radar_b = {}, {}
    for label, (field, _) in fields.items():
        if label == "Loss Ratio":
            val_a = max(0, 100 - kpis_a["avg_ulr"])
            val_b = max(0, 100 - kpis_b["avg_ulr"])
        else:
            val_a = max(0, kpis_a[field])
            val_b = max(0, kpis_b[field])
        ref = max(val_a, val_b, 1)
        radar_a[label] = norm(val_a, ref)
        radar_b[label] = norm(val_b, ref)
    
    return radar_a, radar_b


@router.get("/markets")
def get_available_markets(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty:
        return []
    combos = df[["PAYS_RISQUE", "INT_BRANCHE"]].dropna().drop_duplicates()
    return [
        {"pays": row["PAYS_RISQUE"], "branche": row["INT_BRANCHE"]}
        for _, row in combos.iterrows()
        if row["PAYS_RISQUE"] and row["INT_BRANCHE"]
    ]


@router.get("")
def comparison(
    market_a_pays: str = Query(...),
    market_a_branche: str = Query(...),
    market_b_pays: str = Query(...),
    market_b_branche: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df_raw = get_df()
    df = apply_filters(df_raw, filters)
    df_all_years = _strip_year_filter(df_raw, filters)
    market_a = _get_market_kpis(df, df_all_years, market_a_pays, market_a_branche)
    market_b = _get_market_kpis(df, df_all_years, market_b_pays, market_b_branche)
    
    radar_a, radar_b = _compute_radar(market_a, market_b)
    market_a["radar"] = radar_a
    market_b["radar"] = radar_b
    
    return {
        "market_a": market_a,
        "market_b": market_b,
    }


@router.get("/by-country")
def comparison_by_country(
    market_a_pays: str = Query(...),
    market_b_pays: str = Query(...),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df_raw = get_df()
    df = apply_filters(df_raw, filters)
    df_all_years = _strip_year_filter(df_raw, filters)
    market_a = _get_country_kpis(df, df_all_years, market_a_pays)
    market_b = _get_country_kpis(df, df_all_years, market_b_pays)
    
    radar_a, radar_b = _compute_radar(market_a, market_b)
    market_a["radar"] = radar_a
    market_b["radar"] = radar_b
    
    return {
        "market_a": market_a,
        "market_b": market_b,
    }


# AJOUTÉ — Endpoint 1 : branches disponibles pour un pays donné
@router.get("/branches-by-country")
def get_branches_by_country(
    country: str = Query(..., description="Nom du pays risque"),
    spc_type: Optional[str] = Query(None, description="Filtre Type SPC : FAC, TTY ou TTE (comma-separated)"),
    contract_type: Optional[str] = Query(None, description="Filtre type de contrat (comma-separated)"),
    year: Optional[str] = Query(None, description="Années de souscription (comma-separated)"),
    _: dict = Depends(get_current_user),
):
    """
    Retourne la liste des branches disponibles pour un pays dans le dataset.
    Ignore le filtre branche global. Applique uniquement les filtres locaux
    (année, type contrat, type SPC) si fournis.
    """
    import pandas as pd
    df = get_df()

    if df.empty or "PAYS_RISQUE" not in df.columns:
        return []

    # Filtrer par pays
    df = df[df["PAYS_RISQUE"] == country]

    # Appliquer filtre année si fourni
    if year:
        years = [int(y.strip()) for y in year.split(",") if y.strip().isdigit()]
        if years and "UNDERWRITING_YEAR" in df.columns:
            df = df[df["UNDERWRITING_YEAR"].isin(years)]

    # Appliquer filtre type de contrat si fourni
    if contract_type:
        types = [t.strip() for t in contract_type.split(",") if t.strip()]
        if types and "TYPE_OF_CONTRACT" in df.columns:
            df = df[df["TYPE_OF_CONTRACT"].isin(types)]

    # Appliquer filtre type SPC si fourni
    if spc_type:
        spc_types = [s.strip() for s in spc_type.split(",") if s.strip()]
        if spc_types and "INT_SPC_TYPE" in df.columns:
            df = df[df["INT_SPC_TYPE"].isin(spc_types)]

    if df.empty or "INT_BRANCHE" not in df.columns:
        return []

    branches = sorted([
        b for b in df["INT_BRANCHE"].dropna().unique().tolist()
        if str(b).strip()
    ])
    return branches


# AJOUTÉ — Endpoint 2 : comparaison détaillée par pays avec branches par pays
@router.get("/by-country-detail")
def comparison_by_country_detail(
    country_1: str = Query(..., description="Pays 1"),
    country_2: str = Query(..., description="Pays 2"),
    branches_1: Optional[str] = Query(None, description="Branches du pays 1 (comma-separated, vide = toutes)"),
    branches_2: Optional[str] = Query(None, description="Branches du pays 2 (comma-separated, vide = toutes)"),
    year: Optional[str] = Query(None, description="Années de souscription (comma-separated)"),
    contract_type: Optional[str] = Query(None, description="Type de contrat (comma-separated)"),
    spc_type: Optional[str] = Query(None, description="Type SPC : FAC, TTY ou TTE (comma-separated)"),
    vie_non_vie_1: Optional[str] = Query(None, description="Filtre VIE ou NON_VIE pour le pays 1"),
    vie_non_vie_2: Optional[str] = Query(None, description="Filtre VIE ou NON_VIE pour le pays 2"),
    _: dict = Depends(get_current_user),
):
    """
    Comparaison détaillée entre deux pays avec sélection de branches indépendante par pays.
    Les filtres locaux (année, type contrat, type SPC) s'appliquent aux 2 blocs.
    Le filtre branche global est IGNORÉ — les branches sont gérées via branches_1/branches_2.
    Si branches_X est absent ou vide → toutes les branches du pays.
    """
    import pandas as pd

    df_raw = get_df()

    if df_raw.empty:
        return {"market_a": None, "market_b": None}

    # Construire le DataFrame filtré par les filtres LOCAUX uniquement (sans branche globale)
    df = df_raw.copy()

    # Filtre année local
    if year:
        years = [int(y.strip()) for y in year.split(",") if y.strip().isdigit()]
        if years and "UNDERWRITING_YEAR" in df.columns:
            df = df[df["UNDERWRITING_YEAR"].isin(years)]

    # Filtre type de contrat local
    if contract_type:
        types = [t.strip() for t in contract_type.split(",") if t.strip()]
        if types and "TYPE_OF_CONTRACT" in df.columns:
            df = df[df["TYPE_OF_CONTRACT"].isin(types)]

    # Filtre type SPC local
    if spc_type:
        spc_types = [s.strip() for s in spc_type.split(",") if s.strip()]
        if spc_types and "INT_SPC_TYPE" in df.columns:
            df = df[df["INT_SPC_TYPE"].isin(spc_types)]

    # df_all_years = df sans filtre année (pour le graphe évolution)
    df_all = df_raw.copy()
    if contract_type:
        types = [t.strip() for t in contract_type.split(",") if t.strip()]
        if types and "TYPE_OF_CONTRACT" in df_all.columns:
            df_all = df_all[df_all["TYPE_OF_CONTRACT"].isin(types)]
    if spc_type:
        spc_types = [s.strip() for s in spc_type.split(",") if s.strip()]
        if spc_types and "INT_SPC_TYPE" in df_all.columns:
            df_all = df_all[df_all["INT_SPC_TYPE"].isin(spc_types)]

    # Parser les branches par pays
    b1 = [b.strip() for b in branches_1.split(",") if b.strip()] if branches_1 else []
    b2 = [b.strip() for b in branches_2.split(",") if b.strip()] if branches_2 else []

    # Calculer les KPIs pour chaque pays avec leur scope Vie/Non-Vie individuel
    market_a = _get_country_kpis_with_branches(df, df_all, country_1, b1 if b1 else None, vie_view=vie_non_vie_1)
    market_b = _get_country_kpis_with_branches(df, df_all, country_2, b2 if b2 else None, vie_view=vie_non_vie_2)

    radar_a, radar_b = _compute_radar(market_a, market_b)
    market_a["radar"] = radar_a
    market_b["radar"] = radar_b

    return {
        "market_a": market_a,
        "market_b": market_b,
    }


@router.get("/branches-by-cedante")
def get_branches_by_cedante(
    cedante: str = Query(..., description="Nom de la cédante"),
    spc_type: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    _: dict = Depends(get_current_user),
):
    """Retourne la liste des branches disponibles pour une cédante. Le filtrage Vie/Non-Vie est géré côté client."""
    df = get_df()
    if df.empty or "INT_CEDANTE" not in df.columns:
        return []
    df = df[df["INT_CEDANTE"] == cedante]
    if year:
        years = [int(y.strip()) for y in year.split(",") if y.strip().isdigit()]
        if years and "UNDERWRITING_YEAR" in df.columns:
            df = df[df["UNDERWRITING_YEAR"].isin(years)]
    if contract_type:
        types = [t.strip() for t in contract_type.split(",") if t.strip()]
        if types and "TYPE_OF_CONTRACT" in df.columns:
            df = df[df["TYPE_OF_CONTRACT"].isin(types)]
    if spc_type:
        spc_types = [s.strip() for s in spc_type.split(",") if s.strip()]
        if spc_types and "INT_SPC_TYPE" in df.columns:
            df = df[df["INT_SPC_TYPE"].isin(spc_types)]
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []
    return sorted([b for b in df["INT_BRANCHE"].dropna().unique().tolist() if str(b).strip()])


@router.get("/cedantes")
def get_available_cedantes(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    if df.empty or "INT_CEDANTE" not in df.columns:
        return []
    cedantes = df[["INT_CEDANTE", "PAYS_CEDANTE"]].dropna(subset=["INT_CEDANTE"]).drop_duplicates()
    return [
        {"cedante": row["INT_CEDANTE"], "pays_cedante": row.get("PAYS_CEDANTE", "")}
        for _, row in cedantes.iterrows()
        if row["INT_CEDANTE"]
    ]


@router.get("/by-cedante")
def comparison_by_cedante(
    cedante_a: str = Query(...),
    cedante_b: str = Query(...),
    branches_a: Optional[str] = Query(None, description="Branches cédante A (comma-separated)"),
    branches_b: Optional[str] = Query(None, description="Branches cédante B (comma-separated)"),
    vie_non_vie_a: Optional[str] = Query(None, description="Filtre VIE ou NON_VIE pour cédante A"),
    vie_non_vie_b: Optional[str] = Query(None, description="Filtre VIE ou NON_VIE pour cédante B"),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df_raw = get_df()
    df_analysis = apply_filters(df_raw, filters)
    df_analysis_no_year = _strip_year_filter(df_raw, filters)
    df_identity = apply_identity_filters(df_raw, filters)

    br_a = [b.strip() for b in branches_a.split(",") if b.strip()] if branches_a else []
    br_b = [b.strip() for b in branches_b.split(",") if b.strip()] if branches_b else []

    def get_cedante_kpis(cedante: str, br_list: list, v_view: Optional[str]) -> dict:
        import numpy as np
        analysis_group = df_analysis[df_analysis["INT_CEDANTE"] == cedante].copy()
        identity_group = df_identity[df_identity["INT_CEDANTE"] == cedante].copy()
        available_branches = set(analysis_group["INT_BRANCHE"].dropna().unique()) if "INT_BRANCHE" in analysis_group.columns else set()

        # Filtres branche/scope appliqués UNIQUEMENT sur analysis_group → diversification immunisée
        if v_view == "VIE" and "VIE_NON_VIE" in analysis_group.columns:
            analysis_group = analysis_group[analysis_group["VIE_NON_VIE"] == "VIE"]
        elif v_view == "NON_VIE" and "VIE_NON_VIE" in analysis_group.columns:
            analysis_group = analysis_group[analysis_group["VIE_NON_VIE"] == "NON_VIE"]
        if br_list and "INT_BRANCHE" in analysis_group.columns:
            analysis_group = analysis_group[analysis_group["INT_BRANCHE"].isin(br_list)]

        branche_label = _format_branche_label(br_list, available_branches)

        if identity_group.empty:
            return {
                "cedante": cedante, "pays_cedante": "", "branche_label": branche_label,
                "written_premium": 0, "resultat": 0, "avg_ulr": 0,
                "sum_insured": 0, "contract_count": 0,
                "avg_commission": 0, "avg_share_signed": 0,
                "type_cedante": "",
                "branches_actives": 0,
                "fac_saturation_alerts": [],
                "active_branches": [],
                "by_year": [], "radar": {}
            }

        kpis = compute_kpi_summary(analysis_group) if not analysis_group.empty else compute_kpi_summary(identity_group)
        metric_group = analysis_group if not analysis_group.empty else identity_group
        
        def safe_mean(col):
            if col not in metric_group.columns:
                return 0.0
            val = pd.to_numeric(metric_group[col], errors="coerce").mean()
            return round(float(val), 2) if not pd.isna(val) else 0.0

        def safe_val(v):
            if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
                return 0.0
            return v

        pays_cedante = ""
        if "PAYS_CEDANTE" in identity_group.columns:
            mode_val = identity_group["PAYS_CEDANTE"].dropna().mode()
            pays_cedante = mode_val.iloc[0] if not mode_val.empty else ""

        type_cedante = ""
        if "TYPE_CEDANTE" in identity_group.columns:
            mode_type = identity_group["TYPE_CEDANTE"].dropna().mode()
            type_cedante = mode_type.iloc[0] if not mode_type.empty else ""

        # Attributs globaux (immunisés contre filtre branche et vue vie/non-vie)
        branch_sums = pd.Series(dtype=float)
        if "INT_BRANCHE" in identity_group.columns and "WRITTEN_PREMIUM" in identity_group.columns:
            branch_sums = identity_group.groupby("INT_BRANCHE")["WRITTEN_PREMIUM"].apply(
                lambda x: pd.to_numeric(x, errors="coerce").fillna(0).sum()
            )
            branches_actives = int((branch_sums > 0).sum())
        elif "INT_BRANCHE" in identity_group.columns:
            branches_actives = int(identity_group["INT_BRANCHE"].dropna().nunique())
        else:
            branches_actives = 0

        active_branches = []
        if not branch_sums.empty:
            active_branches = [
                {"branche": str(branche), "total_written_premium": float(total_prime)}
                for branche, total_prime in branch_sums.sort_values(ascending=False).items()
                if str(branche).strip() and float(total_prime) > 0
            ]

        fac_saturation_alerts = []
        has_type = "TYPE_OF_CONTRACT" in identity_group.columns
        has_spc_type = "INT_SPC_TYPE" in identity_group.columns
        if "INT_BRANCHE" in identity_group.columns and "WRITTEN_PREMIUM" in identity_group.columns and (has_type or has_spc_type):
            fac_mask = pd.Series(False, index=identity_group.index)
            if has_type:
                fac_mask = fac_mask | (identity_group["TYPE_OF_CONTRACT"] == "FAC")
            if has_spc_type:
                fac_mask = fac_mask | (identity_group["INT_SPC_TYPE"] == "FAC")
            fac_group = identity_group[fac_mask]
            for branche, br_df in fac_group.groupby("INT_BRANCHE"):
                count = len(br_df)
                prime = pd.to_numeric(br_df["WRITTEN_PREMIUM"], errors="coerce").fillna(0).sum()
                if count > 5 and prime > 1000000:
                    fac_saturation_alerts.append(str(branche))

        analysis_group_no_year = df_analysis_no_year[df_analysis_no_year["INT_CEDANTE"] == cedante].copy()
        
        # Appliquer les mêmes filtres de branche/scope à analysis_group_no_year pour le graph évolution
        if v_view == "VIE" and "VIE_NON_VIE" in analysis_group_no_year.columns:
            analysis_group_no_year = analysis_group_no_year[analysis_group_no_year["VIE_NON_VIE"] == "VIE"]
        elif v_view == "NON_VIE" and "VIE_NON_VIE" in analysis_group_no_year.columns:
            analysis_group_no_year = analysis_group_no_year[analysis_group_no_year["VIE_NON_VIE"] == "NON_VIE"]
        if br_list and "INT_BRANCHE" in analysis_group_no_year.columns:
            analysis_group_no_year = analysis_group_no_year[analysis_group_no_year["INT_BRANCHE"].isin(br_list)]

        by_year = []
        if "UNDERWRITING_YEAR" in analysis_group_no_year.columns:
            yr_df = analysis_group_no_year[analysis_group_no_year["UNDERWRITING_YEAR"].notna()].copy()
            yr_df["UNDERWRITING_YEAR"] = pd.to_numeric(yr_df["UNDERWRITING_YEAR"], errors="coerce")
            yr_df = yr_df.dropna(subset=["UNDERWRITING_YEAR"])
            yr_df["UNDERWRITING_YEAR"] = yr_df["UNDERWRITING_YEAR"].astype(int)
            for year, yr_group in yr_df.groupby("UNDERWRITING_YEAR"):
                yr_kpis = compute_kpi_summary(yr_group)
                by_year.append({
                    "year": int(year),
                    "total_written_premium": safe_val(yr_kpis.get("total_written_premium")),
                    "avg_ulr": safe_val(yr_kpis.get("avg_ulr")),
                    "total_resultat": safe_val(yr_kpis.get("total_resultat")),
                })
            by_year.sort(key=lambda x: x["year"])

        return {
            "cedante": cedante,
            "pays_cedante": pays_cedante,
            "branche_label": branche_label,
            "written_premium": safe_val(kpis.get("total_written_premium", 0)),
            "resultat": safe_val(kpis.get("total_resultat", 0)),
            "avg_ulr": safe_val(kpis.get("avg_ulr", 0)),
            "sum_insured": safe_val(kpis.get("total_sum_insured", 0)),
            "contract_count": kpis.get("contract_count", 0),
            "avg_commission": safe_mean("COMMI"),
            "avg_share_signed": safe_mean("SHARE_SIGNED"),
            "type_cedante": type_cedante,
            "branches_actives": branches_actives,
            "fac_saturation_alerts": fac_saturation_alerts,
            "active_branches": active_branches,
            "by_year": by_year,
        }

    kpis_a = get_cedante_kpis(cedante_a, br_a, vie_non_vie_a)
    kpis_b = get_cedante_kpis(cedante_b, br_b, vie_non_vie_b)

    def safe_val(val, default=0):
        return val if val is not None else default

    def norm(val_a, val_b):
        ref = max(abs(safe_val(val_a)), abs(safe_val(val_b)), 1)
        return lambda v: round(min(100, max(0, abs(safe_val(v)) / ref * 100)), 1)

    radar_a = {
        "Prime écrite": norm(kpis_a.get("written_premium"), kpis_b.get("written_premium"))(kpis_a.get("written_premium")),
        "Résultat": norm(kpis_a.get("resultat"), kpis_b.get("resultat"))(max(0, safe_val(kpis_a.get("resultat")))),
        "Loss Ratio": round(min(100, max(0, 100 - safe_val(kpis_a.get("avg_ulr")))), 1),
        "Portefeuille": norm(kpis_a.get("contract_count"), kpis_b.get("contract_count"))(kpis_a.get("contract_count")),
        "Part souscrite": norm(kpis_a.get("avg_share_signed"), kpis_b.get("avg_share_signed"))(kpis_a.get("avg_share_signed")),
    }
    radar_b = {
        "Prime écrite": norm(kpis_a.get("written_premium"), kpis_b.get("written_premium"))(kpis_b.get("written_premium")),
        "Résultat": norm(kpis_a.get("resultat"), kpis_b.get("resultat"))(max(0, safe_val(kpis_b.get("resultat")))),
        "Loss Ratio": round(min(100, max(0, 100 - safe_val(kpis_b.get("avg_ulr")))), 1),
        "Portefeuille": norm(kpis_a.get("contract_count"), kpis_b.get("contract_count"))(kpis_b.get("contract_count")),
        "Part souscrite": norm(kpis_a.get("avg_share_signed"), kpis_b.get("avg_share_signed"))(kpis_b.get("avg_share_signed")),
    }

    kpis_a["radar"] = radar_a
    kpis_b["radar"] = radar_b

    return {"cedante_a": kpis_a, "cedante_b": kpis_b}
