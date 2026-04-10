"""
Service KPI Alerts — alertes ULR et saturation FAC.
Seuil ULR par défaut : 80%.
"""
import pandas as pd
from typing import List, Dict, Any

from services.data_service import compute_kpi_summary


def compute_ulr_alerts(df: pd.DataFrame, ulr_threshold: float = 80.0) -> list:
    """
    Identifie les combinaisons pays × branche dont l'ULR pondéré dépasse le seuil.
    """
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
