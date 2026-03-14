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

    def radar_norm(val, ref):
        return round(min(100, max(0, (val / ref) * 100 if ref != 0 else 0)), 1)

    radar = {
        "Prime écrite": radar_norm(kpis["total_written_premium"], 1_000_000),
        "Résultat": radar_norm(max(0, kpis["total_resultat"]), 500_000),
        "Loss Ratio": radar_norm(max(0, 100 - kpis["avg_ulr"]), 100),
        "Portefeuille": radar_norm(kpis["contract_count"], 100),
        "Somme Assurée": radar_norm(kpis["total_sum_insured"], 10_000_000),
    }

    return {
        "pays": pays, "branche": branche,
        "written_premium": kpis["total_written_premium"],
        "resultat": kpis["total_resultat"],
        "avg_ulr": kpis["avg_ulr"],
        "sum_insured": kpis["total_sum_insured"],
        "contract_count": kpis["contract_count"],
        "avg_commission": float(group["COMMI"].mean() if "COMMI" in group.columns and len(group) > 0 else 0) or 0.0,
        "by_year": by_year,
        "radar": radar,
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

    def radar_norm(val, ref):
        return round(min(100, max(0, (val / ref) * 100 if ref != 0 else 0)), 1)

    radar = {
        "Prime écrite": radar_norm(kpis["total_written_premium"], 1_000_000),
        "Résultat": radar_norm(max(0, kpis["total_resultat"]), 500_000),
        "Loss Ratio": radar_norm(max(0, 100 - kpis["avg_ulr"]), 100),
        "Portefeuille": radar_norm(kpis["contract_count"], 100),
        "Somme Assurée": radar_norm(kpis["total_sum_insured"], 10_000_000),
    }

    return {
        "pays": pays, "branche": "Toutes branches",
        "written_premium": kpis["total_written_premium"],
        "resultat": kpis["total_resultat"],
        "avg_ulr": kpis["avg_ulr"],
        "sum_insured": kpis["total_sum_insured"],
        "contract_count": kpis["contract_count"],
        "avg_commission": float(group["COMMI"].mean() if "COMMI" in group.columns and len(group) > 0 else 0) or 0.0,
        "by_year": by_year,
        "radar": radar,
    }


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
    return {
        "market_a": _get_market_kpis(df, market_a_pays, market_a_branche),
        "market_b": _get_market_kpis(df, market_b_pays, market_b_branche),
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
    return {
        "market_a": _get_country_kpis(df, market_a_pays),
        "market_b": _get_country_kpis(df, market_b_pays),
    }
