"""
Utilitaires partagés pour les services KPI.
Fonctions réutilisables par tous les services : sanitize, safe_mean, apply_view_filters.
"""
import pandas as pd
from typing import Optional


def _sanitize(v):
    """Replace NaN/Inf floats with 0.0 for JSON serialization."""
    if isinstance(v, float) and (v != v or v == float('inf') or v == float('-inf')):
        return 0.0
    return v


def safe_mean(df: pd.DataFrame, col: str) -> float:
    """Calcule la moyenne numérique d'une colonne, retourne 0.0 si NaN ou colonne absente."""
    if col not in df.columns:
        return 0.0
    val = pd.to_numeric(df[col], errors="coerce").mean()
    return round(float(val), 2) if not pd.isna(val) else 0.0


def apply_view_filters(
    df: pd.DataFrame,
    contract_type_view: Optional[str] = None,
    vie_non_vie_view: Optional[str] = None,
) -> pd.DataFrame:
    """
    Filtres de vue rapide : FAC/TREATY et VIE/NON_VIE.
    Ne modifie pas le DataFrame source (retourne une vue filtrée).
    """
    if contract_type_view == "FAC" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    elif contract_type_view == "TREATY" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[~df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    if vie_non_vie_view and vie_non_vie_view != "ALL" and "VIE_NON_VIE" in df.columns:
        df = df[df["VIE_NON_VIE"] == vie_non_vie_view]
    return df
