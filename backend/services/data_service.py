import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import logging

import core.config as config
from models.schemas import FilterParams
from services.classification_rules import classify_cedante, classify_lob

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
    raw = pd.read_excel(path, sheet_name=0, dtype=str)

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

    # Derive TYPE_CEDANTE from cedante name (INT_CEDANTE) — same logic as Excel formula on col L
    # =SI(OU(
    #   DROITE(" "&MINUSCULE(SUPPRESPACE(L))...) = " re" | " ré"
    #   CHERCHE(" reinsurance"|" reins"|" réassurance" dans " "&MINUSCULE(SUPPRESPACE(L)))
    # ) → "Réassureur" ; sinon "Assureur direct"
    if "TYPE_CEDANTE" not in raw.columns:
        if "INT_CEDANTE" in raw.columns:
            raw["TYPE_CEDANTE"] = raw["INT_CEDANTE"].apply(classify_cedante)
        else:
            raw["TYPE_CEDANTE"] = "ASSUREUR DIRECT"

    # Derive VIE_NON_VIE if missing
    if "VIE_NON_VIE" not in raw.columns:
        if "INT_BRANCHE" in raw.columns:
            raw["VIE_NON_VIE"] = raw["INT_BRANCHE"].apply(classify_lob)
        else:
            raw["VIE_NON_VIE"] = "NON_VIE"

    # Normalize string columns
    str_cols = ["CONTRACT_STATUS", "TYPE_OF_CONTRACT", "INT_BROKER", "BROKER_CODE",
                "INT_CEDANTE", "CEDANT_CODE", "INT_PAYS_COURTIER", "PAYS_CEDANTE",
                "PAYS_RISQUE", "INT_BRANCHE", "INT_SBRANCHE", "INT_SPC",
                "CONTRACT_NUMBER"]
    for col in str_cols:
        if col in raw.columns:
            raw[col] = raw[col].fillna("").astype(str).str.strip()

    # ── Normalisation des noms de courtiers (SmartBrokerMatcher) ──
    # Optimisation : on matche uniquement les valeurs uniques (quelques centaines)
    # puis on mappe la colonne complète — évite N appels coûteux sur N lignes.
    if "INT_BROKER" in raw.columns:
        import time
        from services.broker_matching_service import get_broker_matcher

        matcher = get_broker_matcher()
        t0 = time.perf_counter()

        unique_names = raw["INT_BROKER"].dropna().unique().tolist()
        before_unique = len(unique_names)

        lookup: dict[str, str] = {}
        for name in unique_names:
            if not name:
                lookup[name] = name
                continue
            result = matcher.match(name)
            if result["confidence"] == "Exact":
                lookup[name] = result["canonical"]
            else:
                lookup[name] = name

        raw["INT_BROKER"] = raw["INT_BROKER"].map(lambda v: lookup.get(v, v))
        after_unique = raw["INT_BROKER"].nunique()
        logger.info(
            f"[BrokerMatching] Normalisation terminée en {time.perf_counter() - t0:.2f}s — "
            f"{before_unique} → {after_unique} courtiers distincts."
        )

    # ── Normalisation des noms de cédantes (SmartCedanteMatcher) ──
    # Même pattern que les courtiers : match des valeurs uniques, Exact only.
    if "INT_CEDANTE" in raw.columns:
        import time as _time_ced
        from services.cedante_matching_service import get_cedante_matcher

        ced_matcher = get_cedante_matcher()
        t0_ced = _time_ced.perf_counter()

        unique_cedantes = raw["INT_CEDANTE"].dropna().unique().tolist()
        before_unique_ced = len(unique_cedantes)

        ced_lookup: dict[str, str] = {}
        for name in unique_cedantes:
            if not name:
                ced_lookup[name] = name
                continue
            result = ced_matcher.match(name)
            if result["confidence"] == "Exact":
                ced_lookup[name] = result["canonical"]
            else:
                ced_lookup[name] = name

        raw["INT_CEDANTE"] = raw["INT_CEDANTE"].map(lambda v: ced_lookup.get(v, v))
        after_unique_ced = raw["INT_CEDANTE"].nunique()
        logger.info(
            f"[CedanteMatching] Normalisation terminée en {_time_ced.perf_counter() - t0_ced:.2f}s — "
            f"{before_unique_ced} → {after_unique_ced} cédantes distinctes."
        )

    _df = raw
    _last_loaded = datetime.now()
    _row_count = len(_df)
    logger.info(f"Chargement réussi : {_row_count} lignes, {len(_df.columns)} colonnes")
    return {"row_count": _row_count, "last_loaded": _last_loaded.isoformat()}


def get_df() -> pd.DataFrame:
    """
    Retourne une référence au DataFrame global en lecture seule.
    Aucune copie complète n'est effectuée ici : pandas créera automatiquement
    de nouvelles instances (vues/df) lors de l'application des filtres successifs.
    """
    if _df is None:
        try:
            load_excel()
        except Exception as e:
            logger.error(f"Impossible de charger le fichier Excel : {e}")
            # Return empty DataFrame with expected columns
            return pd.DataFrame()
    return _df


def get_status() -> Dict[str, Any]:
    return {
        "loaded": _df is not None,
        "last_loaded": _last_loaded.isoformat() if _last_loaded else None,
        "row_count": _row_count,
        "file_path": config.EXCEL_FILE_PATH,
    }


def apply_identity_filters(df: pd.DataFrame, params: FilterParams) -> pd.DataFrame:
    """
    Filtres identitaires — représentent QUI est dans le portefeuille.
    Applique : années de souscription, cédante, courtier, périmètre, statuts, type_cedante.
    NE modifie PAS la nature des contrats retenus (branche, pays, etc.).
    Utilisé seul pour calculer les attributs globaux d'une cédante (diversification, type, etc.)
    """
    if df.empty:
        return df

    # Périmètre SPC
    if params.perimetre:
        df = df[df["INT_SPC_PERIMETRE"].isin(params.perimetre)]

    # Cédante & Courtier
    if params.cedante:
        df = df[df["INT_CEDANTE"].isin(params.cedante)]
    if params.courtier:
        df = df[df["INT_BROKER"].isin(params.courtier)]

    # Années de souscription — uw_years a la priorité sur uw_year_min/max
    if params.uw_years:
        df = df[df["UNDERWRITING_YEAR"].isin(params.uw_years)]
    elif params.uw_year_min is not None and params.uw_year_max is not None:
        df = df[
            (df["UNDERWRITING_YEAR"] >= params.uw_year_min) &
            (df["UNDERWRITING_YEAR"] <= params.uw_year_max)
        ]
    elif params.uw_year_min is not None:
        df = df[df["UNDERWRITING_YEAR"] >= params.uw_year_min]
    elif params.uw_year_max is not None:
        df = df[df["UNDERWRITING_YEAR"] <= params.uw_year_max]
    elif params.underwriting_years:
        df = df[df["UNDERWRITING_YEAR"].isin(params.underwriting_years)]

    # Statut contrat
    if params.statuts:
        df = df[df["CONTRACT_STATUS"].isin(params.statuts)]

    # Type cédante (colonne dérivée)
    if params.type_cedante:
        if "TYPE_CEDANTE" in df.columns:
            df = df[df["TYPE_CEDANTE"].isin(params.type_cedante)]

    return df


def apply_analysis_filters(df: pd.DataFrame, params: FilterParams) -> pd.DataFrame:
    """
    Filtres d'analyse — affinent la vue analytique (QUOI dans le portefeuille).
    Applique : branche, sous-branche, pays risque, pays cédante, type de contrat, spécialité.
    Ces filtres NE DOIVENT PAS être appliqués lors du calcul d'attributs globaux
    comme la diversification par branches ou le type de cédante.
    """
    if df.empty:
        return df

    # SPC decomposed (type & spécialité)
    if params.type_contrat_spc:
        df = df[df["INT_SPC_TYPE"].isin(params.type_contrat_spc)]
    if params.specialite:
        df = df[df["INT_SPC_SPECIALITE"].isin(params.specialite)]
    if params.int_spc_search:
        df = df[df["INT_SPC"].str.contains(params.int_spc_search, case=False, na=False)]

    # Branche & sous-branche
    if params.branche:
        df = df[df["INT_BRANCHE"].isin(params.branche)]
    if params.sous_branche:
        df = df[df["INT_SBRANCHE"].isin(params.sous_branche)]

    # Géographie
    if params.pays_risque:
        df = df[df["PAYS_RISQUE"].isin(params.pays_risque)]
    if params.pays_cedante:
        df = df[df["PAYS_CEDANTE"].isin(params.pays_cedante)]

    # Type de contrat
    if params.type_of_contract:
        df = df[df["TYPE_OF_CONTRACT"].isin(params.type_of_contract)]

    return df


def apply_financial_filters(df: pd.DataFrame, params: FilterParams) -> pd.DataFrame:
    """
    Filtres financiers — seuils numériques sur les indicateurs.
    Applique : prime, ULR, part souscrite, commission, courtage.
    """
    if df.empty:
        return df

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


def apply_filters(df: pd.DataFrame, params: FilterParams) -> pd.DataFrame:
    """
    Fonction composite rétrocompatible — enchaîne les trois couches de filtres dans l'ordre.
    Tous les endpoints existants continuent de fonctionner sans modification.
    Les routes nécessitant une vue partielle (ex: /cedante/profile) peuvent appeler
    apply_identity_filters() seul pour préserver les attributs globaux.
    """
    df = apply_identity_filters(df, params)
    df = apply_analysis_filters(df, params)
    df = apply_financial_filters(df, params)
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

    # UW Year default (most recent)
    uw_years = sorted([int(y) for y in df["UNDERWRITING_YEAR"].dropna().unique().tolist()]) if "UNDERWRITING_YEAR" in df.columns else []
    uw_year_default = int(df["UNDERWRITING_YEAR"].dropna().max()) if "UNDERWRITING_YEAR" in df.columns and not df["UNDERWRITING_YEAR"].dropna().empty else None

    # Type cédante options
    type_cedante_options = unique_sorted(df["TYPE_CEDANTE"]) if "TYPE_CEDANTE" in df.columns else []

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
        "underwriting_years": uw_years,
        "uw_year_default": uw_year_default,
        "statuts": unique_sorted(df["CONTRACT_STATUS"]) if "CONTRACT_STATUS" in df.columns else [],
        "type_of_contract": unique_sorted(df["TYPE_OF_CONTRACT"]) if "TYPE_OF_CONTRACT" in df.columns else [],
        "type_cedante_options": type_cedante_options,
    }
