"""
Service KPI Exposition — exposition par pays, par branche, top risques.
Règle Métier #5 : EXPOSITION = SUM_INSURED_100 × SHARE_SIGNED / 100
"""
import pandas as pd
from typing import List, Dict, Any


def _compute_exposition_col(df: pd.DataFrame) -> pd.DataFrame:
    """Ajoute la colonne 'exposition' au DataFrame. Formule unique — Règle #5."""
    df = df.copy()
    df["SUM_INSURED_100"] = pd.to_numeric(df["SUM_INSURED_100"], errors="coerce").fillna(0)
    df["SHARE_SIGNED"] = pd.to_numeric(df["SHARE_SIGNED"], errors="coerce").fillna(0)
    df["SUBJECT_PREMIUM"] = pd.to_numeric(df["SUBJECT_PREMIUM"], errors="coerce").fillna(0)
    df["WRITTEN_PREMIUM"] = pd.to_numeric(df["WRITTEN_PREMIUM"], errors="coerce").fillna(0)
    df["exposition"] = df["SUM_INSURED_100"] * df["SHARE_SIGNED"] / 100
    return df


def compute_exposition_by_country(df: pd.DataFrame) -> list:
    """Exposition agrégée par pays risque."""
    if df.empty or "PAYS_RISQUE" not in df.columns:
        return []
    df = _compute_exposition_col(df)
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


def compute_exposition_by_branch(df: pd.DataFrame) -> list:
    """Exposition agrégée par branche d'assurance."""
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []
    df = _compute_exposition_col(df)
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


def compute_top_risks(df: pd.DataFrame, top: int = 20) -> list:
    """Top N risques individuels par exposition."""
    if df.empty:
        return []
    df = _compute_exposition_col(df)
    df["ULR"] = pd.to_numeric(df["ULR"], errors="coerce").fillna(0)
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
