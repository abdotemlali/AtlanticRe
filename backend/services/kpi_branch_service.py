"""
Service KPI Branch — performance par branche, spécialité, profit commission.
"""
import pandas as pd
from typing import List, Dict, Any

from services.data_service import compute_kpi_summary


def compute_kpis_by_branch(df: pd.DataFrame) -> list:
    """KPIs agrégés par branche d'assurance."""
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


def compute_kpis_by_specialite(df: pd.DataFrame) -> list:
    """Répartition FAC vs Traité (TTY + TTE) par prime écrite via INT_SPC_TYPE."""
    if df.empty or "INT_SPC_TYPE" not in df.columns:
        return []

    df = df.copy()
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


def compute_profit_commission_by_branch(df: pd.DataFrame) -> list:
    """Profit commission par branche."""
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []

    df = df.copy()
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
