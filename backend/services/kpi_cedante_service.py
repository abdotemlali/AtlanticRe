"""
Service KPI Cédante — profil cédante (double-DataFrame), évolution, saturation FAC.
Règle Métier n°1 : compute_cedante_profile reçoit obligatoirement df_identity ET df_full.
"""
import pandas as pd
from typing import Optional, List, Dict, Any

from services.data_service import compute_kpi_summary
from services.kpi_helpers import safe_mean


def compute_kpis_by_cedante(
    df: pd.DataFrame,
    selected_list: Optional[List[str]],
    type_contrat_view: Optional[str],
    top: int = 10,
) -> list:
    """Top cédantes par prime écrite, avec sélection prioritaire."""
    if df.empty or "INT_CEDANTE" not in df.columns:
        return []

    # Compatibilité ancien paramètre type_contrat_view
    if type_contrat_view == "FAC" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]
    elif type_contrat_view == "TREATY" and "TYPE_OF_CONTRACT" in df.columns:
        df = df[~df["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)]

    all_results = []
    for cedante, group in df.groupby("INT_CEDANTE"):
        if not cedante:
            continue
        kpis = compute_kpi_summary(group)
        is_sel = bool(selected_list and str(cedante).strip() in selected_list)
        all_results.append({"cedante": cedante, "is_selected": is_sel, **kpis})
    all_results.sort(key=lambda x: x["total_written_premium"], reverse=True)

    if selected_list:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["total_written_premium"], reverse=True)
        return final

    return all_results[:top]


def compute_cedante_profile(
    cedante: str,
    df_identity: pd.DataFrame,
    df_full: pd.DataFrame,
    vie_non_vie_view: Optional[str],
    filters,
) -> Dict[str, Any]:
    """
    Profil cédante — Règle Métier n°1 (Double DataFrame).
    - df_identity : filtres identitaires uniquement → type cédante, branches actives, saturation FAC
    - df_full     : tous les filtres appliqués → KPIs financiers
    """
    identity_group_full = df_identity[df_identity["INT_CEDANTE"] == cedante]
    if identity_group_full.empty:
        return {}

    # Vue identitaire (optionnellement filtrée par Vie/Non-vie)
    identity_group_view = identity_group_full
    if vie_non_vie_view and "VIE_NON_VIE" in identity_group_view.columns:
        identity_group_view = identity_group_view[identity_group_view["VIE_NON_VIE"] == vie_non_vie_view]

    # ── Attributs globaux (calculés sur df_identity — jamais altérés par branche/pays)
    pays_cedante = identity_group_full["PAYS_CEDANTE"].mode().iloc[0] if "PAYS_CEDANTE" in identity_group_full.columns and not identity_group_full["PAYS_CEDANTE"].mode().empty else ""
    type_cedante = "ASSUREUR DIRECT"
    if "TYPE_CEDANTE" in identity_group_full.columns and not identity_group_full["TYPE_CEDANTE"].mode().empty:
        type_cedante = str(identity_group_full["TYPE_CEDANTE"].mode().iloc[0])

    # Diversification par branches (toujours sur identité complète)
    branches_actives = 0
    if "INT_BRANCHE" in identity_group_full.columns and "WRITTEN_PREMIUM" in identity_group_full.columns:
        branch_sums = identity_group_full.groupby("INT_BRANCHE")["WRITTEN_PREMIUM"].apply(
            lambda x: pd.to_numeric(x, errors="coerce").fillna(0).sum()
        )
        branches_actives = int((branch_sums > 0).sum())
    elif "INT_BRANCHE" in identity_group_full.columns:
        branches_actives = int(identity_group_full["INT_BRANCHE"].dropna().nunique())

    # Alerte Saturation FAC
    fac_saturation_alerts = _compute_fac_saturation_alerts(identity_group_full)

    # ── KPIs d'analyse (df_full = tous les filtres appliqués)
    analysis_group = df_full[df_full["INT_CEDANTE"] == cedante]
    if vie_non_vie_view and "VIE_NON_VIE" in analysis_group.columns:
        analysis_group = analysis_group[analysis_group["VIE_NON_VIE"] == vie_non_vie_view]

    kpis = compute_kpi_summary(analysis_group) if not analysis_group.empty else compute_kpi_summary(identity_group_view)

    source = analysis_group if not analysis_group.empty else identity_group_view
    avg_share = safe_mean(source, "SHARE_SIGNED")
    avg_commission = safe_mean(source, "COMMI")
    avg_profit_comm = safe_mean(source, "PROFIT_COMM_RATE")
    avg_brokerage = safe_mean(source, "BROKERAGE_RATE")

    # filtered_view = True si des filtres d'analyse ou financiers sont actifs
    filtered_view = bool(
        filters.branche or filters.sous_branche or filters.pays_risque or
        filters.pays_cedante or filters.type_of_contract or filters.type_contrat_spc or
        filters.specialite or filters.prime_min is not None or filters.prime_max is not None or
        filters.ulr_min is not None or filters.ulr_max is not None
    )

    return {
        **kpis,
        "cedante": cedante,
        "pays_cedante": pays_cedante,
        "avg_share_signed": avg_share,
        "avg_commission": avg_commission,
        "avg_profit_comm_rate": avg_profit_comm,
        "avg_brokerage_rate": avg_brokerage,
        "type_cedante": type_cedante,
        "branches_actives": branches_actives,
        "fac_saturation_alerts": fac_saturation_alerts,
        "filtered_view": filtered_view,
    }


def _compute_fac_saturation_alerts(df: pd.DataFrame) -> List[str]:
    """Détecte les branches saturées en FAC. Règle #4 : logique OR."""
    has_type = "TYPE_OF_CONTRACT" in df.columns
    has_spc_type = "INT_SPC_TYPE" in df.columns
    if "INT_BRANCHE" not in df.columns or "WRITTEN_PREMIUM" not in df.columns or not (has_type or has_spc_type):
        return []

    fac_mask = pd.Series(False, index=df.index)
    if has_type:
        fac_mask = fac_mask | (df["TYPE_OF_CONTRACT"] == "FAC")
    if has_spc_type:
        fac_mask = fac_mask | (df["INT_SPC_TYPE"] == "FAC")

    fac_group = df[fac_mask]
    alerts = []
    for branche, br_df in fac_group.groupby("INT_BRANCHE"):
        count = len(br_df)
        prime = pd.to_numeric(br_df["WRITTEN_PREMIUM"], errors="coerce").fillna(0).sum()
        if count > 5 and prime > 1_000_000:
            alerts.append(str(branche))
    return alerts


def compute_cedante_by_year(
    df: pd.DataFrame,
    cedante: str,
    vie_non_vie_view: Optional[str],
) -> list:
    """Évolution temporelle d'une cédante. Le DF reçu est SANS filtre d'année (Règle #2)."""
    group = df[df["INT_CEDANTE"] == cedante]
    if vie_non_vie_view and "VIE_NON_VIE" in group.columns:
        group = group[group["VIE_NON_VIE"] == vie_non_vie_view]
    if group.empty:
        return []
    group = group[group["UNDERWRITING_YEAR"].notna()].copy()
    group["UNDERWRITING_YEAR"] = group["UNDERWRITING_YEAR"].astype(int)
    result = []
    for year, yr_group in group.groupby("UNDERWRITING_YEAR"):
        kpis = compute_kpi_summary(yr_group)
        result.append({"year": int(year), **kpis})
    result.sort(key=lambda x: x["year"])
    return result


def compute_cedante_by_branch(
    df: pd.DataFrame,
    cedante: str,
    vie_non_vie_view: Optional[str],
) -> list:
    """Répartition par branche pour une cédante."""
    group = df[df["INT_CEDANTE"] == cedante]
    if vie_non_vie_view and "VIE_NON_VIE" in group.columns:
        group = group[group["VIE_NON_VIE"] == vie_non_vie_view]
    if group.empty:
        return []
    result = []
    for branche, br_group in group.groupby("INT_BRANCHE"):
        if not branche:
            continue
        kpis = compute_kpi_summary(br_group)
        result.append({
            "branche": branche,
            **kpis,
            "avg_commission": safe_mean(br_group, "COMMI"),
            "avg_brokerage_rate": safe_mean(br_group, "BROKERAGE_RATE"),
            "avg_profit_comm_rate": safe_mean(br_group, "PROFIT_COMM_RATE"),
        })
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result


def compute_fac_saturation(
    df: pd.DataFrame,
    cedante: str,
    seuil_prime: float,
    seuil_affaires: int,
) -> list:
    """Saturation FAC par branche pour une cédante."""
    df_cedante = df[df["INT_CEDANTE"] == cedante] if "INT_CEDANTE" in df.columns else df[:0]

    has_type = "TYPE_OF_CONTRACT" in df_cedante.columns
    has_spc_type = "INT_SPC_TYPE" in df_cedante.columns
    if has_type or has_spc_type:
        fac_mask = pd.Series(False, index=df_cedante.index)
        if has_type:
            fac_mask = fac_mask | df_cedante["TYPE_OF_CONTRACT"].fillna("").astype(str).str.upper().str.contains("FAC", na=False)
        if has_spc_type:
            fac_mask = fac_mask | df_cedante["INT_SPC_TYPE"].fillna("").astype(str).str.upper().str.contains("FAC", na=False)
        df_cedante = df_cedante[fac_mask]
    else:
        df_cedante = df_cedante[:0]

    if df_cedante.empty or "INT_BRANCHE" not in df_cedante.columns:
        return []

    result = []
    for branche in df_cedante["INT_BRANCHE"].dropna().unique():
        if not branche:
            continue
        df_br = df_cedante[df_cedante["INT_BRANCHE"] == branche]
        total_prime = float(df_br["WRITTEN_PREMIUM"].sum()) if "WRITTEN_PREMIUM" in df_br.columns else 0.0
        nb_affaires = int(len(df_br))
        is_saturated = (total_prime > seuil_prime) or (nb_affaires > seuil_affaires)
        result.append({
            "branche": branche,
            "total_prime_fac": round(total_prime, 2),
            "nb_affaires_fac": nb_affaires,
            "is_saturated": is_saturated,
            "seuil_prime": seuil_prime,
            "seuil_affaires": seuil_affaires,
        })
    return sorted(result, key=lambda x: x["total_prime_fac"], reverse=True)


def compute_fac_saturation_global(
    df: pd.DataFrame,
    seuil_prime: float,
    seuil_affaires: int,
) -> list:
    """Saturation FAC globale — toutes cédantes."""
    if "INT_CEDANTE" not in df.columns or ("TYPE_OF_CONTRACT" not in df.columns and "INT_SPC_TYPE" not in df.columns) or "INT_BRANCHE" not in df.columns:
        return []

    has_type = "TYPE_OF_CONTRACT" in df.columns
    has_spc_type = "INT_SPC_TYPE" in df.columns
    fac_mask = pd.Series(False, index=df.index)
    if has_type:
        fac_mask = fac_mask | df["TYPE_OF_CONTRACT"].fillna("").astype(str).str.upper().str.contains("FAC", na=False)
    if has_spc_type:
        fac_mask = fac_mask | df["INT_SPC_TYPE"].fillna("").astype(str).str.upper().str.contains("FAC", na=False)
    df_fac = df[fac_mask]
    if df_fac.empty:
        return []

    result = []
    for cedante_name, ced_df in df_fac.groupby("INT_CEDANTE"):
        if not cedante_name:
            continue
        branches_detail = []
        for branche, br_df in ced_df.groupby("INT_BRANCHE"):
            if not branche:
                continue
            total_prime = float(pd.to_numeric(br_df["WRITTEN_PREMIUM"], errors="coerce").fillna(0).sum()) if "WRITTEN_PREMIUM" in br_df.columns else 0.0
            nb_affaires = int(len(br_df))
            is_saturated = (total_prime > seuil_prime) or (nb_affaires > seuil_affaires)
            saturation_score = round((total_prime / seuil_prime) + (nb_affaires / seuil_affaires), 4)
            branches_detail.append({
                "branche": branche,
                "total_prime_fac": round(total_prime, 2),
                "nb_affaires_fac": nb_affaires,
                "is_saturated": is_saturated,
                "saturation_score": saturation_score,
                "seuil_prime": seuil_prime,
                "seuil_affaires": seuil_affaires,
            })
        if not branches_detail:
            continue
        total_prime_cedante = round(sum(b["total_prime_fac"] for b in branches_detail), 2)
        nb_branches_fac = len(branches_detail)
        branches_saturees = [b["branche"] for b in branches_detail if b["is_saturated"]]
        nb_branches_saturees = len(branches_saturees)
        score_global = round(sum(b["saturation_score"] for b in branches_detail), 4)
        result.append({
            "cedante": cedante_name,
            "total_prime_fac": total_prime_cedante,
            "nb_branches_fac": nb_branches_fac,
            "nb_branches_saturees": nb_branches_saturees,
            "branches_saturees": branches_saturees,
            "score_global": score_global,
            "branches_detail": sorted(branches_detail, key=lambda x: x["total_prime_fac"], reverse=True),
        })
    return sorted(result, key=lambda x: x["score_global"], reverse=True)
