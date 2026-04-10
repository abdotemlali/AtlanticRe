"""
Service KPI Year — évolution temporelle et répartition par type de contrat.
"""
import pandas as pd
from typing import List, Dict, Any

from services.data_service import compute_kpi_summary


def compute_kpis_by_year(df: pd.DataFrame) -> list:
    """KPIs agrégés par année de souscription."""
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


def compute_kpis_by_contract_type(df: pd.DataFrame) -> list:
    """KPIs agrégés par type de contrat (FAC, TREATY, etc.)."""
    if df.empty or "TYPE_OF_CONTRACT" not in df.columns:
        return []
    result = []
    for type_contrat, group in df.groupby("TYPE_OF_CONTRACT"):
        if not type_contrat:
            continue
        kpis = compute_kpi_summary(group)
        avg_commission = 0.0
        if "COMMI" in group.columns:
            val = pd.to_numeric(group["COMMI"], errors="coerce").mean()
            avg_commission = round(float(val), 2) if val == val else 0.0
        result.append({"type_contrat": type_contrat, "avg_commission": avg_commission, **kpis})
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result
