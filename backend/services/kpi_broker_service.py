"""
Service KPI Broker — profil courtier, évolution, branches, contrats.
"""
import pandas as pd
from typing import Optional, List, Dict, Any

from services.data_service import compute_kpi_summary
from services.kpi_helpers import safe_mean, _sanitize


def compute_kpis_by_broker(
    df: pd.DataFrame,
    selected_list: Optional[List[str]],
    top: int = 10,
) -> list:
    """Top courtiers par prime écrite, avec sélection prioritaire."""
    if df.empty or "INT_BROKER" not in df.columns:
        return []

    all_results = []
    for broker, group in df.groupby("INT_BROKER"):
        if not broker or str(broker).strip() in ("", "NAN"):
            continue
        wp = float(group["WRITTEN_PREMIUM"].sum() if "WRITTEN_PREMIUM" in group.columns else 0)
        is_sel = bool(selected_list and str(broker).strip() in selected_list)
        all_results.append({
            "courtier": str(broker).strip(),
            "written_premium": round(wp, 2),
            "contract_count": len(group),
            "is_selected": is_sel,
        })

    all_results.sort(key=lambda x: x["written_premium"], reverse=True)

    if selected_list:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["written_premium"], reverse=True)
        return final

    return all_results[:top]


def compute_top_brokers(
    df: pd.DataFrame,
    limit: int = 20,
    sort_by: str = "total_written_premium",
) -> list:
    """Top courtiers triés par un champ donné (pour /top-brokers)."""
    if df.empty or "INT_BROKER" not in df.columns:
        return []

    result = []
    for broker, group in df.groupby("INT_BROKER"):
        if not broker or str(broker).strip() == "" or str(broker).strip().upper() == "NAN":
            continue
        kpis = compute_kpi_summary(group)
        result.append({
            "broker": str(broker).strip(),
            "total_written_premium": kpis["total_written_premium"],
            "total_resultat": kpis["total_resultat"],
            "avg_ulr": kpis["avg_ulr"],
            "contract_count": kpis["contract_count"],
        })

    sort_key = sort_by if sort_by in ["total_written_premium", "total_resultat", "avg_ulr", "contract_count"] else "total_written_premium"
    if sort_key == "avg_ulr":
        result.sort(key=lambda x: x[sort_key] if x[sort_key] is not None else float('inf'), reverse=False)
    else:
        result.sort(key=lambda x: x[sort_key] if x[sort_key] is not None else float('-inf'), reverse=True)

    return result[:limit]


def compute_broker_profile(df: pd.DataFrame, broker: str) -> Dict[str, Any]:
    """Profil consolidé d'un courtier — contrats + rétrocession."""
    group = df[df["INT_BROKER"] == broker] if "INT_BROKER" in df.columns else pd.DataFrame()
    if group.empty:
        return {}

    kpis = compute_kpi_summary(group)

    # Cedantes servies
    cedantes = sorted(group["INT_CEDANTE"].dropna().unique().tolist()) if "INT_CEDANTE" in group.columns else []
    branches = sorted(group["INT_BRANCHE"].dropna().unique().tolist()) if "INT_BRANCHE" in group.columns else []
    pays = sorted(group["PAYS_RISQUE"].dropna().unique().tolist()) if "PAYS_RISQUE" in group.columns else []

    # Retro data
    retro_pmd = 0.0
    retro_courtage = 0.0
    retro_traites = 0
    retro_role = "apporteur"
    try:
        from services.retro_service import get_retro_df
        df_retro = get_retro_df()
        if not df_retro.empty and "DIRECT_COURTIER" in df_retro.columns:
            retro_grp = df_retro[df_retro["DIRECT_COURTIER"] == broker]
            if not retro_grp.empty:
                retro_pmd = round(float(retro_grp["PMD_PAR_SECURITE"].sum()), 2)
                retro_courtage = round(float(retro_grp["COMMISSION_COURTAGE"].sum()), 2)
                retro_traites = int(retro_grp["TRAITE"].nunique())
                retro_role = "double" if kpis["contract_count"] > 0 else "placeur"
            elif kpis["contract_count"] > 0:
                retro_role = "apporteur"
    except Exception:
        pass

    solde_net = round(kpis.get("total_written_premium", 0) - retro_pmd, 2)

    return {
        **kpis,
        "broker": broker,
        "avg_commission": safe_mean(group, "COMMI"),
        "avg_brokerage_rate": safe_mean(group, "BROKERAGE_RATE"),
        "avg_share_signed": safe_mean(group, "SHARE_SIGNED"),
        "cedantes": cedantes,
        "branches": branches,
        "pays": pays,
        "retro_pmd_placee": retro_pmd,
        "retro_courtage": retro_courtage,
        "retro_nb_traites": retro_traites,
        "retro_role": retro_role,
        "solde_net": solde_net,
    }


def compute_broker_by_year(df: pd.DataFrame, broker: str) -> list:
    """Évolution temporelle d'un courtier. Le DF reçu est SANS filtre d'année (Règle #2)."""
    group = df[df["INT_BROKER"] == broker] if "INT_BROKER" in df.columns else pd.DataFrame()
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


def compute_broker_by_branch(df: pd.DataFrame, broker: str) -> list:
    """Répartition par branche pour un courtier."""
    group = df[df["INT_BROKER"] == broker] if "INT_BROKER" in df.columns else pd.DataFrame()
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
        })
    result.sort(key=lambda x: x["total_written_premium"], reverse=True)
    return result


def compute_broker_contracts(df: pd.DataFrame, broker: str) -> list:
    """Liste des contrats d'un courtier."""
    group = df[df["INT_BROKER"] == broker] if "INT_BROKER" in df.columns else pd.DataFrame()
    if group.empty:
        return []

    def safe(val):
        if pd.isna(val):
            return None
        if isinstance(val, float) and (val != val or val == float('inf') or val == float('-inf')):
            return None
        return val

    result = []
    for _, row in group.iterrows():
        result.append({
            "policy_id": safe(row.get("POLICY_SEQUENCE_NUMBER")),
            "cedante": safe(row.get("INT_CEDANTE")),
            "branche": safe(row.get("INT_BRANCHE")),
            "pays_risque": safe(row.get("PAYS_RISQUE")),
            "uw_year": safe(row.get("UNDERWRITING_YEAR")),
            "type_contrat": safe(row.get("TYPE_OF_CONTRACT")),
            "written_premium": round(float(pd.to_numeric(row.get("WRITTEN_PREMIUM", 0), errors="coerce") or 0), 2),
            "resultat": round(float(pd.to_numeric(row.get("RESULTAT", 0), errors="coerce") or 0), 2),
            "ulr": round(float(pd.to_numeric(row.get("ULR", 0), errors="coerce") or 0), 4),
            "share_signed": round(float(pd.to_numeric(row.get("SHARE_SIGNED", 0), errors="coerce") or 0), 2),
            "commission": round(float(pd.to_numeric(row.get("COMMI", 0), errors="coerce") or 0), 2),
            "status": safe(row.get("CONTRACT_STATUS")),
        })

    result.sort(key=lambda x: x["written_premium"] or 0, reverse=True)
    return result
