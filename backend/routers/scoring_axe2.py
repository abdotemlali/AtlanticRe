"""
Router FastAPI — Scoring Intelligent des Marchés Africains 2030 (Axe 2).
Préfixe : /api/scoring-axe2
Accès public — identique à predictions_axe2.py et monte_carlo_axe2.py.

4 méthodes complémentaires :
  1. TOPSIS multi-critères avec poids PCA automatiques
  2. K-Means clustering stratégique k=4 + t-SNE 2D
  3. Monte Carlo scores (perturbation ±IC 80% conformal, N=10000 tirages)
  4. Overview consolidé (toutes méthodes + concordance inter-méthodes)
"""
from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.scoring_cache_model import ScoringCache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scoring-axe2", tags=["Scoring Axe 2"])

# ── Constantes ────────────────────────────────────────────────────────────────

TOPSIS_VARS = [
    "nv_penetration",
    "vie_penetration",
    "nv_sp",
    "gdpcap",
    "polstab",
    "regqual",
    "nv_primes",
    "nv_densite",
]

TOPSIS_LABELS = {
    "nv_penetration": "Pénétration Non-Vie (%)",
    "vie_penetration": "Pénétration Vie (%)",
    "nv_sp": "Ratio S/P (%)",
    "gdpcap": "PIB/habitant (USD)",
    "polstab": "Stabilité politique",
    "regqual": "Qualité réglementaire",
    "nv_primes": "Primes Non-Vie (Mn USD)",
    "nv_densite": "Densité Non-Vie (USD/hab)",
}

COST_CRITERIA = {"nv_sp"}  # to minimize — inverted before TOPSIS

# Clustering uses 7 features (no nv_densite) — matches notebook bloc2
CLUSTER_VARS = [
    "nv_penetration",
    "vie_penetration",
    "gdpcap",
    "nv_primes",
    "polstab",
    "regqual",
    "nv_sp",
]

N_MC = 10_000  # Monte Carlo tirages
N_SENS = 500   # sensitivity Dirichlet draws

PAYS_TO_REGION: dict[str, str] = {
    "Algérie": "Afrique du Nord", "Égypte": "Afrique du Nord",
    "Maroc": "Afrique du Nord", "Tunisie": "Afrique du Nord",
    "Bénin": "Afrique de l'Ouest", "Burkina Faso": "Afrique de l'Ouest",
    "Cap-Vert": "Afrique de l'Ouest", "Côte d'Ivoire": "Afrique de l'Ouest",
    "Ghana": "Afrique de l'Ouest", "Mali": "Afrique de l'Ouest",
    "Mauritanie": "Afrique de l'Ouest", "Niger": "Afrique de l'Ouest",
    "Nigeria": "Afrique de l'Ouest", "Sénégal": "Afrique de l'Ouest",
    "Togo": "Afrique de l'Ouest",
    "Cameroun": "Afrique Centrale", "Congo": "Afrique Centrale",
    "Gabon": "Afrique Centrale", "RDC": "Afrique Centrale", "Tchad": "Afrique Centrale",
    "Burundi": "Afrique de l'Est", "Éthiopie": "Afrique de l'Est",
    "Kenya": "Afrique de l'Est", "Madagascar": "Afrique de l'Est",
    "Mozambique": "Afrique de l'Est", "Ouganda": "Afrique de l'Est",
    "Tanzanie": "Afrique de l'Est",
    "Angola": "Afrique Australe", "Botswana": "Afrique Australe",
    "Malawi": "Afrique Australe", "Maurice": "Afrique Australe",
    "Namibie": "Afrique Australe", "Zambie": "Afrique Australe",
}

# ── Cache global ───────────────────────────────────────────────────────────────

_SCORING_CACHE: dict | None = None
_CACHE_LOCK = threading.Lock()
_REFRESH_LOCK = threading.Lock()

SCORING_CACHE_TTL_DAYS = int(os.environ.get("SCORING_CACHE_TTL_DAYS", "30"))


# ── Sérialisation / Désérialisation ───────────────────────────────────────────

def _serialize_scoring(result: dict) -> str:
    return json.dumps(result)


def _deserialize_scoring(payload: str) -> dict:
    return json.loads(payload)


# ── Persistance DB ─────────────────────────────────────────────────────────────

def _save_to_db(result: dict, db: Session) -> None:
    try:
        db.query(ScoringCache).delete()
        new_entry = ScoringCache(
            computed_at=datetime.utcnow(),
            cache_data=_serialize_scoring(result),
        )
        db.add(new_entry)
        db.commit()
        logger.info("Cache scoring sauvegardé en DB")
    except Exception as exc:
        db.rollback()
        logger.warning("Impossible de sauvegarder le cache scoring en DB : %s", exc)


def _load_from_db(db: Session) -> dict | None:
    cutoff = datetime.utcnow() - timedelta(days=SCORING_CACHE_TTL_DAYS)
    entry = (
        db.query(ScoringCache)
        .filter(ScoringCache.computed_at >= cutoff)
        .order_by(ScoringCache.computed_at.desc())
        .first()
    )
    if entry:
        try:
            cache = _deserialize_scoring(entry.cache_data)
            logger.info("Cache scoring chargé depuis DB (calculé le %s)", entry.computed_at)
            return cache
        except Exception as exc:
            logger.warning("Cache scoring DB illisible (%s) — recalcul forcé", exc)
    return None


_CACHE_REQUIRED_KEYS = {"topsis", "clustering", "mc_scores", "pca_biplot", "concordance", "kpis"}


def _get_scoring() -> dict:
    """Renvoie le cache scoring (mémoire → DB → recalcul).
    Force un recalcul si le cache est obsolète (clés manquantes après une mise à jour)."""
    global _SCORING_CACHE
    if _SCORING_CACHE is None or not _CACHE_REQUIRED_KEYS.issubset(_SCORING_CACHE):
        with _CACHE_LOCK:
            if _SCORING_CACHE is None or not _CACHE_REQUIRED_KEYS.issubset(_SCORING_CACHE):
                db = SessionLocal()
                try:
                    cached = _load_from_db(db)
                    if cached is None or not _CACHE_REQUIRED_KEYS.issubset(cached):
                        cached = _compute_all_internal(db)
                    _SCORING_CACHE = cached
                finally:
                    db.close()
    return _SCORING_CACHE


def invalidate_scoring_cache(db: Session | None = None) -> None:
    """Purge le cache scoring mémoire + DB."""
    global _SCORING_CACHE
    own_session = db is None
    if own_session:
        db = SessionLocal()
    try:
        db.query(ScoringCache).delete()
        db.commit()
        logger.info("Cache scoring DB invalidé")
    except Exception as exc:
        db.rollback()
        logger.warning("Erreur invalidation cache scoring DB : %s", exc)
    finally:
        if own_session:
            db.close()
    with _CACHE_LOCK:
        _SCORING_CACHE = None


# ── Chargement des données 2030 ───────────────────────────────────────────────

def _get_2030_data() -> pd.DataFrame:
    """Extrait la matrice 2030 (pays × 8 variables) depuis le cache Prédictions."""
    from routers.predictions_axe2 import _get_pipeline
    pipeline_cache = _get_pipeline()
    df_pred: pd.DataFrame = pipeline_cache["df_pred"]
    pays_33: list[str] = pipeline_cache["pays_33"]

    df_2030 = df_pred[df_pred["Year"] == 2030].copy()

    rows: list[dict] = []
    for pays in pays_33:
        sub = df_2030[df_2030["Pays"] == pays]
        if sub.empty:
            continue
        r = sub.iloc[0]

        entry: dict[str, Any] = {
            "pays": pays,
            "region": PAYS_TO_REGION.get(pays, "Autre"),
        }

        for var in TOPSIS_VARS:
            pred_col = f"{var}_pred"
            val = _safe_float(r.get(pred_col))
            entry[var] = val

            # IC bounds: prefer lb80/ub80, fallback lb95/ub95, then 10% sigma
            lb80 = _safe_float(r.get(f"{var}_lb80"))
            ub80 = _safe_float(r.get(f"{var}_ub80"))
            lb95 = _safe_float(r.get(f"{var}_lb95"))
            ub95 = _safe_float(r.get(f"{var}_ub95"))

            if lb80 is not None and ub80 is not None:
                sigma = (ub80 - lb80) / 2.56   # 2 × 1.28σ
                entry[f"{var}_lb"] = lb80
                entry[f"{var}_ub"] = ub80
            elif lb95 is not None and ub95 is not None:
                sigma = (ub95 - lb95) / 3.92   # 2 × 1.96σ
                entry[f"{var}_lb"] = lb95
                entry[f"{var}_ub"] = ub95
            else:
                sigma = abs(val) * 0.10 if val is not None else None
                entry[f"{var}_lb"] = None
                entry[f"{var}_ub"] = None

            entry[f"{var}_sigma"] = sigma

        rows.append(entry)

    return pd.DataFrame(rows)


def _safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def _impute_matrix(X: np.ndarray) -> np.ndarray:
    """Impute NaN with column medians."""
    X = X.copy().astype(float)
    for j in range(X.shape[1]):
        col = X[:, j]
        mask = np.isnan(col)
        if mask.any():
            med = np.nanmedian(col)
            col[mask] = med if not np.isnan(med) else 0.0
        X[:, j] = col
    return X


# ── PCA Weights ───────────────────────────────────────────────────────────────

def _compute_pca_weights(df: pd.DataFrame) -> np.ndarray:
    """Retourne les poids normalisés depuis les loadings PC1."""
    X = df[TOPSIS_VARS].values.copy()
    X = _impute_matrix(X)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    pca = PCA(n_components=len(TOPSIS_VARS), random_state=42)
    pca.fit(X_scaled)

    # PC1 loadings (absolute values, normalized to sum=1)
    loadings = np.abs(pca.components_[0])
    if loadings.sum() == 0:
        loadings = np.ones(len(TOPSIS_VARS))
    weights = loadings / loadings.sum()
    return weights


# ── TOPSIS ─────────────────────────────────────────────────────────────────────

def _topsis_score(R: np.ndarray, weights: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """TOPSIS classique — retourne (scores, d_plus, d_minus)."""
    V = R * weights
    A_plus = V.max(axis=0)
    A_minus = V.min(axis=0)
    d_plus = np.sqrt(((V - A_plus) ** 2).sum(axis=1))
    d_minus = np.sqrt(((V - A_minus) ** 2).sum(axis=1))
    scores = d_minus / (d_plus + d_minus + 1e-12)
    return scores, d_plus, d_minus


def _rank_from_scores(scores: np.ndarray, ascending: bool = False) -> np.ndarray:
    """Rangs depuis un tableau de scores (1 = meilleur)."""
    order = np.argsort(scores)[::-1] if not ascending else np.argsort(scores)
    ranks = np.empty_like(order)
    ranks[order] = np.arange(1, len(order) + 1)
    return ranks


def _compute_topsis(df: pd.DataFrame, weights: np.ndarray) -> dict:
    """TOPSIS + équipondéré + sensibilité Dirichlet."""
    pays_list = df["pays"].tolist()
    n = len(pays_list)
    k = len(TOPSIS_VARS)

    X = _impute_matrix(df[TOPSIS_VARS].values)

    # Invert cost criteria so TOPSIS can always maximize
    X_topsis = X.copy()
    for j, var in enumerate(TOPSIS_VARS):
        if var in COST_CRITERIA:
            X_topsis[:, j] = -X_topsis[:, j]

    # Euclidean normalization
    norms = np.sqrt((X_topsis ** 2).sum(axis=0))
    norms[norms == 0] = 1.0
    R = X_topsis / norms

    # PCA-weighted TOPSIS
    scores_pca, d_plus, d_minus = _topsis_score(R, weights)
    ranks_pca = _rank_from_scores(scores_pca)

    # Equi-weighted TOPSIS
    w_equi = np.ones(k) / k
    scores_equi, _, _ = _topsis_score(R, w_equi)
    ranks_equi = _rank_from_scores(scores_equi)

    # Sensitivity: N_SENS Dirichlet draws
    rng = np.random.default_rng(42)
    rank_distrib = np.zeros((n, N_SENS), dtype=int)
    for trial in range(N_SENS):
        w_k = rng.dirichlet(np.ones(k))
        s_k, _, _ = _topsis_score(R, w_k)
        rank_distrib[:, trial] = _rank_from_scores(s_k)

    rang_q10 = np.percentile(rank_distrib, 10, axis=1).astype(int)
    rang_q90 = np.percentile(rank_distrib, 90, axis=1).astype(int)

    # Z-scores for heatmap (relative performance)
    scaler = StandardScaler()
    X_norm = scaler.fit_transform(X)

    classement = []
    for i, pays in enumerate(pays_list):
        sc = float(scores_pca[i])
        rg = int(ranks_pca[i])
        badge = "ATTRACTIF" if rg <= 10 else ("NEUTRE" if rg <= 20 else "À ÉVITER")

        row: dict[str, Any] = {
            "pays": pays,
            "region": df.iloc[i]["region"],
            "rang": rg,
            "score_topsis": round(sc, 4),
            "rang_equi": int(ranks_equi[i]),
            "score_equi": round(float(scores_equi[i]), 4),
            "d_plus": round(float(d_plus[i]), 4),
            "d_minus": round(float(d_minus[i]), 4),
            "rang_q10_sens": int(rang_q10[i]),
            "rang_q90_sens": int(rang_q90[i]),
            "badge": badge,
        }
        # Add raw & normalized values for heatmap
        for j, var in enumerate(TOPSIS_VARS):
            row[f"{var}_raw"] = round(float(X[i, j]), 4)
            row[f"{var}_norm"] = round(float(X_norm[i, j]), 3)
        classement.append(row)

    classement.sort(key=lambda x: x["rang"])

    pca_weights_list = [
        {"variable": var, "label": TOPSIS_LABELS[var], "weight": round(float(weights[j]), 4)}
        for j, var in enumerate(TOPSIS_VARS)
    ]

    return {
        "classement": classement,
        "pca_weights": pca_weights_list,
    }


# ── Clustering ─────────────────────────────────────────────────────────────────

def _assign_cluster_labels(df_result: pd.DataFrame) -> dict[int, str]:
    """Assigne les labels clusters basés sur le score TOPSIS moyen — noms alignés notebook bloc2."""
    cluster_avg = df_result.groupby("cluster")["score_topsis"].mean().sort_values(ascending=False)
    label_map_ordered = [
        "Niches Performants",
        "Grands Marchés Actifs",
        "Marchés Émergents Stables",
        "Marchés Contraints",
    ]
    labels: dict[int, str] = {}
    for rank_idx, (cluster_id, _) in enumerate(cluster_avg.items()):
        labels[int(cluster_id)] = label_map_ordered[min(rank_idx, 3)]
    # Fill missing clusters
    for c in range(4):
        if c not in labels:
            labels[c] = label_map_ordered[len(labels)]
    return labels


def _compute_clustering(df: pd.DataFrame, topsis_classement: list[dict]) -> dict:
    """K-Means k=4 + t-SNE 2D — paramètres alignés sur notebook bloc2."""
    pays_list = df["pays"].tolist()
    n = len(pays_list)

    # 7 features (sans nv_densite) — identique au notebook
    X = _impute_matrix(df[CLUSTER_VARS].values)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=4, random_state=42, n_init=20)
    cluster_ids = kmeans.fit_predict(X_scaled)
    centroids_scaled = kmeans.cluster_centers_  # (4, 7)
    # Back-transform centroids to original scale
    centroids_orig = scaler.inverse_transform(centroids_scaled)

    # t-SNE 2D — perplexity=8, max_iter=2000 comme le notebook
    perplexity = min(8, n - 1)
    tsne = TSNE(n_components=2, perplexity=perplexity, random_state=42, max_iter=2000)
    X_tsne = tsne.fit_transform(X_scaled)

    # Build score_topsis lookup
    topsis_lookup = {row["pays"]: row["score_topsis"] for row in topsis_classement}

    # Attach TOPSIS scores to df temporarily for label assignment
    df_tmp = pd.DataFrame({
        "pays": pays_list,
        "cluster": cluster_ids.tolist(),
        "score_topsis": [topsis_lookup.get(p, 0.0) for p in pays_list],
    })

    cluster_labels = _assign_cluster_labels(df_tmp)

    countries = []
    for i, pays in enumerate(pays_list):
        c_id = int(cluster_ids[i])
        countries.append({
            "pays": pays,
            "region": df.iloc[i]["region"],
            "cluster": c_id,
            "cluster_label": cluster_labels.get(c_id, f"Cluster {c_id+1}"),
            "tsne_x": round(float(X_tsne[i, 0]), 3),
            "tsne_y": round(float(X_tsne[i, 1]), 3),
            "score_topsis": topsis_lookup.get(pays, 0.0),
        })

    # Centroids (normalized for radar chart — 0-1 per variable)
    centroids_list = []
    # Normalize centroid values between 0 and 1 for radar display
    for j, var in enumerate(CLUSTER_VARS):
        col_vals = centroids_orig[:, j]
        col_min, col_max = col_vals.min(), col_vals.max()
        col_range = col_max - col_min if col_max != col_min else 1.0
        for c_id in range(4):
            val_norm = float((centroids_orig[c_id, j] - col_min) / col_range)
            val_raw = float(centroids_orig[c_id, j])
            centroids_list.append({
                "cluster": c_id,
                "cluster_label": cluster_labels.get(c_id, f"Cluster {c_id+1}"),
                "variable": var,
                "label": TOPSIS_LABELS[var],
                "value_norm": round(val_norm, 3),
                "value_raw": round(val_raw, 4),
            })

    # Cluster cards: count + avg TOPSIS
    cluster_cards = []
    for c_id in range(4):
        members = [c["pays"] for c in countries if c["cluster"] == c_id]
        avg_score = np.mean([topsis_lookup.get(p, 0.0) for p in members]) if members else 0.0
        cluster_cards.append({
            "cluster": c_id,
            "label": cluster_labels.get(c_id, f"Cluster {c_id+1}"),
            "pays": members,
            "n_pays": len(members),
            "score_topsis_moyen": round(float(avg_score), 4),
        })
    cluster_cards.sort(key=lambda x: x["score_topsis_moyen"], reverse=True)

    return {
        "countries": countries,
        "centroids": centroids_list,
        "cluster_labels": {str(k): v for k, v in cluster_labels.items()},
        "cluster_cards": cluster_cards,
    }


# ── Monte Carlo Scores ─────────────────────────────────────────────────────────

def _compute_mc_scores(df: pd.DataFrame, pca_weights: np.ndarray) -> dict:
    """N_MC tirages de scores composites sous incertitude conformal."""
    pays_list = df["pays"].tolist()
    n = len(pays_list)
    k = len(TOPSIS_VARS)

    # Base predictions (imputed)
    X_base = _impute_matrix(df[TOPSIS_VARS].values)

    # Sigma matrix (n × k)
    sigma_matrix = np.zeros((n, k))
    for j, var in enumerate(TOPSIS_VARS):
        for i in range(n):
            s = df.iloc[i].get(f"{var}_sigma")
            if s is not None and not np.isnan(float(s if s is not None else np.nan)):
                sigma_matrix[i, j] = abs(float(s))
            else:
                sigma_matrix[i, j] = abs(X_base[i, j]) * 0.10

    rng = np.random.default_rng(42)

    # Store rank and score per draw
    rank_distrib = np.zeros((n, N_MC), dtype=int)
    score_distrib = np.zeros((n, N_MC))

    for trial in range(N_MC):
        # Perturb predictions with Gaussian noise (truncated at ±3σ)
        Z = np.clip(rng.standard_normal((n, k)), -3.0, 3.0)
        X_trial = X_base + sigma_matrix * Z

        # Clip negative values for positive variables
        for j, var in enumerate(TOPSIS_VARS):
            if var not in ("polstab", "regqual"):
                X_trial[:, j] = np.maximum(X_trial[:, j], 1e-6)

        # Invert cost criterion
        X_for_score = X_trial.copy()
        for j, var in enumerate(TOPSIS_VARS):
            if var in COST_CRITERIA:
                X_for_score[:, j] = -X_for_score[:, j]

        # Min-max normalize per column
        col_min = X_for_score.min(axis=0)
        col_max = X_for_score.max(axis=0)
        col_range = col_max - col_min
        col_range[col_range == 0] = 1.0
        X_norm = (X_for_score - col_min) / col_range

        # Composite score = weighted sum
        composite = X_norm @ pca_weights

        # Rank (1 = highest score)
        rank_distrib[:, trial] = _rank_from_scores(composite)
        score_distrib[:, trial] = composite

    # Percentiles
    score_p10 = np.percentile(score_distrib, 10, axis=1)
    score_p50 = np.percentile(score_distrib, 50, axis=1)
    score_p90 = np.percentile(score_distrib, 90, axis=1)

    rang_p10 = np.percentile(rank_distrib, 10, axis=1).astype(int)
    rang_p50 = np.percentile(rank_distrib, 50, axis=1).astype(int)
    rang_p90 = np.percentile(rank_distrib, 90, axis=1).astype(int)

    # Probability Top N
    prob_top5 = (rank_distrib <= 5).mean(axis=1)
    prob_top10 = (rank_distrib <= 10).mean(axis=1)
    prob_top15 = (rank_distrib <= 15).mean(axis=1)

    # Amplitude = P90 score - P10 score
    amplitude = score_p90 - score_p10

    classement = []
    for i, pays in enumerate(pays_list):
        classement.append({
            "pays": pays,
            "region": df.iloc[i]["region"],
            "rang_p50": int(rang_p50[i]),
            "rang_p10": int(rang_p10[i]),
            "rang_p90": int(rang_p90[i]),
            "score_p50": round(float(score_p50[i]), 4),
            "score_p10": round(float(score_p10[i]), 4),
            "score_p90": round(float(score_p90[i]), 4),
            "prob_top5": round(float(prob_top5[i]), 4),
            "prob_top10": round(float(prob_top10[i]), 4),
            "prob_top15": round(float(prob_top15[i]), 4),
            "amplitude": round(float(amplitude[i]), 4),
        })

    classement.sort(key=lambda x: x["rang_p50"])

    # Stability matrix: top 15 countries by P50 rank
    top15 = [row["pays"] for row in classement[:15]]
    top15_idx = [pays_list.index(p) for p in top15 if p in pays_list]

    stability = []
    for ia, pays_a in enumerate(top15):
        ia_idx = top15_idx[ia]
        for ib, pays_b in enumerate(top15):
            if pays_a == pays_b:
                continue
            ib_idx = top15_idx[ib]
            # P(A ranks better than B)
            prob = float((rank_distrib[ia_idx] < rank_distrib[ib_idx]).mean())
            stability.append({
                "pays_a": pays_a,
                "pays_b": pays_b,
                "prob": round(prob, 3),
            })

    return {
        "classement": classement,
        "stability_matrix": stability,
    }


# ── Calcul global (mise en cache) ─────────────────────────────────────────────

def _compute_pca_biplot(df: pd.DataFrame) -> dict:
    """Calcule les données du biplot PCA (scores F1×F2 + loadings Varimax)."""
    pays_list = df["pays"].tolist()

    X = _impute_matrix(df[TOPSIS_VARS].values)
    sp_idx = TOPSIS_VARS.index("nv_sp")
    X_b = X.copy()
    X_b[:, sp_idx] = -X_b[:, sp_idx]

    scaler = StandardScaler()
    X_std = scaler.fit_transform(X_b)

    pca = PCA(n_components=3, random_state=42)
    pca.fit(X_std)
    loadings_raw = pca.components_.T * np.sqrt(pca.explained_variance_)
    loadings_v = _varimax(loadings_raw)

    SS = np.sum(loadings_v ** 2, axis=0)
    var_pct = SS / len(TOPSIS_VARS)

    L = loadings_v
    scores_v = X_std @ L @ np.linalg.inv(L.T @ L)

    countries = [
        {
            "pays":   pays_list[i],
            "region": df.iloc[i]["region"],
            "f1":     round(float(scores_v[i, 0]), 4),
            "f2":     round(float(scores_v[i, 1]), 4),
        }
        for i in range(len(pays_list))
    ]

    loadings_out = [
        {
            "variable": var,
            "label":    BIPLOT_LABELS[var],
            "f1":       round(float(loadings_v[j, 0]), 4),
            "f2":       round(float(loadings_v[j, 1]), 4),
        }
        for j, var in enumerate(TOPSIS_VARS)
    ]

    return {
        "countries":      countries,
        "loadings":       loadings_out,
        "variance_f1":    round(float(var_pct[0]) * 100, 1),
        "variance_f2":    round(float(var_pct[1]) * 100, 1),
        "factor_name_f1": FACTOR_NAMES["F1"],
        "factor_name_f2": FACTOR_NAMES["F2"],
    }


def _compute_all_internal(db: Session | None = None) -> dict:
    logger.info("Scoring Axe 2 — calcul en cours (TOPSIS + Clustering + MC + Biplot)…")

    df = _get_2030_data()
    pca_weights = _compute_pca_weights(df)

    topsis = _compute_topsis(df, pca_weights)
    clustering = _compute_clustering(df, topsis["classement"])
    mc_scores = _compute_mc_scores(df, pca_weights)
    pca_biplot = _compute_pca_biplot(df)

    # Concordance inter-méthodes
    topsis_rank = {r["pays"]: r["rang"] for r in topsis["classement"]}
    mc_rank = {r["pays"]: r["rang_p50"] for r in mc_scores["classement"]}

    topsis_cluster_rank: dict[str, int] = {}
    for card in clustering["cluster_cards"]:
        members_sorted = sorted(
            card["pays"],
            key=lambda p: topsis_rank.get(p, 99),
        )
        for local_rank, p in enumerate(members_sorted, 1):
            topsis_cluster_rank[p] = local_rank

    all_pays = list(topsis_rank.keys())
    concordance = []
    for pays in all_pays:
        rg_t = topsis_rank.get(pays, 99)
        rg_m = mc_rank.get(pays, 99)
        delta = abs(rg_t - rg_m)
        concordance.append({
            "pays": pays,
            "region": PAYS_TO_REGION.get(pays, "Autre"),
            "rang_topsis": rg_t,
            "rang_mc_p50": rg_m,
            "delta": delta,
            "robust": delta <= 3,
            "score_topsis": next((r["score_topsis"] for r in topsis["classement"] if r["pays"] == pays), 0.0),
            "score_mc_p50": next((r["score_p50"] for r in mc_scores["classement"] if r["pays"] == pays), 0.0),
        })
    concordance.sort(key=lambda x: x["rang_topsis"])

    # KPI aggregates
    top1 = topsis["classement"][0]["pays"] if topsis["classement"] else "—"
    robust_count = sum(1 for c in concordance if c["robust"])
    consensus_pct = round(100 * robust_count / max(len(concordance), 1), 1)

    result = {
        "topsis": topsis,
        "clustering": clustering,
        "mc_scores": mc_scores,
        "pca_biplot": pca_biplot,
        "concordance": concordance,
        "kpis": {
            "n_marches": len(all_pays),
            "methode_principale": "TOPSIS + PCA",
            "consensus_pct": consensus_pct,
            "marche_top1": top1,
        },
        "pca_weights": topsis["pca_weights"],
    }

    if db is not None:
        _save_to_db(result, db)

    logger.info("Scoring Axe 2 — calcul terminé (%d pays)", len(all_pays))
    return result


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/metadata")
def get_metadata():
    """Métadonnées : pays, régions, variables, méthodes."""
    try:
        from routers.predictions_axe2 import _get_pipeline
        pipeline_cache = _get_pipeline()
        pays_33 = pipeline_cache["pays_33"]
        return {
            "pays": pays_33,
            "regions": list(set(PAYS_TO_REGION.values())),
            "variables": [
                {"variable": var, "label": TOPSIS_LABELS[var], "is_cost": var in COST_CRITERIA}
                for var in TOPSIS_VARS
            ],
            "methodes": ["TOPSIS+PCA", "TOPSIS Équipondéré", "Clustering K-Means", "Monte Carlo Scores"],
            "n_mc": N_MC,
        }
    except Exception as exc:
        logger.error("Scoring metadata error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/topsis")
def get_topsis():
    """TOPSIS multi-critères avec poids PCA + équipondéré + sensibilité."""
    try:
        cache = _get_scoring()
        return cache["topsis"]
    except Exception as exc:
        logger.error("Scoring TOPSIS error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/clustering")
def get_clustering():
    """K-Means k=4 + t-SNE 2D + cards clusters."""
    try:
        cache = _get_scoring()
        return cache["clustering"]
    except Exception as exc:
        logger.error("Scoring clustering error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/monte-carlo-scores")
def get_monte_carlo_scores():
    """Monte Carlo 10000 tirages sur les scores composites."""
    try:
        cache = _get_scoring()
        return cache["mc_scores"]
    except Exception as exc:
        logger.error("Scoring MC error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/overview")
def get_overview():
    """Vue consolidée : TOPSIS + Clustering + MC + concordance + KPIs."""
    try:
        return _get_scoring()
    except Exception as exc:
        logger.error("Scoring overview error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


def _varimax(Phi: np.ndarray, gamma: float = 1.0, q: int = 200, tol: float = 1e-8) -> np.ndarray:
    p, k = Phi.shape
    R = np.eye(k)
    d = 0.0
    for _ in range(q):
        d_old = d
        Lambda = Phi @ R
        u, s, vh = np.linalg.svd(
            Phi.T @ (Lambda ** 3 - (gamma / p) * Lambda @ np.diag(np.diag(Lambda.T @ Lambda)))
        )
        R = u @ vh
        d = float(np.sum(s))
        if d_old != 0 and d / d_old < 1 + tol:
            break
    return Phi @ R


BIPLOT_LABELS = {
    "nv_penetration": "NV Pénétration (%)",
    "vie_penetration": "Vie Pénétration (%)",
    "nv_sp":           "Ratio S/P (%)",
    "gdpcap":          "PIB/hab (USD)",
    "polstab":         "Stabilité Politique",
    "regqual":         "Qualité Régl.",
    "nv_primes":       "NV Primes (M USD)",
    "nv_densite":      "NV Densité (USD/hab)",
}

FACTOR_NAMES = {
    "F1": "Richesse & Gouvernance",
    "F2": "Rentabilité & Volume",
    "F3": "Pénétration Assurance",
}


@router.get("/pca-biplot-data")
def get_pca_biplot_data():
    """Données du biplot PCA (scores F1×F2 par pays + loadings Varimax, 3 composantes)."""
    try:
        return _get_scoring()["pca_biplot"]
    except Exception as exc:
        logger.error("Scoring pca-biplot-data error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
