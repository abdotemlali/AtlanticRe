"""
Service KPI Country — performance par pays, profil marché, profil pays.
"""
import pandas as pd
from typing import Optional, List, Dict, Any

from services.data_service import compute_kpi_summary
from services.kpi_helpers import safe_mean


def compute_kpis_by_country(
    df: pd.DataFrame,
    selected_list: Optional[List[str]],
    top: int = 10,
) -> list:
    """Top pays par prime écrite, avec sélection prioritaire."""
    if df.empty or "PAYS_RISQUE" not in df.columns:
        return []

    all_results = []
    for pays, group in df.groupby("PAYS_RISQUE"):
        if not pays:
            continue
        kpis = compute_kpi_summary(group)
        is_sel = bool(selected_list and str(pays).strip() in selected_list)
        all_results.append({"pays": pays, "is_selected": is_sel, **kpis})

    all_results.sort(key=lambda x: x["total_written_premium"], reverse=True)

    if selected_list:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["total_written_premium"], reverse=True)
        return final

    return all_results[:top]


def compute_market_profile(df: pd.DataFrame, pays: str, branche: str) -> Dict[str, Any]:
    """Profil d'un marché (pays × branche)."""
    group = df[(df["PAYS_RISQUE"] == pays) & (df["INT_BRANCHE"] == branche)]
    if group.empty:
        return {}
    kpis = compute_kpi_summary(group)
    return {
        **kpis,
        "pays": pays,
        "branche": branche,
        "avg_share_signed": safe_mean(group, "SHARE_SIGNED"),
        "avg_commission": safe_mean(group, "COMMI"),
        "avg_profit_comm_rate": safe_mean(group, "PROFIT_COMM_RATE"),
        "avg_brokerage_rate": safe_mean(group, "BROKERAGE_RATE"),
    }


def compute_market_by_year(df: pd.DataFrame, pays: str, branche: str) -> list:
    """Évolution temporelle d'un marché (pays × branche)."""
    group = df[(df["PAYS_RISQUE"] == pays) & (df["INT_BRANCHE"] == branche)]
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


def compute_country_profile(df: pd.DataFrame, pays: str) -> Dict[str, Any]:
    """Profil global d'un pays risque."""
    group = df[df["PAYS_RISQUE"] == pays]
    if group.empty:
        return {}
    kpis = compute_kpi_summary(group)
    return {
        **kpis,
        "pays": pays,
        "avg_share_signed": safe_mean(group, "SHARE_SIGNED"),
        "avg_commission": safe_mean(group, "COMMI"),
        "avg_profit_comm_rate": safe_mean(group, "PROFIT_COMM_RATE"),
        "avg_brokerage_rate": safe_mean(group, "BROKERAGE_RATE"),
    }


def compute_country_by_year(df: pd.DataFrame, pays: str) -> list:
    """Évolution temporelle d'un pays."""
    group = df[df["PAYS_RISQUE"] == pays]
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


def compute_country_by_branch(df: pd.DataFrame, pays: str) -> list:
    """Répartition par branche pour un pays."""
    group = df[df["PAYS_RISQUE"] == pays]
    if group.empty:
        return []
    result = []
    for branche, br_group in group.groupby("INT_BRANCHE"):
        if not branche:
            continue
        kpis = compute_kpi_summary(br_group)
        result.append({
            "branche": branche,
            **kpis,
            "avg_commission": safe_mean(br_group, "COMMI"),
            "avg_brokerage_rate": safe_mean(br_group, "BROKERAGE_RATE"),
            "avg_profit_comm_rate": safe_mean(br_group, "PROFIT_COMM_RATE"),
        })
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result


def compute_by_country_contract_type(df: pd.DataFrame) -> list:
    """Répartition FAC vs TREATY par pays."""
    if df.empty or "PAYS_RISQUE" not in df.columns or "TYPE_OF_CONTRACT" not in df.columns:
        return []

    df = df.copy()
    df["TYPE_CLEAN"] = df["TYPE_OF_CONTRACT"].fillna("").astype(str)
    df["ContractMode"] = "TREATY"
    df.loc[df["TYPE_CLEAN"].str.upper().str.contains("FAC", na=False), "ContractMode"] = "FAC"

    result = []
    for pays, group in df.groupby("PAYS_RISQUE"):
        if not pays:
            continue
        total_prime = float(group["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in group.columns else 0.0

        fac_group = group[group["ContractMode"] == "FAC"]
        treaty_group = group[group["ContractMode"] == "TREATY"]

        fac_prime = float(fac_group["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in fac_group.columns else 0.0
        treaty_prime = float(treaty_group["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in treaty_group.columns else 0.0

        result.append({
            "pays": pays,
            "total_written_premium": round(total_prime, 2),
            "fac_written_premium": round(fac_prime, 2),
            "treaty_written_premium": round(treaty_prime, 2),
            "fac_contract_count": int(len(fac_group)),
            "treaty_contract_count": int(len(treaty_group)),
            "total_contract_count": len(group),
        })

    return sorted(result, key=lambda x: x["total_written_premium"], reverse=True)
