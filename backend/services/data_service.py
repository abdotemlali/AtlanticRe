import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import logging

import core.config as config
from models.schemas import FilterParams

logger = logging.getLogger(__name__)

# ── In-Memory Cache ───────────────────────────────────────────────────────────
_df: Optional[pd.DataFrame] = None
_last_loaded: Optional[datetime] = None
_row_count: int = 0


def _parse_int_spc(df: pd.DataFrame) -> pd.DataFrame:
    """Parse INT_SPC column into perimetre, type_spc, and specialite."""
    if "INT_SPC" not in df.columns:
        df["INT_SPC_PERIMETRE"] = ""
        df["INT_SPC_TYPE"] = ""
        df["INT_SPC_SPECIALITE"] = ""
        return df

    def parse_spc(val):
        if pd.isna(val) or not isinstance(val, str):
            return ("", "", "")
        parts = val.split("-", 2)
        perimetre = parts[0].strip() if len(parts) > 0 else ""
        type_spc = parts[1].strip() if len(parts) > 1 else ""
        specialite = parts[2].strip() if len(parts) > 2 else ""
        return (perimetre, type_spc, specialite)

    parsed = df["INT_SPC"].apply(parse_spc)
    df["INT_SPC_PERIMETRE"] = parsed.apply(lambda x: x[0])
    df["INT_SPC_TYPE"] = parsed.apply(lambda x: x[1])
    df["INT_SPC_SPECIALITE"] = parsed.apply(lambda x: x[2])
    return df


def _safe_numeric(df: pd.DataFrame, cols: list) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def _safe_date(df: pd.DataFrame, cols: list) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce", dayfirst=True, format="mixed")
    return df


def load_excel(file_path: str = None) -> Dict[str, Any]:
    global _df, _last_loaded, _row_count

    path = file_path or config.EXCEL_FILE_PATH

    if not Path(path).exists():
        raise FileNotFoundError(f"Fichier Excel introuvable : {path}")

    logger.info(f"Chargement du fichier Excel : {path}")
    raw = pd.read_excel(path, sheet_name=config.EXCEL_SHEET_NAME, dtype=str)

    numeric_cols = [
        "SUBJECT_PREMIUM", "WRITTEN_PREMIUM", "SHARE_SIGNED", "SHARE_WRITTEN",
        "COMMISSION", "BROKERAGE1", "BROKERAGE_RATE", "COMMI", "ULR",
        "ULTIMATE_LOSS_RATIO", "RESULTAT", "SUM_INSURED", "SUM_INSURED_100",
        "PROFIT_COMM_RATE", "WRITTEN_PREMIUM_WHOLE", "UNDERWRITING_YEAR"
    ]
    date_cols = ["INCEPTION_DATE", "EXPIRY_DATE", "DATE_SAISIE1", "DATE_CONFIRMED",
                 "DATE_CLOSED", "DATE_CANCELLED"]

    raw = _safe_numeric(raw, numeric_cols)
    raw = _safe_date(raw, date_cols)
    raw = _parse_int_spc(raw)

    # Normalize string columns
    str_cols = ["CONTRACT_STATUS", "TYPE_OF_CONTRACT", "INT_BROKER", "BROKER_CODE",
                "INT_CEDANTE", "CEDANT_CODE", "INT_PAYS_COURTIER", "PAYS_CEDANTE",
                "PAYS_RISQUE", "INT_BRANCHE", "INT_SBRANCHE", "INT_SPC",
                "CONTRACT_NUMBER"]
    for col in str_cols:
        if col in raw.columns:
            raw[col] = raw[col].fillna("").astype(str).str.strip()

    _df = raw
    _last_loaded = datetime.now()
    _row_count = len(_df)
    logger.info(f"Chargement réussi : {_row_count} lignes, {len(_df.columns)} colonnes")
    return {"row_count": _row_count, "last_loaded": _last_loaded.isoformat()}


def get_df() -> pd.DataFrame:
    if _df is None:
        try:
            load_excel()
        except Exception as e:
            logger.error(f"Impossible de charger le fichier Excel : {e}")
            # Return empty DataFrame with expected columns
            return pd.DataFrame()
    return _df.copy()


def get_status() -> Dict[str, Any]:
    return {
        "loaded": _df is not None,
        "last_loaded": _last_loaded.isoformat() if _last_loaded else None,
        "row_count": _row_count,
        "file_path": config.EXCEL_FILE_PATH,
    }


def apply_filters(df: pd.DataFrame, params: FilterParams) -> pd.DataFrame:
    """Apply all filters cumulatively on the DataFrame."""
    if df.empty:
        return df

    # INT_SPC decomposed filters
    if params.perimetre:
        df = df[df["INT_SPC_PERIMETRE"].isin(params.perimetre)]
    if params.type_contrat_spc:
        df = df[df["INT_SPC_TYPE"].isin(params.type_contrat_spc)]
    if params.specialite:
        df = df[df["INT_SPC_SPECIALITE"].isin(params.specialite)]
    if params.int_spc_search:
        df = df[df["INT_SPC"].str.contains(params.int_spc_search, case=False, na=False)]

    # Business filters
    if params.branche:
        df = df[df["INT_BRANCHE"].isin(params.branche)]
    if params.sous_branche:
        df = df[df["INT_SBRANCHE"].isin(params.sous_branche)]
    if params.pays_risque:
        df = df[df["PAYS_RISQUE"].isin(params.pays_risque)]
    if params.pays_cedante:
        df = df[df["PAYS_CEDANTE"].isin(params.pays_cedante)]
    if params.courtier:
        df = df[df["INT_BROKER"].isin(params.courtier)]
    if params.cedante:
        df = df[df["INT_CEDANTE"].isin(params.cedante)]

    # UW Year
    if params.underwriting_years:
        df = df[df["UNDERWRITING_YEAR"].isin(params.underwriting_years)]
    if params.uw_year_min is not None:
        df = df[df["UNDERWRITING_YEAR"] >= params.uw_year_min]
    if params.uw_year_max is not None:
        df = df[df["UNDERWRITING_YEAR"] <= params.uw_year_max]

    # Status & type
    if params.statuts:
        df = df[df["CONTRACT_STATUS"].isin(params.statuts)]
    if params.type_of_contract:
        df = df[df["TYPE_OF_CONTRACT"].isin(params.type_of_contract)]

    # Financial range filters
    if params.prime_min is not None:
        df = df[df["WRITTEN_PREMIUM"].fillna(0) >= params.prime_min]
    if params.prime_max is not None:
        df = df[df["WRITTEN_PREMIUM"].fillna(0) <= params.prime_max]
    if params.ulr_min is not None:
        df = df[df["ULR"].fillna(0) >= params.ulr_min]
    if params.ulr_max is not None:
        df = df[df["ULR"].fillna(0) <= params.ulr_max]
    if params.share_min is not None:
        df = df[df["SHARE_WRITTEN"].fillna(0) >= params.share_min]
    if params.share_max is not None:
        df = df[df["SHARE_WRITTEN"].fillna(0) <= params.share_max]
    if params.commission_min is not None:
        df = df[df["COMMI"].fillna(0) >= params.commission_min]
    if params.commission_max is not None:
        df = df[df["COMMI"].fillna(0) <= params.commission_max]
    if params.courtage_min is not None:
        df = df[df["BROKERAGE_RATE"].fillna(0) >= params.courtage_min]
    if params.courtage_max is not None:
        df = df[df["BROKERAGE_RATE"].fillna(0) <= params.courtage_max]

    return df


def _sanitize(v):
    """Replace NaN/Inf floats with 0.0 for JSON serialization."""
    if isinstance(v, float) and (v != v or v == float('inf') or v == float('-inf')):
        return 0.0
    return v


def compute_kpi_summary(df: pd.DataFrame) -> Dict[str, Any]:
    total_wp = float(df["WRITTEN_PREMIUM"].sum() if "WRITTEN_PREMIUM" in df.columns else 0)
    total_res = float(df["RESULTAT"].sum() if "RESULTAT" in df.columns else 0)
    total_si = float(df["SUM_INSURED"].sum() if "SUM_INSURED" in df.columns else 0)

    # Weighted average ULR
    if "ULR" in df.columns and "WRITTEN_PREMIUM" in df.columns:
        wp = df["WRITTEN_PREMIUM"].fillna(0)
        ulr = df["ULR"].fillna(0)
        total_weight = wp.sum()
        avg_ulr = float((ulr * wp).sum() / total_weight) if total_weight > 0 else float(ulr.mean())
    else:
        avg_ulr = 0.0

    if pd.isna(avg_ulr):
        avg_ulr = 0.0
    if pd.isna(total_wp):
        total_wp = 0.0
    if pd.isna(total_res):
        total_res = 0.0
    if pd.isna(total_si):
        total_si = 0.0

    ratio_resultat_prime = round(total_res / total_wp * 100, 2) if total_wp != 0 else 0.0

    return {
        "total_written_premium": round(_sanitize(total_wp), 2),
        "total_resultat": round(_sanitize(total_res), 2),
        "avg_ulr": round(_sanitize(avg_ulr), 2),
        "total_sum_insured": round(_sanitize(total_si), 2),
        "contract_count": len(df),
        "ratio_resultat_prime": ratio_resultat_prime,
    }


def get_filter_options(df: pd.DataFrame) -> Dict[str, Any]:
    def unique_sorted(series):
        return sorted([v for v in series.dropna().unique().tolist() if str(v).strip()])

    perimetre = unique_sorted(df["INT_SPC_PERIMETRE"]) if "INT_SPC_PERIMETRE" in df.columns else []
    type_spc = unique_sorted(df["INT_SPC_TYPE"]) if "INT_SPC_TYPE" in df.columns else []
    specialite = unique_sorted(df["INT_SPC_SPECIALITE"]) if "INT_SPC_SPECIALITE" in df.columns else []
    branc = unique_sorted(df["INT_BRANCHE"]) if "INT_BRANCHE" in df.columns else []

    # Sous-branche cascaded by branche
    sous_branche = {}
    if "INT_BRANCHE" in df.columns and "INT_SBRANCHE" in df.columns:
        for br in branc:
            sub = df[df["INT_BRANCHE"] == br]["INT_SBRANCHE"]
            sous_branche[br] = sorted([v for v in sub.dropna().unique().tolist() if str(v).strip()])

    return {
        "perimetre": perimetre,
        "type_contrat_spc": type_spc,
        "specialite": specialite,
        "branc": branc,
        "sous_branche": sous_branche,
        "pays_risque": unique_sorted(df["PAYS_RISQUE"]) if "PAYS_RISQUE" in df.columns else [],
        "pays_cedante": unique_sorted(df["PAYS_CEDANTE"]) if "PAYS_CEDANTE" in df.columns else [],
        "courtiers": unique_sorted(df["INT_BROKER"]) if "INT_BROKER" in df.columns else [],
        "cedantes": unique_sorted(df["INT_CEDANTE"]) if "INT_CEDANTE" in df.columns else [],
        "underwriting_years": sorted([int(y) for y in df["UNDERWRITING_YEAR"].dropna().unique().tolist()]) if "UNDERWRITING_YEAR" in df.columns else [],
        "statuts": unique_sorted(df["CONTRACT_STATUS"]) if "CONTRACT_STATUS" in df.columns else [],
        "type_of_contract": unique_sorted(df["TYPE_OF_CONTRACT"]) if "TYPE_OF_CONTRACT" in df.columns else [],
    }
