"""
Walk-forward R² pour gdp_growth (Étape 2c).
Réplique exactement le modèle Ridge hiérarchique de _step2c_gdp_growth,
mais en mode walk-forward sur 2020-2024 — sans blending Axco.
"""
from __future__ import annotations

import os
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)

from routers.predictions_axe2 import (  # noqa: E402
    _load_panel_from_db,
    BRENT_LAG1,
    GDP_GROWTH_MIN, GDP_GROWTH_MAX,
    MU_WINDOW_GROWTH, MU_GROWTH_CLIP, MU_GROWTH_DEFAULT,
)

EVAL_YEARS = [2020, 2021, 2022, 2023, 2024]


def fit_ridge_hierarchique(df_train: pd.DataFrame):
    """Reproduit l'entraînement Ridge hiérarchique de _step2c_gdp_growth sur df_train."""
    pays_train = sorted(df_train["Pays"].unique())

    mu_pays_dict: dict = {}
    for pays in pays_train:
        df_p = df_train[df_train["Pays"] == pays]
        g_window = df_p[df_p["Year"].isin(MU_WINDOW_GROWTH)]["gdp_growth"].dropna()
        mu_p = float(g_window.mean()) if len(g_window) > 0 else MU_GROWTH_DEFAULT
        mu_pays_dict[pays] = float(np.clip(mu_p, MU_GROWTH_CLIP[0], MU_GROWTH_CLIP[1]))

    df_gdp = df_train.dropna(subset=["gdp_growth", "gdp_growth_lag1", "inflation_lag1"]).copy()
    df_gdp["brent_lag1"] = df_gdp["Year"].map(BRENT_LAG1)
    df_gdp["mu_pays"] = df_gdp["Pays"].map(mu_pays_dict)
    df_gdp["g_lag_dev"] = df_gdp["gdp_growth_lag1"] - df_gdp["mu_pays"]

    pays_dum_g = pd.get_dummies(df_gdp["Pays"], prefix="pays", drop_first=True).astype(float)
    pays_int_g = pays_dum_g.multiply(df_gdp["g_lag_dev"].values, axis=0)
    pays_int_g.columns = [c.replace("pays_", "rho_") for c in pays_int_g.columns]

    X_g = pd.concat([
        df_gdp[["g_lag_dev", "inflation_lag1", "brent_lag1"]].reset_index(drop=True),
        pays_dum_g.reset_index(drop=True),
        pays_int_g.reset_index(drop=True),
    ], axis=1)
    y_g = df_gdp["gdp_growth"].values - df_gdp["mu_pays"].values

    scaler_g = StandardScaler().fit(X_g.values)
    X_g_sc = scaler_g.transform(X_g.values)
    ridge_g = RidgeCV(alphas=[0.05, 0.5, 1.0, 5.0, 10.0, 30.0, 100.0], cv=5).fit(X_g_sc, y_g)

    feat_names_g = list(X_g.columns)
    return ridge_g, scaler_g, feat_names_g, mu_pays_dict


def predict_one(
    pays: str, g_lag1: float, infl_lag1: float, brent_lag1: float,
    ridge_g, scaler_g, feat_names_g, mu_pays_dict,
) -> float | None:
    if pays not in mu_pays_dict:
        return None
    mu_p = mu_pays_dict[pays]
    g_lag_dev = g_lag1 - mu_p
    n_feat_g = len(feat_names_g)
    row = np.zeros(n_feat_g, dtype=float)
    row[feat_names_g.index("g_lag_dev")] = g_lag_dev
    row[feat_names_g.index("inflation_lag1")] = infl_lag1
    row[feat_names_g.index("brent_lag1")] = brent_lag1
    pcol, rcol = f"pays_{pays}", f"rho_{pays}"
    if pcol in feat_names_g:
        row[feat_names_g.index(pcol)] = 1.0
    if rcol in feat_names_g:
        row[feat_names_g.index(rcol)] = g_lag_dev
    y_centered = ridge_g.predict(scaler_g.transform(row.reshape(1, -1)))[0]
    g_pred = float(np.clip(mu_p + y_centered, GDP_GROWTH_MIN, GDP_GROWTH_MAX))
    return g_pred


def walk_forward_r2(df: pd.DataFrame) -> dict:
    """Réentraîne année par année et accumule (vrai, prédit). One-step-ahead."""
    pairs_global: list[tuple[float, float]] = []
    per_year: dict[int, list[tuple[float, float]]] = {y: [] for y in EVAL_YEARS}

    for test_year in EVAL_YEARS:
        df_tr = df[df["Year"] < test_year].copy()
        df_te = df[df["Year"] == test_year].copy()

        ridge_g, scaler_g, feat_names_g, mu_pays_dict = fit_ridge_hierarchique(df_tr)

        for _, row in df_te.iterrows():
            pays = row["Pays"]
            g_true = row.get("gdp_growth", np.nan)
            g_lag1 = row.get("gdp_growth_lag1", np.nan)
            infl_lag1 = row.get("inflation_lag1", np.nan)
            brent_lag1 = BRENT_LAG1.get(int(row["Year"]), np.nan)
            if any(pd.isna(v) for v in [g_true, g_lag1, infl_lag1, brent_lag1]):
                continue
            g_pred = predict_one(
                pays, float(g_lag1), float(infl_lag1), float(brent_lag1),
                ridge_g, scaler_g, feat_names_g, mu_pays_dict,
            )
            if g_pred is None:
                continue
            pairs_global.append((float(g_true), g_pred))
            per_year[test_year].append((float(g_true), g_pred))

    return {"global": pairs_global, "per_year": per_year}


def metrics_from_pairs(pairs: list[tuple[float, float]]) -> dict:
    if not pairs:
        return {"n": 0, "r2": None, "mape": None, "mae": None, "rmse": None}
    yt = np.array([p[0] for p in pairs])
    yp = np.array([p[1] for p in pairs])
    ss_res = float(np.sum((yt - yp) ** 2))
    ss_tot = float(np.sum((yt - yt.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else None
    mae = float(np.mean(np.abs(yt - yp)))
    rmse = float(np.sqrt(np.mean((yt - yp) ** 2)))
    mask = np.abs(yt) > 0.5  # avoid blowing MAPE on near-zero growth
    mape = (float(np.mean(np.abs((yt[mask] - yp[mask]) / yt[mask])) * 100)
            if mask.sum() > 0 else None)
    return {"n": int(len(pairs)), "r2": r2, "mape": mape, "mae": mae, "rmse": rmse}


def naive_baseline(df: pd.DataFrame) -> dict:
    """Baseline 1: persistance — y_pred = y_lag1."""
    pairs = []
    for test_year in EVAL_YEARS:
        df_te = df[df["Year"] == test_year]
        for _, row in df_te.iterrows():
            yt = row.get("gdp_growth", np.nan)
            yp = row.get("gdp_growth_lag1", np.nan)
            if pd.isna(yt) or pd.isna(yp):
                continue
            pairs.append((float(yt), float(yp)))
    return metrics_from_pairs(pairs)


def mu_baseline(df: pd.DataFrame) -> dict:
    """Baseline 2: moyenne historique pays (μ_pays calculée sur Year < test_year)."""
    pairs = []
    for test_year in EVAL_YEARS:
        df_tr = df[df["Year"] < test_year]
        df_te = df[df["Year"] == test_year]
        mu_dict = {}
        for pays in df_tr["Pays"].unique():
            g = df_tr[(df_tr["Pays"] == pays) &
                      (df_tr["Year"].isin(MU_WINDOW_GROWTH))]["gdp_growth"].dropna()
            if len(g) > 0:
                mu_dict[pays] = float(g.mean())
        for _, row in df_te.iterrows():
            yt = row.get("gdp_growth", np.nan)
            pays = row["Pays"]
            if pd.isna(yt) or pays not in mu_dict:
                continue
            pairs.append((float(yt), mu_dict[pays]))
    return metrics_from_pairs(pairs)


def main():
    print("=" * 78)
    print("Walk-forward R² — gdp_growth (Ridge hiérarchique, sans blending Axco)")
    print("=" * 78)

    df = _load_panel_from_db()
    print(f"\nPanel chargé : {len(df)} lignes, {df['Pays'].nunique()} pays, "
          f"années {df['Year'].min()}-{df['Year'].max()}")

    print("\n--- Modèle Ridge hiérarchique (walk-forward) ---")
    wf = walk_forward_r2(df)
    m_global = metrics_from_pairs(wf["global"])
    print(f"\nGlobal (n={m_global['n']}):")
    print(f"  R²    = {m_global['r2']:.4f}" if m_global['r2'] is not None else "  R²    = None")
    print(f"  MAE   = {m_global['mae']:.4f} pts de %")
    print(f"  RMSE  = {m_global['rmse']:.4f} pts de %")
    print(f"  MAPE  = {m_global['mape']:.2f}%" if m_global['mape'] is not None else "  MAPE  = None")

    print("\nPar année de test :")
    print(f"  {'Year':<6} {'n':>4} {'R²':>9} {'MAE':>8} {'RMSE':>8}")
    for yr in EVAL_YEARS:
        m = metrics_from_pairs(wf["per_year"][yr])
        r2_str = f"{m['r2']:.4f}" if m['r2'] is not None else "    —   "
        mae_str = f"{m['mae']:.3f}" if m['mae'] is not None else "    —"
        rmse_str = f"{m['rmse']:.3f}" if m['rmse'] is not None else "    —"
        print(f"  {yr:<6} {m['n']:>4} {r2_str:>9} {mae_str:>8} {rmse_str:>8}")

    print("\n--- Baselines (référence) ---")
    m_persist = naive_baseline(df)
    m_mu = mu_baseline(df)
    print(f"Persistance (y = y_lag1) :  R2={m_persist['r2']:.4f}, MAE={m_persist['mae']:.3f}, n={m_persist['n']}")
    print(f"Mu pays (moyenne 2018+)  :  R2={m_mu['r2']:.4f}, MAE={m_mu['mae']:.3f}, n={m_mu['n']}")

    print("\n--- Hors annees de choc (exclut 2020 COVID, 2022 Ukraine) ---")
    pairs_calm = []
    for yr in [2021, 2023, 2024]:
        pairs_calm.extend(wf["per_year"][yr])
    m_calm = metrics_from_pairs(pairs_calm)
    print(f"Modele Ridge (2021,2023,2024) : R2={m_calm['r2']:.4f}, MAE={m_calm['mae']:.3f}, n={m_calm['n']}")

    pairs_persist_calm = []
    pairs_mu_calm = []
    for test_year in [2021, 2023, 2024]:
        df_te = df[df["Year"] == test_year]
        df_tr = df[df["Year"] < test_year]
        mu_dict = {}
        for pays in df_tr["Pays"].unique():
            g = df_tr[(df_tr["Pays"] == pays) &
                      (df_tr["Year"].isin(MU_WINDOW_GROWTH))]["gdp_growth"].dropna()
            if len(g) > 0:
                mu_dict[pays] = float(g.mean())
        for _, row in df_te.iterrows():
            yt = row.get("gdp_growth", np.nan)
            yp = row.get("gdp_growth_lag1", np.nan)
            pays = row["Pays"]
            if not pd.isna(yt) and not pd.isna(yp):
                pairs_persist_calm.append((float(yt), float(yp)))
            if not pd.isna(yt) and pays in mu_dict:
                pairs_mu_calm.append((float(yt), mu_dict[pays]))
    mp = metrics_from_pairs(pairs_persist_calm)
    mm = metrics_from_pairs(pairs_mu_calm)
    print(f"Persistance (y_lag1)         : R2={mp['r2']:.4f}, MAE={mp['mae']:.3f}, n={mp['n']}")
    print(f"Mu pays (moyenne 2018+)      : R2={mm['r2']:.4f}, MAE={mm['mae']:.3f}, n={mm['n']}")

    print("\n" + "=" * 78)
    print("Note : R² négatif = pire que prédire la moyenne globale de l'échantillon test.")
    print("=" * 78)


if __name__ == "__main__":
    main()
