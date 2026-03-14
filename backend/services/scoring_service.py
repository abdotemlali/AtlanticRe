import pandas as pd
import numpy as np
from typing import List, Dict, Any
from models.schemas import ScoringCriterion, MarketScore


def _normalize_score(value: float, threshold: float, direction: str) -> float:
    """Normalize a KPI value to a 0-100 score based on threshold and direction."""
    if pd.isna(value):
        return 0.0

    if direction == "lower_is_better":
        # 100 when value = 0, 0 when value >= 2*threshold
        if threshold == 0:
            return 100.0 if value <= 0 else 0.0
        ratio = value / (threshold * 2) if threshold > 0 else 1.0
        score = max(0.0, 100.0 * (1 - ratio))
    else:  # higher_is_better
        # 100 when value >= threshold, 0 when value <= 0
        if threshold == 0:
            return 100.0 if value > 0 else 50.0
        ratio = value / threshold if threshold != 0 else 0
        score = min(100.0, max(0.0, 100.0 * ratio))

    return round(score, 2)


def compute_market_scores(
    df: pd.DataFrame,
    criteria: List[ScoringCriterion],
) -> List[MarketScore]:
    """Compute weighted market scores for each (PAYS_RISQUE, INT_BRANCHE) combination."""
    if df.empty:
        return []

    required_cols = {"PAYS_RISQUE", "INT_BRANCHE"}
    missing = required_cols - set(df.columns)
    if missing:
        return []

    # Map criterion keys to DataFrame columns
    col_map = {
        "ulr": "ULR",
        "written_premium": "WRITTEN_PREMIUM",
        "resultat": "RESULTAT",
        "commi": "COMMI",
        "share_written": "SHARE_WRITTEN",
    }

    grouped = df.groupby(["PAYS_RISQUE", "INT_BRANCHE"])
    results: List[MarketScore] = []

    for (pays, branche), group in grouped:
        if not pays or not branche:
            continue

        # Aggregate KPIs
        written_premium = float(group["WRITTEN_PREMIUM"].sum() if "WRITTEN_PREMIUM" in group.columns else 0)
        total_resultat = float(group["RESULTAT"].sum() if "RESULTAT" in group.columns else 0)

        # Weighted avg ULR
        if "ULR" in group.columns and "WRITTEN_PREMIUM" in group.columns:
            wp = group["WRITTEN_PREMIUM"].fillna(0)
            ulr_vals = group["ULR"].fillna(0)
            total_wp = wp.sum()
            avg_ulr = float((ulr_vals * wp).sum() / total_wp) if total_wp > 0 else float(ulr_vals.mean())
        else:
            avg_ulr = 0.0

        avg_commission = float(group["COMMI"].mean() if "COMMI" in group.columns else 0) or 0.0
        avg_share = float(group["SHARE_WRITTEN"].mean() if "SHARE_WRITTEN" in group.columns else 0) or 0.0
        contract_count = len(group)

        # KPI values map
        kpi_values = {
            "ulr": avg_ulr,
            "written_premium": written_premium,
            "resultat": total_resultat,
            "commi": avg_commission,
            "share_written": avg_share,
        }

        # Compute weighted score
        total_weight = sum(c.weight for c in criteria)
        if total_weight == 0:
            total_weight = 100

        weighted_score = 0.0
        for criterion in criteria:
            kpi_val = kpi_values.get(criterion.key, 0.0)
            norm_score = _normalize_score(kpi_val, criterion.threshold, criterion.direction)
            weighted_score += norm_score * (criterion.weight / total_weight)

        score = round(min(100.0, max(0.0, weighted_score)), 1)

        # Badge classification
        if score >= 70:
            badge = "ATTRACTIF"
        elif score >= 40:
            badge = "NEUTRE"
        else:
            badge = "A_EVITER"

        results.append(MarketScore(
            pays=str(pays),
            branche=str(branche),
            score=score,
            badge=badge,
            written_premium=round(written_premium, 2),
            avg_ulr=round(avg_ulr, 2),
            total_resultat=round(total_resultat, 2),
            avg_commission=round(avg_commission, 2),
            avg_share=round(avg_share, 2),
            contract_count=contract_count,
        ))

    # Sort by score descending
    results.sort(key=lambda x: x.score, reverse=True)
    return results
