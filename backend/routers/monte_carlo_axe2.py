"""
Router FastAPI — Simulations Monte Carlo 2030 (Axe 2 / Modélisation Afrique).
Préfixe : /api/monte-carlo
Accès public (pas d'authentification) — identique à predictions_axe2.py.

Logique (GBM — Geometric Brownian Motion) :
  Pour chaque (pays × variable), à partir de la série historique 2015–2024 :
    - Variables volume (Primes, PIB, Densité) : log-rendements → mu, sigma
    - Variables ratio/taux (Pénétration, S/P, Inflation, WGI) : variations absolues → mu, sigma
    - 10 000 simulations GBM : S(t+1) = S(t) × exp((mu - 0.5×sigma²) + sigma×Z)
    - Percentiles extraits : P10, P25, P50, P75, P90 + moyenne
  np.random.seed(42) pour la reproductibilité.
"""
from __future__ import annotations

import logging
import threading
from functools import lru_cache
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monte-carlo", tags=["Monte Carlo Axe 2"])

# ── Constantes ────────────────────────────────────────────────────────────────

HIST_YEARS    = list(range(2015, 2025))   # 10 années historiques
PRED_YEARS    = list(range(2025, 2031))   # 6 horizons de prédiction
N_SIMULATIONS = 10_000
N_SAMPLE      = 200   # trajectoires exportées pour le graphique front-end
HORIZON       = 6     # 2025 → 2030

# Mapping variable → (dimension, colonne_db, type_calcul, sens_favorable)
# type_calcul : 'volume' = log-rendements / 'ratio' = variations absolues
VARIABLE_MAP: dict[str, dict] = {
    # Non-Vie
    "Primes_NonVie":       {"dim": "non_vie", "col": "primes_emises_mn_usd",   "type": "volume", "sens": "hausse", "unite": "Mn USD",   "label": "Primes émises Non-Vie"},
    "Croissance_NonVie":   {"dim": "non_vie", "col": "croissance_primes_pct",  "type": "ratio",  "sens": "hausse", "unite": "%",         "label": "Croissance primes Non-Vie"},
    "Penetration_NonVie":  {"dim": "non_vie", "col": "taux_penetration_pct",   "type": "ratio",  "sens": "hausse", "unite": "%",         "label": "Taux de pénétration Non-Vie"},
    "RatioSP_NonVie":      {"dim": "non_vie", "col": "ratio_sp_pct",           "type": "ratio",  "sens": "baisse", "unite": "%",         "label": "Ratio S/P Non-Vie"},
    "Densite_NonVie":      {"dim": "non_vie", "col": "densite_assurance_usd",  "type": "volume", "sens": "hausse", "unite": "USD/hab",   "label": "Densité assurance Non-Vie"},
    # Vie
    "Primes_Vie":          {"dim": "vie",     "col": "primes_emises_mn_usd",   "type": "volume", "sens": "hausse", "unite": "Mn USD",   "label": "Primes émises Vie"},
    "Penetration_Vie":     {"dim": "vie",     "col": "taux_penetration_pct",   "type": "ratio",  "sens": "hausse", "unite": "%",         "label": "Taux de pénétration Vie"},
    "Densite_Vie":         {"dim": "vie",     "col": "densite_assurance_usd",  "type": "volume", "sens": "hausse", "unite": "USD/hab",   "label": "Densité assurance Vie"},
    # Macro
    "PIB_ParHabitant":     {"dim": "macro",   "col": "gdp_per_capita",         "type": "volume", "sens": "hausse", "unite": "USD",       "label": "PIB par habitant"},
    "PIB_Croissance":      {"dim": "macro",   "col": "gdp_growth_pct",         "type": "ratio",  "sens": "hausse", "unite": "%",         "label": "Croissance PIB réel"},
    "Inflation":           {"dim": "macro",   "col": "inflation_rate_pct",     "type": "ratio",  "sens": "baisse", "unite": "%",         "label": "Taux d'inflation"},
    # Gouvernance
    "Stabilite_Politique": {"dim": "gouv",    "col": "political_stability",    "type": "ratio",  "sens": "hausse", "unite": "indice",    "label": "Stabilité politique (WGI)"},
    "Qualite_Reglementaire": {"dim": "gouv",  "col": "regulatory_quality",     "type": "ratio",  "sens": "hausse", "unite": "indice",    "label": "Qualité réglementaire (WGI)"},
    "FDI_Pct_PIB":         {"dim": "gouv",    "col": "fdi_inflows_pct_gdp",   "type": "ratio",  "sens": "hausse", "unite": "% PIB",     "label": "IDE entrants (% PIB)"},
}

# Variables phares pour l'overview
OVERVIEW_VARS = ["Primes_NonVie", "Penetration_NonVie", "RatioSP_NonVie"]

DIMENSIONS: dict[str, list[str]] = {
    "non_vie": ["Primes_NonVie", "Croissance_NonVie", "Penetration_NonVie", "RatioSP_NonVie", "Densite_NonVie"],
    "vie":     ["Primes_Vie", "Penetration_Vie", "Densite_Vie"],
    "macro":   ["PIB_ParHabitant", "PIB_Croissance", "Inflation"],
    "gouv":    ["Stabilite_Politique", "Qualite_Reglementaire", "FDI_Pct_PIB"],
}

# Cache global : clé = (pays, variable) → dict résultat
_mc_cache: dict[tuple[str, str], dict] = {}
_overview_cache: list[dict] | None = None
_cache_lock = threading.Lock()


# ── Chargement des données ────────────────────────────────────────────────────

def _load_all_data() -> dict[str, list[dict]]:
    """Charge toutes les séries historiques depuis SQLite."""
    from core.database import SessionLocal
    from models.external_db_models import (
        ExtMarcheNonVie, ExtMarcheVie, ExtGouvernance, ExtMacroeconomie
    )
    db = SessionLocal()
    try:
        non_vie = [
            {"pays": r.pays, "annee": r.annee,
             "primes_emises_mn_usd": r.primes_emises_mn_usd,
             "croissance_primes_pct": r.croissance_primes_pct,
             "taux_penetration_pct": r.taux_penetration_pct,
             "ratio_sp_pct": r.ratio_sp_pct,
             "densite_assurance_usd": r.densite_assurance_usd}
            for r in db.query(ExtMarcheNonVie).all()
        ]
        vie = [
            {"pays": r.pays, "annee": r.annee,
             "primes_emises_mn_usd": r.primes_emises_mn_usd,
             "croissance_primes_pct": r.croissance_primes_pct,
             "taux_penetration_pct": r.taux_penetration_pct,
             "densite_assurance_usd": r.densite_assurance_usd}
            for r in db.query(ExtMarcheVie).all()
        ]
        macro = [
            {"pays": r.pays, "annee": r.annee,
             "gdp_growth_pct": r.gdp_growth_pct,
             "gdp_per_capita": r.gdp_per_capita,
             "gdp_mn": r.gdp_mn,
             "inflation_rate_pct": r.inflation_rate_pct,
             "integration_regionale_score": r.integration_regionale_score}
            for r in db.query(ExtMacroeconomie).all()
        ]
        gouv = [
            {"pays": r.pays, "annee": r.annee,
             "fdi_inflows_pct_gdp": r.fdi_inflows_pct_gdp,
             "political_stability": r.political_stability,
             "regulatory_quality": r.regulatory_quality,
             "kaopen": r.kaopen}
            for r in db.query(ExtGouvernance).all()
        ]
        return {"non_vie": non_vie, "vie": vie, "macro": macro, "gouv": gouv}
    finally:
        db.close()


def _get_series(data_all: dict, dimension: str, col: str, pays: str) -> list[tuple[int, float]]:
    """Retourne la série (annee, valeur) triée pour un pays/colonne, sans nulls."""
    rows = [
        (r["annee"], float(r[col]))
        for r in data_all[dimension]
        if r["pays"] == pays and r.get(col) is not None
    ]
    return sorted(rows, key=lambda x: x[0])


def _get_all_pays(data_all: dict) -> list[str]:
    pays_set: set[str] = set()
    for rows in data_all.values():
        for r in rows:
            pays_set.add(r["pays"])
    return sorted(pays_set)


# ── Moteur Monte Carlo GBM ────────────────────────────────────────────────────

def _gbm_simulate(
    series: list[tuple[int, float]],
    var_type: str,
    seed: int = 42,
) -> dict | None:
    """
    Effectue 10 000 simulations GBM sur un horizon de 6 ans.

    Args:
        series   : [(annee, valeur), ...] triés, sans nulls
        var_type : 'volume' → log-rendements | 'ratio' → variations absolues
        seed     : graine pour la reproductibilité

    Returns:
        dict avec mu, sigma, paths (N×H), percentiles, probabilités
        ou None si données insuffisantes
    """
    if len(series) < 4:
        return None

    values = np.array([v for _, v in series], dtype=float)

    # ── Filtrage valeurs non-nulles pour variables volume ───────────────────
    if var_type == "volume":
        pos_vals = values[values > 0]
        if len(pos_vals) < 4:
            return None
        log_r = np.diff(np.log(pos_vals))
        if len(log_r) < 2:
            return None
        mu    = float(np.mean(log_r))
        sigma = float(np.std(log_r, ddof=1))
    else:
        deltas = np.diff(values)
        if len(deltas) < 2:
            return None
        mu    = float(np.mean(deltas))
        sigma = float(np.std(deltas, ddof=1))

    if sigma == 0 or np.isnan(sigma):
        sigma = 1e-6

    # ── 10 000 simulations GBM ──────────────────────────────────────────────
    rng = np.random.default_rng(seed)
    last_val = float(values[-1])
    paths = np.zeros((N_SIMULATIONS, HORIZON), dtype=float)

    if var_type == "volume":
        # GBM multiplicatif : S(t+1) = S(t) × exp((mu - 0.5σ²) + σ×Z)
        drift = mu - 0.5 * sigma ** 2
        for t in range(HORIZON):
            Z = rng.standard_normal(N_SIMULATIONS)
            if t == 0:
                prev = np.full(N_SIMULATIONS, last_val)
            else:
                prev = paths[:, t - 1]
            paths[:, t] = prev * np.exp(drift + sigma * Z)
    else:
        # Marche aléatoire additive (appropriée pour variables pouvant être négatives)
        for t in range(HORIZON):
            Z = rng.standard_normal(N_SIMULATIONS)
            if t == 0:
                prev = np.full(N_SIMULATIONS, last_val)
            else:
                prev = paths[:, t - 1]
            paths[:, t] = prev + mu + sigma * Z

    # ── Percentiles ─────────────────────────────────────────────────────────
    p10  = np.percentile(paths, 10,  axis=0).tolist()
    p25  = np.percentile(paths, 25,  axis=0).tolist()
    p50  = np.percentile(paths, 50,  axis=0).tolist()
    p75  = np.percentile(paths, 75,  axis=0).tolist()
    p90  = np.percentile(paths, 90,  axis=0).tolist()
    mean = np.mean(paths, axis=0).tolist()

    # ── Probabilités sur la distribution finale (horizon 2030) ──────────────
    final_vals = paths[:, -1]
    prob_hausse      = float(np.mean(final_vals > last_val))
    prob_hausse_20   = float(np.mean(final_vals > last_val * 1.20))
    prob_baisse      = float(np.mean(final_vals < last_val))
    prob_baisse_20   = float(np.mean(final_vals < last_val * 0.80))

    # ── 200 trajectoires échantillonnées pour le graphique ───────────────────
    idx_sample = rng.choice(N_SIMULATIONS, size=N_SAMPLE, replace=False)
    trajectories_sample = paths[idx_sample, :].tolist()

    # ── Variations vs 2024 ──────────────────────────────────────────────────
    def _var_pct(val: float, ref: float) -> float | None:
        if ref == 0 or ref is None:
            return None
        return round((val - ref) / abs(ref) * 100, 2)

    return {
        "mu":    round(mu, 6),
        "sigma": round(sigma, 6),
        "last_val": last_val,
        "paths": paths,            # numpy array — PAS sérialisé (usage interne)
        "trajectoires_sample": trajectories_sample,
        "percentiles": {
            "annees": PRED_YEARS,
            "p10":  [round(v, 4) for v in p10],
            "p25":  [round(v, 4) for v in p25],
            "p50":  [round(v, 4) for v in p50],
            "p75":  [round(v, 4) for v in p75],
            "p90":  [round(v, 4) for v in p90],
            "mean": [round(v, 4) for v in mean],
        },
        "scenarios_2030": {
            "pessimiste": {
                "valeur": round(p10[-1], 4),
                "variation_vs_2024_pct": _var_pct(p10[-1], last_val),
            },
            "central": {
                "valeur": round(p50[-1], 4),
                "variation_vs_2024_pct": _var_pct(p50[-1], last_val),
            },
            "optimiste": {
                "valeur": round(p90[-1], 4),
                "variation_vs_2024_pct": _var_pct(p90[-1], last_val),
            },
        },
        "probabilites": {
            "prob_hausse_vs_2024": round(prob_hausse, 4),
            "prob_hausse_20pct":   round(prob_hausse_20, 4),
            "prob_baisse_vs_2024": round(prob_baisse, 4),
            "prob_baisse_20pct":   round(prob_baisse_20, 4),
        },
    }


def _run_mc_for_pays_variable(
    data_all: dict,
    pays: str,
    variable: str,
) -> dict | None:
    """Wrapper avec cache sur (pays, variable)."""
    cache_key = (pays, variable)
    with _cache_lock:
        if cache_key in _mc_cache:
            return _mc_cache[cache_key]

    meta = VARIABLE_MAP[variable]
    series = _get_series(data_all, meta["dim"], meta["col"], pays)
    if not series:
        return None

    result = _gbm_simulate(series, meta["type"])
    if result is not None:
        # Ajouter l'historique
        result["historique"] = [{"annee": int(a), "valeur": round(v, 4)} for a, v in series]

    with _cache_lock:
        _mc_cache[cache_key] = result
    return result


# ── Calcul de l'overview (lourd — mis en cache) ───────────────────────────────

def _compute_overview() -> list[dict]:
    global _overview_cache
    with _cache_lock:
        if _overview_cache is not None:
            return _overview_cache

    data_all = _load_all_data()
    pays_list = _get_all_pays(data_all)

    rows: list[dict] = []
    for pays in pays_list:
        mc_primes = _run_mc_for_pays_variable(data_all, pays, "Primes_NonVie")
        mc_pen    = _run_mc_for_pays_variable(data_all, pays, "Penetration_NonVie")
        mc_sp     = _run_mc_for_pays_variable(data_all, pays, "RatioSP_NonVie")

        def _p(mc: dict | None, pct: str) -> float | None:
            if mc is None:
                return None
            return mc["percentiles"][pct][-1]   # valeur 2030

        def _incert(mc: dict | None) -> float | None:
            if mc is None:
                return None
            p10v = mc["percentiles"]["p10"][-1]
            p50v = mc["percentiles"]["p50"][-1]
            p90v = mc["percentiles"]["p90"][-1]
            if p50v == 0:
                return None
            return round((p90v - p10v) / abs(p50v) * 100, 2)

        def _val2024(mc: dict | None) -> float | None:
            if mc is None:
                return None
            return mc["last_val"]

        row = {
            "pays": pays,
            # Primes NV
            "primes_nv_2024":  _val2024(mc_primes),
            "primes_nv_p10":   _p(mc_primes, "p10"),
            "primes_nv_p50":   _p(mc_primes, "p50"),
            "primes_nv_p90":   _p(mc_primes, "p90"),
            "primes_nv_sigma": round(mc_primes["sigma"], 4) if mc_primes else None,
            # Pénétration
            "penetration_p10": _p(mc_pen, "p10"),
            "penetration_p50": _p(mc_pen, "p50"),
            "penetration_p90": _p(mc_pen, "p90"),
            # Ratio S/P
            "ratio_sp_p10": _p(mc_sp, "p10"),
            "ratio_sp_p50": _p(mc_sp, "p50"),
            "ratio_sp_p90": _p(mc_sp, "p90"),
            # Incertitude
            "incertitude_primes":      _incert(mc_primes),
            "incertitude_penetration": _incert(mc_pen),
            "incertitude_sp":          _incert(mc_sp),
        }
        rows.append(row)

    with _cache_lock:
        _overview_cache = rows
    return rows


# ── Calcul des scénarios globaux (agrégats continent) ────────────────────────

def _compute_scenarios_globaux(data_all: dict, pays_list: list[str]) -> dict:
    """Agrège primes NV + pénétration + S/P sur les 34 pays."""

    def _aggregate(variable: str, agg: str) -> dict[str, float]:
        """Retourne {p10, p50, p90} pour une variable en mode agg ('sum'|'mean')."""
        vals: dict[str, list[float]] = {"p10": [], "p50": [], "p90": []}
        for pays in pays_list:
            mc = _run_mc_for_pays_variable(data_all, pays, variable)
            if mc is None:
                continue
            for k in ("p10", "p50", "p90"):
                v = mc["percentiles"][k][-1]
                if v is not None:
                    vals[k].append(v)
        result: dict[str, float] = {}
        for k in ("p10", "p50", "p90"):
            if not vals[k]:
                result[k] = 0.0
            elif agg == "sum":
                result[k] = round(sum(vals[k]), 2)
            else:
                result[k] = round(sum(vals[k]) / len(vals[k]), 4)
        return result

    primes_agg  = _aggregate("Primes_NonVie",      "sum")
    pen_agg     = _aggregate("Penetration_NonVie",  "mean")
    sp_agg      = _aggregate("RatioSP_NonVie",      "mean")

    # Séries historiques continent (somme des primes NV)
    historique_continent: dict[int, float] = {}
    for pays in pays_list:
        mc = _run_mc_for_pays_variable(data_all, pays, "Primes_NonVie")
        if mc is None:
            continue
        for pt in mc["historique"]:
            yr = pt["annee"]
            historique_continent[yr] = historique_continent.get(yr, 0) + pt["valeur"]

    hist_series = [{"annee": yr, "valeur": round(v, 2)}
                   for yr, v in sorted(historique_continent.items())]

    # Séries prévisionnelles P10/P50/P90 continent
    pred_by_pct: dict[str, dict[int, float]] = {"p10": {}, "p50": {}, "p90": {}}
    for pays in pays_list:
        mc = _run_mc_for_pays_variable(data_all, pays, "Primes_NonVie")
        if mc is None:
            continue
        for i, yr in enumerate(PRED_YEARS):
            for k in ("p10", "p50", "p90"):
                pred_by_pct[k][yr] = pred_by_pct[k].get(yr, 0) + mc["percentiles"][k][i]

    pred_series = [
        {
            "annee": yr,
            "p10": round(pred_by_pct["p10"].get(yr, 0), 2),
            "p50": round(pred_by_pct["p50"].get(yr, 0), 2),
            "p90": round(pred_by_pct["p90"].get(yr, 0), 2),
        }
        for yr in PRED_YEARS
    ]

    return {
        "primes_nv_total": {**primes_agg},
        "penetration_moy":  {**pen_agg},
        "ratio_sp_moy":     {**sp_agg},
        "historique_continent": hist_series,
        "predictions_continent": pred_series,
        "scenarios": {
            "pessimiste": {
                "description": "Environnement défavorable — chocs macro, instabilité politique, croissance ralentie",
                "primes_nv_total": primes_agg["p10"],
                "penetration_moy": pen_agg["p10"],
                "ratio_sp_moy": sp_agg["p10"],
            },
            "central": {
                "description": "Continuation des tendances historiques — croissance modérée et régulière",
                "primes_nv_total": primes_agg["p50"],
                "penetration_moy": pen_agg["p50"],
                "ratio_sp_moy": sp_agg["p50"],
            },
            "optimiste": {
                "description": "Accélération du développement — digitalisation, croissance économique forte, régulation favorable",
                "primes_nv_total": primes_agg["p90"],
                "penetration_moy": pen_agg["p90"],
                "ratio_sp_moy": sp_agg["p90"],
            },
        },
    }


# ── Préchauffage du cache au démarrage ───────────────────────────────────────

def _warmup_cache():
    """Précalcule l'overview en arrière-plan."""
    try:
        logger.info("Monte Carlo — préchauffage du cache démarré…")
        _compute_overview()
        logger.info("Monte Carlo — cache overview prêt.")
    except Exception as exc:
        logger.warning(f"Monte Carlo warmup error: {exc}")


def start_warmup():
    """Appelé depuis main.py au démarrage du serveur."""
    t = threading.Thread(target=_warmup_cache, daemon=True)
    t.start()


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/overview")
def get_overview():
    """
    Vue d'ensemble 34 pays × 3 variables phares (Primes NV, Pénétration, S/P).
    Mis en cache après le premier appel.
    """
    try:
        return _compute_overview()
    except Exception as exc:
        logger.error(f"Monte Carlo overview error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/pays/{pays}")
def get_pays(
    pays: str,
    variable: str = Query("Primes_NonVie", description="Variable à simuler"),
):
    """
    10 000 simulations GBM pour un pays et une variable.
    Retourne historique, percentiles, 200 trajectoires, scénarios 2030, probabilités.
    """
    if variable not in VARIABLE_MAP:
        raise HTTPException(status_code=400, detail=f"Variable inconnue: {variable}")

    try:
        data_all = _load_all_data()
        all_pays = _get_all_pays(data_all)
        if pays not in all_pays:
            raise HTTPException(status_code=404, detail=f"Pays introuvable: {pays}")

        mc = _run_mc_for_pays_variable(data_all, pays, variable)
        if mc is None:
            raise HTTPException(
                status_code=422,
                detail=f"Données insuffisantes pour simuler {variable} pour {pays} (< 4 points valides)"
            )

        meta = VARIABLE_MAP[variable]
        return {
            "pays": pays,
            "variable": variable,
            "dimension": meta["dim"],
            "unite": meta["unite"],
            "label": meta["label"],
            "sens_favorable": meta["sens"],
            "mu":    mc["mu"],
            "sigma": mc["sigma"],
            "n_simulations": N_SIMULATIONS,
            "historique": mc["historique"],
            "trajectoires_sample": mc["trajectoires_sample"],
            "percentiles": mc["percentiles"],
            "scenarios_2030": mc["scenarios_2030"],
            "probabilites": mc["probabilites"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Monte Carlo pays {pays}/{variable} error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/variable/{variable_name}")
def get_variable(
    variable_name: str,
    scenario: str = Query("central", description="pessimiste|central|optimiste"),
    horizon: int  = Query(2030, description="2025..2030"),
):
    """
    Classement des 34 pays selon la valeur simulée à l'horizon pour le scénario choisi.
    """
    if variable_name not in VARIABLE_MAP:
        raise HTTPException(status_code=400, detail=f"Variable inconnue: {variable_name}")
    if scenario not in ("pessimiste", "central", "optimiste"):
        raise HTTPException(status_code=400, detail=f"Scénario invalide: {scenario}")
    if horizon not in PRED_YEARS:
        raise HTTPException(status_code=400, detail=f"Horizon invalide: {horizon}")

    pct_key = {"pessimiste": "p10", "central": "p50", "optimiste": "p90"}[scenario]
    horizon_idx = PRED_YEARS.index(horizon)

    try:
        data_all = _load_all_data()
        pays_list = _get_all_pays(data_all)
        meta = VARIABLE_MAP[variable_name]
        sens = meta["sens"]

        classement: list[dict] = []
        for pays in pays_list:
            mc = _run_mc_for_pays_variable(data_all, pays, variable_name)
            if mc is None:
                continue
            val_2024  = mc["last_val"]
            val_scen  = mc["percentiles"][pct_key][horizon_idx]
            val_p10   = mc["percentiles"]["p10"][horizon_idx]
            val_p50   = mc["percentiles"]["p50"][horizon_idx]
            val_p90   = mc["percentiles"]["p90"][horizon_idx]
            sigma     = mc["sigma"]

            var_pct = round((val_scen - val_2024) / abs(val_2024) * 100, 2) if val_2024 else None
            incert  = round((val_p90 - val_p10) / abs(val_p50) * 100, 2) if val_p50 else None

            classement.append({
                "pays": pays,
                "valeur_2024":    round(val_2024, 4),
                "valeur_scenario": round(val_scen, 4),
                "p10": round(val_p10, 4),
                "p50": round(val_p50, 4),
                "p90": round(val_p90, 4),
                "variation_pct": var_pct,
                "sigma": round(sigma, 4),
                "incertitude_pct": incert,
            })

        reverse = (sens == "hausse")
        classement.sort(key=lambda x: (x["valeur_scenario"] or 0), reverse=reverse)
        for i, row in enumerate(classement, 1):
            row["rang"] = i

        return {
            "variable": variable_name,
            "meta": meta,
            "scenario": scenario,
            "horizon": horizon,
            "classement": classement,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Monte Carlo variable {variable_name} error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/comparaison")
def get_comparaison(
    pays_a: str = Query(...),
    pays_b: str = Query(...),
    variable: str = Query("Primes_NonVie"),
):
    """
    Historique + percentiles pour 2 pays sur la même variable.
    """
    if variable not in VARIABLE_MAP:
        raise HTTPException(status_code=400, detail=f"Variable inconnue: {variable}")
    if pays_a == pays_b:
        raise HTTPException(status_code=400, detail="pays_a et pays_b doivent être différents")

    try:
        data_all = _load_all_data()
        all_pays = _get_all_pays(data_all)
        for pays in [pays_a, pays_b]:
            if pays not in all_pays:
                raise HTTPException(status_code=404, detail=f"Pays introuvable: {pays}")

        mc_a = _run_mc_for_pays_variable(data_all, pays_a, variable)
        mc_b = _run_mc_for_pays_variable(data_all, pays_b, variable)

        def _serialize(mc: dict | None, pays: str) -> dict:
            if mc is None:
                return {"pays": pays, "error": "insufficient_data"}
            return {
                "pays": pays,
                "mu":    mc["mu"],
                "sigma": mc["sigma"],
                "historique": mc["historique"],
                "trajectoires_sample": mc["trajectoires_sample"],
                "percentiles": mc["percentiles"],
                "scenarios_2030": mc["scenarios_2030"],
                "probabilites": mc["probabilites"],
            }

        meta = VARIABLE_MAP[variable]
        return {
            "variable": variable,
            "meta": meta,
            "pays_a": _serialize(mc_a, pays_a),
            "pays_b": _serialize(mc_b, pays_b),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Monte Carlo comparaison error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/scenarios-globaux")
def get_scenarios_globaux():
    """
    Agrégats continent (34 pays) pour les 3 variables phares × 3 scénarios.
    """
    try:
        data_all = _load_all_data()
        pays_list = _get_all_pays(data_all)
        return _compute_scenarios_globaux(data_all, pays_list)
    except Exception as exc:
        logger.error(f"Monte Carlo scenarios-globaux error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/metadata")
def get_metadata():
    """Liste des pays, variables, dimensions disponibles."""
    try:
        from core.database import SessionLocal
        from models.external_db_models import ExtMarcheNonVie
        db = SessionLocal()
        try:
            pays_list = sorted([r[0] for r in db.query(ExtMarcheNonVie.pays).distinct().all()])
        finally:
            db.close()

        return {
            "pays": pays_list,
            "variables": {k: {kk: vv for kk, vv in v.items() if kk != "col"} for k, v in VARIABLE_MAP.items()},
            "dimensions": DIMENSIONS,
            "annees_historique": HIST_YEARS,
            "annees_prediction": PRED_YEARS,
            "n_simulations": N_SIMULATIONS,
        }
    except Exception as exc:
        logger.error(f"Monte Carlo metadata error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
