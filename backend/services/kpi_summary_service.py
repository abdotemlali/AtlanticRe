"""
Service KPI Summary — calculs globaux et décomposition financière.
"""
import pandas as pd
from typing import Dict, Any


def compute_financial_breakdown(df: pd.DataFrame) -> Dict[str, Any]:
    """Décomposition financière complète du portefeuille filtré."""
    if df.empty:
        return {}

    def safe_sum(col: str) -> float:
        if col in df.columns:
            val = float(pd.to_numeric(df[col], errors="coerce").fillna(0).sum())
            return round(val, 2)
        return 0.0

    written_premium = safe_sum("WRITTEN_PREMIUM")
    commission = safe_sum("COMMISSION")
    brokerage = safe_sum("BROKERAGE1")
    profit_commission = safe_sum("PROFIT_COMMISSION")
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
