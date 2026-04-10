"""
Target Share Service — Calcul des parts cibles pour les traités TTY.

Applique les règles d'ajustement de part (bonus ULR, bonus LOB, bonus faible part,
malus ULR élevé), la rampe +2, la contrainte triple, et le cap 10 MDH.
"""
from typing import List, Dict, Any
import math
import pandas as pd


def _is_nan(v) -> bool:
    try:
        return v is None or (isinstance(v, float) and math.isnan(v))
    except Exception:
        return False


def _safe_float(v, default: float = 0.0) -> float:
    if _is_nan(v):
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _safe_int(v, default: int = 0) -> int:
    if _is_nan(v):
        return default
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def compute_target_shares(
    df: pd.DataFrame,
    ulr_low_threshold: float = 60,
    ulr_low_bonus: int = 1,
    lob_threshold: int = 4,
    lob_bonus: int = 1,
    low_share_threshold: float = 5,
    low_share_bonus: int = 1,
    ulr_high_threshold: float = 80,
    ulr_high_malus: int = -1,
    max_increase_per_renewal: int = 2,
    max_multiple: float = 3,
    cap_mdh: float = 10_000_000,
) -> List[Dict[str, Any]]:
    """
    Pour chaque contrat TTY (INT_SPC_TYPE == "TTY") dans le DataFrame filtré,
    calcule la part cible et le potentiel additionnel.
    """
    if df is None or df.empty or "INT_SPC_TYPE" not in df.columns:
        return []

    tty = df[df["INT_SPC_TYPE"] == "TTY"].copy()
    if tty.empty:
        return []

    if "WRITTEN_PREMIUM_WHOLE" in tty.columns:
        size_col = "WRITTEN_PREMIUM_WHOLE"
    elif "SUBJECT_PREMIUM" in tty.columns:
        size_col = "SUBJECT_PREMIUM"
    else:
        size_col = "WRITTEN_PREMIUM"

    lob_count_by_cedant = {}
    if "CEDANT_CODE" in df.columns and "INT_BRANCHE" in df.columns:
        valid_b = df[df["INT_BRANCHE"].astype(str).str.strip() != ""]
        lob_count_by_cedant = valid_b.groupby("CEDANT_CODE")["INT_BRANCHE"].nunique().to_dict()

    tty["_lob_count"] = tty.get("CEDANT_CODE", pd.Series(dtype=str)).map(lob_count_by_cedant).fillna(0).astype(int)
    tty["_share"] = pd.to_numeric(tty.get("SHARE_SIGNED", 0), errors="coerce").fillna(0.0)
    tty["_wp"] = pd.to_numeric(tty.get("WRITTEN_PREMIUM", 0), errors="coerce").fillna(0.0)
    tty["_wp_whole"] = pd.to_numeric(tty.get(size_col, 0), errors="coerce").fillna(0.0)
    tty["_ulr"] = pd.to_numeric(tty.get("ULR", pd.NA), errors="coerce")

    # 1. Adjustments
    tty["_ulr_bonus"] = (tty["_ulr"] < ulr_low_threshold).astype(int) * ulr_low_bonus
    tty["_lob_bonus"] = (tty["_lob_count"] >= lob_threshold).astype(int) * lob_bonus
    tty["_low_share_bonus"] = (tty["_share"] < low_share_threshold).astype(int) * low_share_bonus
    tty["_ulr_malus"] = (tty["_ulr"] > ulr_high_threshold).astype(int) * ulr_high_malus

    # NaN comparisons result in False => 0
    tty["_raw_adj"] = tty["_ulr_bonus"] + tty["_lob_bonus"] + tty["_low_share_bonus"] + tty["_ulr_malus"]

    # 2. Rampe
    tty["_capped_adj"] = tty["_raw_adj"].clip(upper=max_increase_per_renewal)

    # 3. Part cible brute
    part_cible = tty["_share"] + tty["_capped_adj"]

    # 4. Triple Cap
    triple_max = tty["_share"] * max_multiple
    mask_triple = (tty["_share"] > 0) & (part_cible > triple_max)
    part_cible = part_cible.where(~mask_triple, triple_max)

    # 5. Cap prime cible
    # condition: written_premium_whole > 0 and prime_cible_brute > cap_mdh
    prime_cible_brute = part_cible * tty["_wp_whole"] / 100.0
    cap_val = (cap_mdh / tty["_wp_whole"].replace(0, pd.NA)) * 100.0
    mask_cap = (tty["_wp_whole"] > 0) & (prime_cible_brute > cap_mdh)

    part_cible = part_cible.where(~mask_cap, cap_val)
    part_cible = part_cible.clip(lower=0.0).fillna(0.0)

    prime_cible = part_cible * tty["_wp_whole"] / 100.0
    potentiel = prime_cible - tty["_wp"]

    badges = pd.Series("STABLE", index=tty.index)
    badges[part_cible > tty["_share"] + 1e-9] = "HAUSSE"
    badges[part_cible < tty["_share"] - 1e-9] = "BAISSE"

    tty["POLICY_SEQUENCE_NUMBER"] = tty.get("POLICY_SEQUENCE_NUMBER", "").astype(str).replace("nan", "")
    tty["CONTRACT_NUMBER"] = tty.get("CONTRACT_NUMBER", "").astype(str).replace("nan", "")
    tty["INT_CEDANTE"] = tty.get("INT_CEDANTE", "").astype(str).replace("nan", "")
    tty["CEDANT_CODE"] = tty.get("CEDANT_CODE", "").astype(str).replace("nan", "")
    tty["PAYS_RISQUE"] = tty.get("PAYS_RISQUE", "").astype(str).replace("nan", "")
    tty["INT_BRANCHE"] = tty.get("INT_BRANCHE", "").astype(str).replace("nan", "")
    tty["VIE_NON_VIE"] = tty.get("VIE_NON_VIE", "").astype(str).replace("nan", "")
    tty["TYPE_OF_CONTRACT"] = tty.get("TYPE_OF_CONTRACT", "").astype(str).replace("nan", "")
    uw_year = pd.to_numeric(tty.get("UNDERWRITING_YEAR", pd.NA), errors="coerce").fillna(-1).astype(int)

    results = []
    
    n_rows = len(tty)
    psn_lst = tty["POLICY_SEQUENCE_NUMBER"].tolist()
    cn_lst = tty["CONTRACT_NUMBER"].tolist()
    cedante_lst = tty["INT_CEDANTE"].tolist()
    cedant_code_lst = tty["CEDANT_CODE"].tolist()
    pays_lst = tty["PAYS_RISQUE"].tolist()
    branche_lst = tty["INT_BRANCHE"].tolist()
    ulr_lst = tty["_ulr"].tolist()
    lob_count_lst = tty["_lob_count"].tolist()
    share_lst = tty["_share"].tolist()
    wp_lst = tty["_wp"].tolist()
    wp_whole_lst = tty["_wp_whole"].tolist()
    uw_year_lst = uw_year.tolist()
    vnv_lst = tty["VIE_NON_VIE"].tolist()
    toc_lst = tty["TYPE_OF_CONTRACT"].tolist()
    ulr_bonus_lst = tty["_ulr_bonus"].tolist()
    lob_bonus_lst = tty["_lob_bonus"].tolist()
    low_share_bonus_lst = tty["_low_share_bonus"].tolist()
    ulr_malus_lst = tty["_ulr_malus"].tolist()
    raw_adj_lst = tty["_raw_adj"].tolist()
    capped_adj_lst = tty["_capped_adj"].tolist()
    part_cible_lst = part_cible.tolist()
    prime_cible_lst = prime_cible.tolist()
    potentiel_lst = potentiel.tolist()
    cap_applied_lst = mask_cap.tolist()
    triple_cap_applied_lst = mask_triple.tolist()
    badges_lst = badges.tolist()

    for i in range(n_rows):
        uy = uw_year_lst[i]
        u_val = ulr_lst[i]

        results.append({
            "policy_sequence_number": psn_lst[i],
            "contract_number": cn_lst[i],
            "cedante": cedante_lst[i],
            "cedant_code": cedant_code_lst[i],
            "pays": pays_lst[i],
            "branche": branche_lst[i],
            "ulr": None if (isinstance(u_val, float) and math.isnan(u_val)) else round(u_val, 2),
            "lob_count": lob_count_lst[i],
            "share_signed": round(share_lst[i], 4),
            "written_premium": round(wp_lst[i], 2),
            "written_premium_whole": round(wp_whole_lst[i], 2),
            "underwriting_year": None if uy == -1 else uy,
            "vie_non_vie": vnv_lst[i],
            "type_of_contract": toc_lst[i],
            "adjustments_detail": {
                "ulr_bonus": ulr_bonus_lst[i],
                "lob_bonus": lob_bonus_lst[i],
                "low_share_bonus": low_share_bonus_lst[i],
                "ulr_malus": ulr_malus_lst[i],
            },
            "raw_adjustment": raw_adj_lst[i],
            "capped_adjustment": capped_adj_lst[i],
            "part_cible": round(part_cible_lst[i], 4),
            "prime_cible": round(prime_cible_lst[i], 2),
            "potentiel_additionnel": round(potentiel_lst[i], 2),
            "cap_applied": bool(cap_applied_lst[i]),
            "triple_cap_applied": bool(triple_cap_applied_lst[i]),
            "badge": badges_lst[i],
        })

    return results


def compute_target_share_summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Agrège les résultats pour les KPIs de l'en-tête."""
    if not results:
        return {
            "total_tty_contracts": 0,
            "total_potentiel_additionnel": 0.0,
            "count_hausse": 0,
            "count_baisse": 0,
            "count_stable": 0,
            "count_cap_applied": 0,
        }

    total_potentiel = sum(r.get("potentiel_additionnel", 0.0) or 0.0 for r in results)
    count_hausse = sum(1 for r in results if r.get("badge") == "HAUSSE")
    count_baisse = sum(1 for r in results if r.get("badge") == "BAISSE")
    count_stable = sum(1 for r in results if r.get("badge") == "STABLE")
    count_cap_applied = sum(
        1 for r in results
        if r.get("cap_applied") or r.get("triple_cap_applied")
    )

    return {
        "total_tty_contracts": len(results),
        "total_potentiel_additionnel": round(total_potentiel, 2),
        "count_hausse": count_hausse,
        "count_baisse": count_baisse,
        "count_stable": count_stable,
        "count_cap_applied": count_cap_applied,
    }
