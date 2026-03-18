from fastapi import APIRouter, Depends, Query
from models.schemas import FilterParams
from routers.auth import get_current_user
from routers.kpis import parse_filter_params
from services.data_service import get_df, apply_filters, compute_kpi_summary

router = APIRouter()


def _get_market_kpis(df, pays: str, branche: str) -> dict:
    mask = (df["PAYS_RISQUE"] == pays) & (df["INT_BRANCHE"] == branche)
    group = df[mask]
    kpis = compute_kpi_summary(group)

    by_year = []
    if "UNDERWRITING_YEAR" in group.columns and not group.empty:
        yr_df = group[group["UNDERWRITING_YEAR"].notna()].copy()
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


def _get_country_kpis(df, pays: str) -> dict:
    group = df[df["PAYS_RISQUE"] == pays]
    kpis = compute_kpi_summary(group)

    by_year = []
    if "UNDERWRITING_YEAR" in group.columns and not group.empty:
        yr_df = group[group["UNDERWRITING_YEAR"].notna()].copy()
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
    df = get_df()
    df = apply_filters(df, filters)
    market_a = _get_market_kpis(df, market_a_pays, market_a_branche)
    market_b = _get_market_kpis(df, market_b_pays, market_b_branche)
    
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
    df = get_df()
    df = apply_filters(df, filters)
    market_a = _get_country_kpis(df, market_a_pays)
    market_b = _get_country_kpis(df, market_b_pays)
    
    radar_a, radar_b = _compute_radar(market_a, market_b)
    market_a["radar"] = radar_a
    market_b["radar"] = radar_b
    
    return {
        "market_a": market_a,
        "market_b": market_b,
    }

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
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)

    def get_cedante_kpis(cedante: str) -> dict:
        import numpy as np
        group = df[df["INT_CEDANTE"] == cedante].copy()
        if group.empty:
            return {
                "cedante": cedante, "pays_cedante": "",
                "written_premium": 0, "resultat": 0, "avg_ulr": 0,
                "sum_insured": 0, "contract_count": 0,
                "avg_commission": 0, "avg_share_signed": 0,
                "by_year": [], "radar": {}
            }
        
        kpis = compute_kpi_summary(group)
        
        def safe_mean(col):
            if col not in group.columns:
                return 0.0
            val = pd.to_numeric(group[col], errors="coerce").mean()
            return round(float(val), 2) if not pd.isna(val) else 0.0

        def safe_val(v):
            if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
                return 0.0
            return v

        pays_cedante = ""
        if "PAYS_CEDANTE" in group.columns:
            mode_val = group["PAYS_CEDANTE"].dropna().mode()
            pays_cedante = mode_val.iloc[0] if not mode_val.empty else ""

        by_year = []
        if "UNDERWRITING_YEAR" in group.columns:
            yr_df = group[group["UNDERWRITING_YEAR"].notna()].copy()
            yr_df["UNDERWRITING_YEAR"] = pd.to_numeric(yr_df["UNDERWRITING_YEAR"], errors="coerce")
            yr_df = yr_df[yr_df["UNDERWRITING_YEAR"].notna()]
            yr_df["UNDERWRITING_YEAR"] = yr_df["UNDERWRITING_YEAR"].astype(int)
            for year, yr_group in yr_df.groupby("UNDERWRITING_YEAR"):
                yr_kpis = compute_kpi_summary(yr_group)
                by_year.append({"year": int(year), **{k: safe_val(v) for k, v in yr_kpis.items()}})
            by_year.sort(key=lambda x: x["year"])

        return {
            "cedante": cedante,
            "pays_cedante": pays_cedante,
            "written_premium": safe_val(kpis.get("total_written_premium", 0)),
            "resultat": safe_val(kpis.get("total_resultat", 0)),
            "avg_ulr": safe_val(kpis.get("avg_ulr", 0)),
            "sum_insured": safe_val(kpis.get("total_sum_insured", 0)),
            "contract_count": kpis.get("contract_count", 0),
            "avg_commission": safe_mean("COMMI"),
            "avg_share_signed": safe_mean("SHARE_SIGNED"),
            "by_year": by_year,
        }

    kpis_a = get_cedante_kpis(cedante_a)
    kpis_b = get_cedante_kpis(cedante_b)

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
