import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import logging

import core.config as config

logger = logging.getLogger(__name__)

# ── In-Memory Cache ───────────────────────────────────────────────────────────
_fcm_df: Optional[pd.DataFrame] = None
_fcm_last_loaded: Optional[datetime] = None
_fcm_row_count: int = 0

# Mapping French/mixed headers → internal uppercase names
COLUMN_RENAME = {
    "Part Partenaire":      "PART_PARTENAIRE",
    "Prime Partenaire":     "PRIME_PARTENAIRE",
    "Engagement Partenaire": "ENGAGEMENT_PARTENAIRE",
}

NUMERIC_COLS = [
    "RETRO_PERCENTAGE", "PARTICIPATION_PERCENTAGE", "SECURITY_PERCENTAGE",
    "BROKERAGE_RATE_RETRO", "COMMISSION_RATE_RETRO",
    "OUR_OVERRIDER_COMM_RATE_RETRO", "OUR_OVERRIDER_COMM",
    "PART_PARTENAIRE", "PRIME_PARTENAIRE", "ENGAGEMENT_PARTENAIRE",
    "WRITTEN_PREMIUM",
]

TEXT_COLS = [
    "PARTICIPANT_CODE", "PARTICIPANT_NAME", "SECURITY_CODE", "SECURITY_NAME",
    "COMMISSION_BASIS", "INT_LOB", "INT_BRANCHE", "INT_CEDANTE",
    "TYPE_OF_CONTRACT", "PAYS_RISQUE",
]


def _sanitize(v):
    """Replace NaN/Inf floats with 0.0 for JSON serialization."""
    if isinstance(v, float) and (v != v or v == float('inf') or v == float('-inf')):
        return 0.0
    return v


def load_fcm_excel(file_path: str = None) -> Dict[str, Any]:
    """Charge le fichier Excel FCM Partenaires en mémoire — appelé au lifespan."""
    global _fcm_df, _fcm_last_loaded, _fcm_row_count

    path = file_path or config.FCM_PARTENAIRES_FILE_PATH
    if not Path(path).exists():
        raise FileNotFoundError(f"Fichier FCM Partenaires introuvable : {path}")

    logger.info(f"Chargement FCM Partenaires : {path}")
    df = pd.read_excel(path, sheet_name=0, dtype=str)

    # Strip whitespace from all column names (tolerancetypographique)
    df.columns = [c.strip() for c in df.columns]

    # Rename French/mixed headers → internal uppercase names
    df = df.rename(columns=COLUMN_RENAME)

    # Convert numeric columns
    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].astype(str).str.replace(",", ".").str.replace(" ", ""),
                errors="coerce"
            ).fillna(0.0)

    # UNDERWRITING_YEAR as integer
    if "UNDERWRITING_YEAR" in df.columns:
        df["UNDERWRITING_YEAR"] = pd.to_numeric(df["UNDERWRITING_YEAR"], errors="coerce").fillna(0).astype(int)

    # Normalize text columns
    for col in TEXT_COLS:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str).str.strip()

    # ── Normalisation des noms de cédantes (SmartCedanteMatcher) ──
    # Normalise INT_CEDANTE et SECURITY_NAME pour améliorer le croisement donneur/preneur.
    from services.cedante_matching_service import get_cedante_matcher
    import time as _time_ced

    ced_matcher = get_cedante_matcher()
    for col_name in ["INT_CEDANTE", "SECURITY_NAME"]:
        if col_name not in df.columns:
            continue
        t0_ced = _time_ced.perf_counter()
        unique_names = df[col_name].dropna().unique().tolist()
        before_unique = len(unique_names)

        ced_lookup: dict[str, str] = {}
        for name in unique_names:
            if not name:
                ced_lookup[name] = name
                continue
            result = ced_matcher.match(name)
            if result["confidence"] == "Exact":
                ced_lookup[name] = result["canonical"]
            else:
                ced_lookup[name] = name

        df[col_name] = df[col_name].map(lambda v: ced_lookup.get(v, v))
        after_unique = df[col_name].nunique()
        logger.info(
            f"[CedanteMatching] {col_name} normalisé en {_time_ced.perf_counter() - t0_ced:.2f}s — "
            f"{before_unique} → {after_unique} valeurs distinctes."
        )

    _fcm_df = df
    _fcm_last_loaded = datetime.now()
    _fcm_row_count = len(df)
    logger.info(f"FCM Partenaires chargé : {_fcm_row_count} lignes, {len(df.columns)} colonnes")
    return {"row_count": _fcm_row_count, "last_loaded": _fcm_last_loaded.isoformat()}


def get_fcm_df() -> pd.DataFrame:
    """Retourne le DataFrame FCM (lazy-loading si cache vide)."""
    if _fcm_df is None:
        try:
            load_fcm_excel()
        except Exception as e:
            logger.error(f"Impossible de charger FCM Partenaires : {e}")
            return pd.DataFrame()
    return _fcm_df


def get_fcm_status() -> Dict[str, Any]:
    return {
        "loaded": _fcm_df is not None,
        "last_loaded": _fcm_last_loaded.isoformat() if _fcm_last_loaded else None,
        "row_count": _fcm_row_count,
    }


def apply_fcm_filters(
    df: pd.DataFrame,
    uy: Optional[List[int]] = None,
    lob: Optional[str] = None,
    branche: Optional[str] = None,
    type_contrat: Optional[str] = None,
) -> pd.DataFrame:
    """Filtre local — branche/LOB/type ne modifient pas les attributs partenaires."""
    if df.empty:
        return df
    if uy:
        df = df[df["UNDERWRITING_YEAR"].isin(uy)]
    if lob and "INT_LOB" in df.columns:
        df = df[df["INT_LOB"] == lob]
    if branche and "INT_BRANCHE" in df.columns:
        df = df[df["INT_BRANCHE"] == branche]
    if type_contrat and "TYPE_OF_CONTRACT" in df.columns:
        df = df[df["TYPE_OF_CONTRACT"] == type_contrat]
    return df


def get_fcm_filter_options(df: pd.DataFrame) -> Dict[str, Any]:
    """Valeurs uniques pour les filtres locaux FAC-to-FAC."""
    def unique_sorted(series):
        return sorted([v for v in series.dropna().unique().tolist() if str(v).strip()])

    uy_list = sorted([int(y) for y in df["UNDERWRITING_YEAR"].dropna().unique().tolist()]) if "UNDERWRITING_YEAR" in df.columns else []

    return {
        "uy_list": uy_list,
        "lobs": unique_sorted(df["INT_LOB"]) if "INT_LOB" in df.columns else [],
        "branches": unique_sorted(df["INT_BRANCHE"]) if "INT_BRANCHE" in df.columns else [],
        "types_contrat": unique_sorted(df["TYPE_OF_CONTRACT"]) if "TYPE_OF_CONTRACT" in df.columns else [],
    }


# ── KPIs ──────────────────────────────────────────────────────────────────────

def get_kpis(df: pd.DataFrame) -> Dict[str, Any]:
    """5 KPIs globaux FAC-to-FAC."""
    if df.empty:
        return {
            "engagement_total": 0,
            "prime_partenaire_total": 0,
            "part_partenaire_moyen": 0,
            "prime_atlantic_re_total": 0,
            "nb_partenaires": 0,
        }

    engagement_total = float(df["ENGAGEMENT_PARTENAIRE"].sum())
    prime_partenaire_total = float(df["PRIME_PARTENAIRE"].sum())
    part_partenaire_moyen = float(df["PART_PARTENAIRE"].mean()) if len(df) > 0 else 0.0
    prime_atlantic_re_total = float(df["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in df.columns else 0.0
    nb_partenaires = int(df["SECURITY_NAME"].nunique())

    return {
        "engagement_total": round(_sanitize(engagement_total), 2),
        "prime_partenaire_total": round(_sanitize(prime_partenaire_total), 2),
        "part_partenaire_moyen": round(_sanitize(part_partenaire_moyen), 2),
        "prime_atlantic_re_total": round(_sanitize(prime_atlantic_re_total), 2),
        "nb_partenaires": nb_partenaires,
    }


# ── Vue Globale ───────────────────────────────────────────────────────────────

def get_evolution_primes(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Évolution des primes partenaire par année."""
    if df.empty or "UNDERWRITING_YEAR" not in df.columns:
        return []

    result = []
    for uy, grp in df.groupby("UNDERWRITING_YEAR"):
        result.append({
            "year": int(uy),
            "prime_partenaire": round(_sanitize(float(grp["PRIME_PARTENAIRE"].sum())), 2),
            "engagement_partenaire": round(_sanitize(float(grp["ENGAGEMENT_PARTENAIRE"].sum())), 2),
            "nb_contrats": int(len(grp)),
        })

    return sorted(result, key=lambda x: x["year"])


def get_primes_par_branche(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Primes partenaire agrégées par branche (INT_BRANCHE)."""
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []

    result = []
    for branche, grp in df.groupby("INT_BRANCHE"):
        if not str(branche).strip():
            continue
        result.append({
            "branche": str(branche),
            "prime_partenaire": round(_sanitize(float(grp["PRIME_PARTENAIRE"].sum())), 2),
            "nb_contrats": int(len(grp)),
        })

    return sorted(result, key=lambda x: x["prime_partenaire"], reverse=True)


def get_detail_branches(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Tableau détail par branche pour la Vue Globale."""
    if df.empty or "INT_BRANCHE" not in df.columns:
        return []

    result = []
    for branche, grp in df.groupby("INT_BRANCHE"):
        if not str(branche).strip():
            continue
        result.append({
            "branche": str(branche),
            "nb_contrats": int(len(grp)),
            "written_premium": round(_sanitize(float(grp["WRITTEN_PREMIUM"].sum())), 2) if "WRITTEN_PREMIUM" in grp.columns else 0,
            "prime_partenaire": round(_sanitize(float(grp["PRIME_PARTENAIRE"].sum())), 2),
            "engagement_partenaire": round(_sanitize(float(grp["ENGAGEMENT_PARTENAIRE"].sum())), 2),
            "part_partenaire_moy": round(_sanitize(float(grp["PART_PARTENAIRE"].mean())), 2),
        })

    return sorted(result, key=lambda x: x["prime_partenaire"], reverse=True)


# ── Vue Par Partenaire ────────────────────────────────────────────────────────

def get_top_partenaires_primes(df: pd.DataFrame, top_n: int = 10) -> List[Dict[str, Any]]:
    """Top N partenaires par Prime Partenaire."""
    if df.empty:
        return []

    agg = df.groupby("PARTICIPANT_NAME").agg(
        prime_partenaire=("PRIME_PARTENAIRE", "sum"),
    ).reset_index()

    result = []
    for _, row in agg.nlargest(top_n, "prime_partenaire").iterrows():
        result.append({
            "participant_name": str(row["PARTICIPANT_NAME"]),
            "prime_partenaire": round(_sanitize(float(row["prime_partenaire"])), 2),
        })
    return result


def get_top_partenaires_engagement(df: pd.DataFrame, top_n: int = 10) -> List[Dict[str, Any]]:
    """Top N partenaires par Engagement Partenaire."""
    if df.empty:
        return []

    agg = df.groupby("PARTICIPANT_NAME").agg(
        engagement_partenaire=("ENGAGEMENT_PARTENAIRE", "sum"),
    ).reset_index()

    result = []
    for _, row in agg.nlargest(top_n, "engagement_partenaire").iterrows():
        result.append({
            "participant_name": str(row["PARTICIPANT_NAME"]),
            "engagement_partenaire": round(_sanitize(float(row["engagement_partenaire"])), 2),
        })
    return result


def get_taux_part_moyen(df: pd.DataFrame, top_n: int = 15) -> List[Dict[str, Any]]:
    """Taux de part moyen par partenaire (MEAN Part Partenaire)."""
    if df.empty:
        return []

    agg = df.groupby("PARTICIPANT_NAME").agg(
        part_moy=("PART_PARTENAIRE", "mean"),
        nb_contrats=("PARTICIPANT_NAME", "count"),
    ).reset_index()

    result = []
    for _, row in agg.nlargest(top_n, "part_moy").iterrows():
        result.append({
            "participant_name": str(row["PARTICIPANT_NAME"]),
            "part_moy": round(_sanitize(float(row["part_moy"])), 2),
            "nb_contrats": int(row["nb_contrats"]),
        })
    return result


def get_tableau_partenaires(df: pd.DataFrame, df_contrats: pd.DataFrame) -> List[Dict[str, Any]]:
    """Tableau complet par partenaire — OUTER JOIN preneurs (FCM) × donneurs (Template).

    Preneur  = SECURITY_NAME dans FCM_PARTENAIRES_FILE_PATH (reçoit des parts d'Atlantic Re)
    Donneur  = INT_CEDANTE dans EXCEL_FILE_PATH (cède des risques à Atlantic Re)
    Double   = présent dans les deux fichiers
    """
    # ── Preneurs : FCM groupé par SECURITY_NAME ───────────────────────────
    preneur_agg = pd.DataFrame(columns=["company", "nb_contrats", "prime_partenaire", "engagement_partenaire", "part_partenaire_moy"])
    if not df.empty and "SECURITY_NAME" in df.columns:
        df_sec = df[df["SECURITY_NAME"].str.strip() != ""]
        if not df_sec.empty:
            preneur_agg = df_sec.groupby("SECURITY_NAME").agg(
                nb_contrats=("SECURITY_NAME", "count"),
                prime_partenaire=("PRIME_PARTENAIRE", "sum"),
                engagement_partenaire=("ENGAGEMENT_PARTENAIRE", "sum"),
                part_partenaire_moy=("PART_PARTENAIRE", "mean"),
            ).reset_index().rename(columns={"SECURITY_NAME": "company"})

    # ── Donneurs : tous les INT_CEDANTE du Template (EXCEL_FILE_PATH) ─────
    donneur_agg = pd.DataFrame(columns=["company", "prime_donnee", "nb_contrats_donnes"])
    if not df_contrats.empty and "INT_CEDANTE" in df_contrats.columns:
        ced_df = df_contrats[df_contrats["INT_CEDANTE"].fillna("").str.strip() != ""]
        if not ced_df.empty:
            agg_kwargs = {"nb_contrats_donnes": ("INT_CEDANTE", "count")}
            if "WRITTEN_PREMIUM" in ced_df.columns:
                agg_kwargs["prime_donnee"] = ("WRITTEN_PREMIUM", "sum")
            donneur_agg = ced_df.groupby("INT_CEDANTE").agg(**agg_kwargs).reset_index().rename(columns={"INT_CEDANTE": "company"})
            if "prime_donnee" not in donneur_agg.columns:
                donneur_agg["prime_donnee"] = 0.0

    # ── OUTER JOIN ────────────────────────────────────────────────────────
    if preneur_agg.empty and donneur_agg.empty:
        return []

    merged = pd.merge(preneur_agg, donneur_agg, on="company", how="outer").fillna(0)

    result = []
    for _, row in merged.iterrows():
        name = str(row["company"])
        if not name.strip():
            continue

        is_preneur = float(row["nb_contrats"]) > 0
        is_donneur = float(row["nb_contrats_donnes"]) > 0
        if not is_preneur and not is_donneur:
            continue
        role = "double" if is_preneur and is_donneur else "donneur" if is_donneur else "preneur"

        result.append({
            "security_name": name,
            "nb_contrats": int(row["nb_contrats"]),
            "prime_partenaire": round(_sanitize(float(row["prime_partenaire"])), 2),
            "engagement_partenaire": round(_sanitize(float(row["engagement_partenaire"])), 2),
            "part_partenaire_moy": round(_sanitize(float(row["part_partenaire_moy"])), 2),
            "role": role,
            "role_donneur": is_donneur,
            "prime_donnee": round(_sanitize(float(row["prime_donnee"])), 2) if is_donneur else None,
            "nb_contrats_donnes": int(row["nb_contrats_donnes"]) if is_donneur else 0,
        })

    return sorted(result, key=lambda x: x["prime_partenaire"] + (x["prime_donnee"] or 0), reverse=True)


def get_crossing_donneur_preneur(df_fcm: pd.DataFrame, df_contrats: pd.DataFrame) -> List[Dict[str, Any]]:
    """Croisement Donneurs × Preneurs — aucun filtre, données globales.

    Donneur  = entreprise qui cède des risques FAC à Atlantic Re (Template_data, INT_SPC contient FAC)
    Preneur  = entreprise qui reçoit des parts des risques FAC d'Atlantic Re (FCM, SECURITY_NAME)
    Dual-rôle = présente dans les deux sources (jointure exacte INT_CEDANTE == SECURITY_NAME)
    """
    if df_fcm.empty or "SECURITY_NAME" not in df_fcm.columns:
        return []

    # Preneurs: FCM groupé par SECURITY_NAME
    preneur_agg = df_fcm[df_fcm["SECURITY_NAME"].str.strip() != ""].groupby("SECURITY_NAME").agg(
        prime_recue=("PRIME_PARTENAIRE", "sum"),
        nb_contrats_recus=("SECURITY_NAME", "count"),
        engagement_total=("ENGAGEMENT_PARTENAIRE", "sum"),
    ).reset_index()

    # Donneurs: Template FAC groupé par INT_CEDANTE
    if df_contrats.empty or "INT_SPC" not in df_contrats.columns or "INT_CEDANTE" not in df_contrats.columns:
        return []

    fac_df = df_contrats[df_contrats["INT_SPC"].fillna("").str.contains("FAC", case=False, na=False)]
    if fac_df.empty:
        return []

    donneur_agg = fac_df[fac_df["INT_CEDANTE"].fillna("").str.strip() != ""].groupby("INT_CEDANTE").agg(
        prime_donnee=("WRITTEN_PREMIUM", "sum"),
        nb_contrats_donnes=("INT_CEDANTE", "count"),
    ).reset_index()

    # Inner join — seules les entreprises présentes dans les deux sources
    merged = pd.merge(
        preneur_agg,
        donneur_agg,
        left_on="SECURITY_NAME",
        right_on="INT_CEDANTE",
        how="inner"
    )

    if merged.empty:
        return []

    result = []
    for _, row in merged.iterrows():
        result.append({
            "company_name": str(row["SECURITY_NAME"]),
            "prime_donnee": round(_sanitize(float(row["prime_donnee"])), 2),
            "prime_recue": round(_sanitize(float(row["prime_recue"])), 2),
            "nb_contrats_donnes": int(row["nb_contrats_donnes"]),
            "nb_contrats_recus": int(row["nb_contrats_recus"]),
            "engagement_total": round(_sanitize(float(row["engagement_total"])), 2),
        })

    return sorted(result, key=lambda x: x["prime_donnee"] + x["prime_recue"], reverse=True)
