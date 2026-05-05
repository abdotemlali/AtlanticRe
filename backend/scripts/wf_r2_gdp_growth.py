"""
Walk-forward R² pour gdp_growth (Étape 2c).
Réplique le nouveau modèle Ridge Tendance+Inflation de _step2c_gdp_growth :
  - 2 features : infl_pen = max(0, infl-7), infl_bon = max(0, 3-infl)
  - anchor déterministe : 0.80*mu_long + 0.20*(slope*year + intercept)
  - entraînement strict Year ≤ 2022, OOS sur 2023-2024
"""
from __future__ import annotations

import os
import sys
import warnings

import numpy as np
import pandas as pd
from scipy.stats import linregress
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)

from routers.predictions_axe2 import (  # noqa: E402
    _load_panel_from_db,
    GDP_GROWTH_MIN, GDP_GROWTH_MAX,
    MU_WINDOW_GROWTH, MU_GROWTH_CLIP, MU_GROWTH_DEFAULT,
    INFL_PENALTY_THRESH, INFL_BONUS_THRESH,
)

OOS_YEARS = [2023, 2024]


def fit_ridge_inflation(df_train: pd.DataFrame):
    """Entraîne le Ridge Tendance+Inflation sur df_train (Year ≤ 2022)."""
    pays_train = sorted(df_train["Pays"].unique())
    df_strict = df_train[df_train["Year"] <= 2022].copy()

    mu_long_dict: dict = {}
    trend_dict: dict = {}
    for pays in pays_train:
        df_p = df_strict[(df_strict["Pays"] == pays) &
                         (df_strict["Year"].isin(MU_WINDOW_GROWTH))].dropna(subset=["gdp_growth"])
        if len(df_p) >= 2:
            mu = float(np.clip(df_p["gdp_growth"].mean(), MU_GROWTH_CLIP[0], MU_GROWTH_CLIP[1]))
            sl, ic, *_ = linregress(df_p["Year"].values, df_p["gdp_growth"].values)
        else:
            mu, sl, ic = MU_GROWTH_DEFAULT, 0.0, MU_GROWTH_DEFAULT
        mu_long_dict[pays] = mu
        trend_dict[pays] = (float(sl), float(ic))

    df_fit = df_strict.dropna(subset=["gdp_growth", "inflation_lag1"]).copy()
    df_fit = df_fit[df_fit["Pays"].isin(pays_train)].copy()
    df_fit["mu_long"] = df_fit["Pays"].map(mu_long_dict)
    df_fit["g_trend"] = df_fit.apply(
        lambda r: trend_dict[r["Pays"]][0] * r["Year"] + trend_dict[r["Pays"]][1], axis=1
    )
    df_fit["anchor"] = 0.80 * df_fit["mu_long"] + 0.20 * df_fit["g_trend"]
    df_fit["infl_pen"] = np.maximum(df_fit["inflation_lag1"] - INFL_PENALTY_THRESH, 0.0)
    df_fit["infl_bon"] = np.maximum(INFL_BONUS_THRESH - df_fit["inflation_lag1"], 0.0)
    df_fit["target_c"] = df_fit["gdp_growth"] - df_fit["anchor"]
    df_fit = df_fit.dropna(subset=["infl_pen", "infl_bon", "target_c"])

    if len(df_fit) < 10:
        return None, None, mu_long_dict, trend_dict

    sc = StandardScaler().fit(df_fit[["infl_pen", "infl_bon"]].values)
    ridge = RidgeCV(alphas=[0.01, 0.1, 1, 5, 10, 30, 100, 300, 1000], cv=5).fit(
        sc.transform(df_fit[["infl_pen", "infl_bon"]].values),
        df_fit["target_c"].values
    )
    return ridge, sc, mu_long_dict, trend_dict


def predict_one(pays: str, test_year: int, infl_lag1: float,
                ridge, sc, mu_long_dict: dict, trend_dict: dict) -> float | None:
    if pays not in mu_long_dict or ridge is None:
        return None
    mu_p = mu_long_dict[pays]
    sl, ic = trend_dict.get(pays, (0.0, mu_p))
    anchor = 0.80 * mu_p + 0.20 * (sl * test_year + ic)
    infl_pen = max(0.0, infl_lag1 - INFL_PENALTY_THRESH)
    infl_bon = max(0.0, INFL_BONUS_THRESH - infl_lag1)
    feat = sc.transform([[infl_pen, infl_bon]])
    return float(np.clip(anchor + ridge.predict(feat)[0], GDP_GROWTH_MIN, GDP_GROWTH_MAX))


def oos_evaluation(df: pd.DataFrame) -> dict:
    """Évaluation OOS stricte : train Year ≤ 2022, test sur 2023 et 2024."""
    df_train = df[df["Year"] <= 2022].copy()
    ridge, sc, mu_long_dict, trend_dict = fit_ridge_inflation(df_train)

    pairs_global: list[tuple[float, float]] = []
    per_year: dict[int, list[tuple[float, float]]] = {y: [] for y in OOS_YEARS}

    for test_year in OOS_YEARS:
        df_te = df[df["Year"] == test_year].dropna(subset=["gdp_growth", "inflation_lag1"])
        for _, row in df_te.iterrows():
            pays = row["Pays"]
            g_true = row.get("gdp_growth", np.nan)
            infl_lag1 = row.get("inflation_lag1", np.nan)
            if pd.isna(g_true) or pd.isna(infl_lag1):
                continue
            g_pred = predict_one(pays, test_year, float(infl_lag1),
                                 ridge, sc, mu_long_dict, trend_dict)
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
    mask = np.abs(yt) > 0.5
    mape = (float(np.mean(np.abs((yt[mask] - yp[mask]) / yt[mask])) * 100)
            if mask.sum() > 0 else None)
    return {"n": int(len(pairs)), "r2": r2, "mape": mape, "mae": mae, "rmse": rmse}


def mu_baseline(df: pd.DataFrame) -> dict:
    """Baseline : prédire μ_long calibré sur MU_WINDOW_GROWTH."""
    pairs = []
    for test_year in OOS_YEARS:
        df_te = df[df["Year"] == test_year]
        for _, row in df_te.iterrows():
            pays = row["Pays"]
            g_true = row.get("gdp_growth", np.nan)
            df_p = df[(df["Pays"] == pays) & (df["Year"].isin(MU_WINDOW_GROWTH))
                      ]["gdp_growth"].dropna()
            if pd.isna(g_true) or len(df_p) == 0:
                continue
            pairs.append((float(g_true), float(df_p.mean())))
    return metrics_from_pairs(pairs)


def persistence_baseline(df: pd.DataFrame) -> dict:
    """Baseline : y_pred = y_lag1."""
    pairs = []
    for test_year in OOS_YEARS:
        df_te = df[df["Year"] == test_year].dropna(subset=["gdp_growth", "gdp_growth_lag1"])
        for _, row in df_te.iterrows():
            pairs.append((float(row["gdp_growth"]), float(row["gdp_growth_lag1"])))
    return metrics_from_pairs(pairs)


def main():
    print("=" * 78)
    print("OOS R² — gdp_growth (Ridge Tendance+Inflation, train≤2022, test 2023-2024)")
    print("=" * 78)

    df = _load_panel_from_db()
    print(f"\nPanel chargé : {len(df)} lignes, {df['Pays'].nunique()} pays, "
          f"années {df['Year'].min()}-{df['Year'].max()}")

    print("\n--- Modèle Ridge Tendance+Inflation (OOS strict) ---")
    result = oos_evaluation(df)
    m_global = metrics_from_pairs(result["global"])
    print(f"\nGlobal (n={m_global['n']}):")
    print(f"  R²    = {m_global['r2']:.4f}" if m_global['r2'] is not None else "  R²    = None")
    print(f"  MAE   = {m_global['mae']:.4f} pts de %")
    print(f"  RMSE  = {m_global['rmse']:.4f} pts de %")
    print(f"  MAPE  = {m_global['mape']:.2f}%" if m_global['mape'] is not None else "  MAPE  = None")

    print("\nPar année OOS :")
    print(f"  {'Year':<6} {'n':>4} {'R²':>9} {'MAE':>8} {'RMSE':>8}")
    for yr in OOS_YEARS:
        m = metrics_from_pairs(result["per_year"][yr])
        r2_str = f"{m['r2']:.4f}" if m['r2'] is not None else "    —   "
        mae_str = f"{m['mae']:.3f}" if m['mae'] is not None else "    —"
        rmse_str = f"{m['rmse']:.3f}" if m['rmse'] is not None else "    —"
        print(f"  {yr:<6} {m['n']:>4} {r2_str:>9} {mae_str:>8} {rmse_str:>8}")

    print("\n--- Baselines (référence) ---")
    m_mu = mu_baseline(df)
    m_persist = persistence_baseline(df)
    print(f"μ_long (2015-2022)   : R²={m_mu['r2']:.4f},  MAE={m_mu['mae']:.3f}, n={m_mu['n']}")
    print(f"Persistance (y_lag1) : R²={m_persist['r2']:.4f}, MAE={m_persist['mae']:.3f}, n={m_persist['n']}")

    print("\n" + "=" * 78)


if __name__ == "__main__":
    main()
