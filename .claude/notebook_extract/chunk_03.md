    for f in fxgb:
                    if f.startswith('reg_'):
                        rname = f"reg_{row_te.get('region','')}"
                        xrow.append(1.0 if f == rname else 0.0)
                    else:
                        v = row_te.get(f, 0.0)
                        xrow.append(0.0 if pd.isna(v) else float(v))
                xrow = np.array(xrow).reshape(1,-1)
                resid_pred = float(xm.predict(xrow)[0])
                pv = float(np.clip(l1 + resid_pred, 5.0, 95.0))
                calibration_residuals['nv_sp'].append((float(true_v), pv))

# ---- Conformal quantiles & metrics ----
conformal_q = {}
for var in TARGET_VARS:
    pairs = calibration_residuals[var]
    if not isinstance(pairs, list) or len(pairs)==0 or not isinstance(pairs[0], tuple):
        conformal_q[var] = {'q80': 0.1, 'q95': 0.2}; continue
    yt = np.array([p[0] for p in pairs])
    yp = np.array([p[1] for p in pairs])
    abs_resid = np.abs(yt - yp)
    calibration_residuals[var] = abs_resid
    q80 = float(np.quantile(abs_resid, 0.80))
    q95 = float(np.quantile(abs_resid, 0.95))
    conformal_q[var] = {'q80': q80, 'q95': q95}
    r2 = float(r2_score(yt, yp)) if len(yt)>1 else np.nan
    mask = yt != 0
    mape = float(np.mean(np.abs((yt[mask]-yp[mask])/yt[mask]))*100) if mask.sum()>0 else np.nan
    wf_metrics[var]['r2']   = [r2]
    wf_metrics[var]['mape'] = [mape]
    wf_metrics[var]['mae']  = [float(mean_absolute_error(yt, yp))]
```

### 9.2 Build df_pred with conformal IC (cell 32)

```python
rows = []
for pays in PAYS_33:
    for yr in YEARS_PRED:
        h = yr - 2024  # horizon 1..6
        nv_p   = nv_penet_pred[pays][yr]; vie_p = vie_penet_pred[pays][yr]
        sp_p   = nv_sp_pred[pays][yr];    gc_p  = gdpcap_pred[pays][yr]
        gg_p   = gdp_growth_pred[pays][yr]
        ps_p   = gp_preds['polstab'][pays][yr]; rq_p = gp_preds['regqual'][pays][yr]
        ps_sig = gp_sigma['polstab'][pays][yr]; rq_sig = gp_sigma['regqual'][pays][yr]
        nv_pr  = nv_primes_pred[pays][yr];   nv_den = nv_densite_pred[pays][yr]
        vie_pr = vie_primes_pred[pays][yr];  vie_den = vie_densite_pred[pays][yr]
        gdp_f  = gdp_pred_dict[pays][yr];    pop_f = pop_pred_dict[pays][yr]
        nv_cr  = nv_croissance_pred[pays].get(yr, np.nan)
        vie_cr = vie_croissance_pred[pays].get(yr, np.nan)

        def ic(var, val, h_factor=True):
            q = conformal_q.get(var, {'q80':0.1,'q95':0.2})
            factor = np.sqrt(h) if h_factor else 1.0
            return (val - q['q80']*factor, val + q['q80']*factor,
                    val - q['q95']*factor, val + q['q95']*factor)

        nv_ic  = ic('nv_penetration',  nv_p,  h_factor=True)
        vie_ic = ic('vie_penetration', vie_p, h_factor=True)
        sp_ic  = ic('nv_sp',           sp_p,  h_factor=False)  # mean-reverting
        gc_ic  = ic('gdpcap',          gc_p,  h_factor=True)
        ps_ic  = (ps_p-1.28*ps_sig, ps_p+1.28*ps_sig, ps_p-1.96*ps_sig, ps_p+1.96*ps_sig)
        rq_ic  = (rq_p-1.28*rq_sig, rq_p+1.28*rq_sig, rq_p-1.96*rq_sig, rq_p+1.96*rq_sig)

        rows.append({
            'Pays': pays, 'Year': yr, 'Region': pays_to_region.get(pays,''),
            'nv_penetration_pred': round(nv_p,4),
            'nv_penetration_lb80': round(max(nv_ic[0], NV_PENET_MIN),4),
            'nv_penetration_ub80': round(min(nv_ic[1], NV_PENET_MAX),4),
            'nv_penetration_lb95': round(max(nv_ic[2], NV_PENET_MIN),4),
            'nv_penetration_ub95': round(min(nv_ic[3], NV_PENET_MAX),4),
            'vie_penetration_pred': round(vie_p,4),
            'vie_penetration_lb80': round(max(vie_ic[0], VIE_PENET_MIN),4),
            'vie_penetration_ub80': round(min(vie_ic[1], VIE_PENET_MAX),4),
            'vie_penetration_lb95': round(max(vie_ic[2], VIE_PENET_MIN),4),
            'vie_penetration_ub95': round(min(vie_ic[3], VIE_PENET_MAX),4),
            'nv_sp_pred': round(sp_p,2),
            'nv_sp_lb80': round(max(sp_ic[0], NV_SP_MIN),2),
            'nv_sp_ub80': round(min(sp_ic[1], NV_SP_MAX),2),
            'nv_sp_lb95': round(max(sp_ic[2], NV_SP_MIN),2),
            'nv_sp_ub95': round(min(sp_ic[3], NV_SP_MAX),2),
            'gdpcap_pred': round(gc_p,1),
            'gdpcap_lb80': round(max(gc_ic[0],100),1),
            'gdpcap_ub80': round(gc_ic[1],1),
            'gdpcap_lb95': round(max(gc_ic[2],100),1),
            'gdpcap_ub95': round(gc_ic[3],1),
            'gdp_growth_pred': round(gg_p,3),
            'polstab_pred':    round(ps_p,3),
            'polstab_lb80':    round(max(ps_ic[0],-2.5),3),
            'polstab_ub80':    round(min(ps_ic[1], 2.5),3),
            'regqual_pred':    round(rq_p,3),
            'regqual_lb80':    round(max(rq_ic[0],-2.5),3),
            'regqual_ub80':    round(min(rq_ic[1], 2.5),3),
            'nv_primes_pred':  round(nv_pr,2),
            'nv_densite_pred': round(nv_den,2) if nv_den else np.nan,
            'vie_primes_pred': round(vie_pr,2),
            'vie_densite_pred':round(vie_den,2) if vie_den else np.nan,
            'gdp_pred':        round(gdp_f,1),
            'population_pred': round(pop_f,3),
            'nv_croissance_pred':  round(nv_cr,2)  if not pd.isna(nv_cr)  else np.nan,
            'vie_croissance_pred': round(vie_cr,2) if not pd.isna(vie_cr) else np.nan,
        })
df_pred = pd.DataFrame(rows)
```

What it does: 5 walk-forward splits (train 2015..t-1 → test t for t∈{2020..2024}), refit ridge_nv/vie/gdp/sp + GP polstab/regqual on the train slice, predict the held-out year, accumulate (true,pred) pairs → absolute residuals → q80, q95 quantiles per variable. Then build `df_pred`: predictions ± q-quantile, scaled by `sqrt(h)` for trending vars (nv/vie/gdpcap/gdp_growth-related), unscaled for `nv_sp` (mean-reverting). polstab/regqual use native GP std (z=1.28 for 80%, 1.96 for 95%).

---

## STEP 10 — Coherence tests (cell 34)

```python
alerts = []
ref_2024 = df[df['Year']==2024].set_index('Pays')

for pays in PAYS_33:
    if pays not in ref_2024.index: continue

    nv_pr_2024  = ref_2024.loc[pays, 'nv_primes']  if 'nv_primes'  in ref_2024.columns else np.nan
    vie_pr_2024 = ref_2024.loc[pays, 'vie_primes'] if 'vie_primes' in ref_2024.columns else np.nan
    nv_p_2024   = ref_2024.loc[pays, 'nv_penetration'] if 'nv_penetration' in ref_2024.columns else np.nan
    vie_p_2024  = ref_2024.loc[pays, 'vie_penetration'] if 'vie_penetration' in ref_2024.columns else np.nan
    sp_2024     = ref_2024.loc[pays, 'nv_sp'] if 'nv_sp' in ref_2024.columns else np.nan

    pred_2030 = df_pred[(df_pred['Pays']==pays) & (df_pred['Year']==2030)]
    if len(pred_2030)==0: continue
    pred_2030 = pred_2030.iloc[0]

    # Test 1 — nv_primes 2030 vs 2024 deviation > 50%
    if not pd.isna(nv_pr_2024) and nv_pr_2024>0:
        ratio_primes = abs(pred_2030['nv_primes_pred'] - nv_pr_2024) / nv_pr_2024
        if ratio_primes > 0.50:
            alerts.append(f"[Test 1] {pays} 2030: nv_primes écart {ratio_primes*100:.0f}%")

    # Test 2 — CAGR nv_primes outside [-10%, +25%]
    if not pd.isna(nv_pr_2024) and nv_pr_2024>0:
        cagr = (pred_2030['nv_primes_pred']/nv_pr_2024)**(1/6) - 1
        if cagr > 0.25 or cagr < -0.10:
            alerts.append(f"[Test 2] {pays}: CAGR nv_primes={cagr*100:.1f}% (hors [-10%,+25%])")

    # Test 3 — penetration vs richness ratio (>2σ from historical pooled distribution)
    if pred_2030['gdpcap_pred']>0:
        ratio_penet_rich = pred_2030['nv_penetration_pred'] / (pred_2030['gdpcap_pred']/1000)
        hist_ratio = (df['nv_penetration'] / (df['gdpcap']/1000)).dropna()
        mu_r, sig_r = hist_ratio.mean(), hist_ratio.std()
        if abs(ratio_penet_rich - mu_r) > 2*sig_r:
            alerts.append(f"[Test 3] {pays} 2030: ratio penet/richesse>2σ")

    # Test 4 — NV/Vie ratio within 2σ of country-specific historical
    if not pd.isna(nv_p_2024) and not pd.isna(vie_p_2024) and vie_p_2024>0:
        hist_ratio_nv_vie = (df[df['Pays']==pays]['nv_penetration']
                             / df[df['Pays']==pays]['vie_penetration'].replace(0, np.nan)).dropna()
        if len(hist_ratio_nv_vie)>2:
            mu_nv_vie, sig_nv_vie = hist_ratio_nv_vie.mean(), hist_ratio_nv_vie.std()
            if pred_2030['vie_penetration_pred']>0:
                ratio_pred = pred_2030['nv_penetration_pred']/pred_2030['vie_penetration_pred']
                if abs(ratio_pred - mu_nv_vie) > 2*sig_nv_vie:
                    alerts.append(f"[Test 4] {pays} 2030: ratio NV/Vie>2σ")

    # Test 5 — S/P drift > +20pts in 6 years
    if not pd.isna(sp_2024):
        sp_change = pred_2030['nv_sp_pred'] - sp_2024
        if sp_change > 20:
            alerts.append(f"[Test 5] {pays}: nv_sp +{sp_change:.1f} pts sur 6 ans")

# Test 6 — Coverage IC80 (walk-forward) ∈ [70%, 90%]
for var in ['nv_penetration', 'nv_sp']:
    resids = calibration_residuals.get(var, [])
    if len(resids) > 0:
        q80 = conformal_q[var]['q80']
        coverage = np.mean(resids <= q80)
        # status OK if 0.70 ≤ coverage ≤ 0.90

# Test 7 — gdp_growth 2025-2027 alignment with Axco (|écart%| < 15%)
if AXCO_LOADED:
    for pays in PAYS_33:
        for yr in [2025, 2026, 2027]:
            axco_val = axco_gdp_growth_anchor.get(pays,{}).get(yr, np.nan)
            ar_val   = gdp_growth_pred[pays].get(yr, np.nan)
            if pd.isna(axco_val) or pd.isna(ar_val): continue
            ecart_pct = abs(ar_val - axco_val)/max(abs(axco_val),0.1)*100
            if ecart_pct > 15:
                # divergence flagged

# Test 8 — gdpcap 2025-2027 alignment with Axco (|écart%| < 20%)
if AXCO_LOADED:
    for pays in PAYS_33:
        for yr in [2025, 2026, 2027]:
            axco_val = axco_gdpcap_anchor.get(pays,{}).get(yr, np.nan)
            ar_val   = gdpcap_pred[pays].get(yr, np.nan)
            if pd.isna(axco_val) or pd.isna(ar_val): continue
            ecart_pct = abs(ar_val - axco_val)/max(abs(axco_val),1)*100
            if ecart_pct > 20:
                # divergence flagged
```

What it does: 8 sanity checks — primes drift bound, CAGR primes bound, penetration/richness deviation, NV/Vie ratio stability, S/P drift, IC coverage, Axco alignment for gdp_growth (15%) and gdpcap (20%).

---

## Reference summary (constants you must hard-code in the backend)

| Constant | Value | Used in step |
|---|---|---|
| `PAYS_33` | `sorted()` of merged panel after dropping "Afrique du Sud" | all |
| `YEARS_HIST` | `list(range(2015, 2025))` | all |
| `YEARS_PRED` | `list(range(2025, 2031))` | all |
| `CAGR_WINDOW` | `(2018, 2024)` | 1 |
| `POP_GROWTH_MIN/MAX` | `0.0 / 0.045` | 1 |
| `INFL_MIN/MAX` | `-2.0 / 60.0` | 2a |
| `INFL_RHO_MIN/MAX` | `0.0 / 0.95` | 2a |
| `INFL_MU_WINDOW` | `range(2018, 2025)` | 2a |
| `EXOG_MU_WINDOW` | `range(2018, 2025)` | 2b |
| `INTEG_MIN/MAX` | `0.0 / 1.0` | 2b |
| `INTEG_RHO_MIN/MAX` | `0.0 / 0.85` | 2b |
| `FDI_MIN/MAX` | `-5.0 / 30.0` | 2b |
| `FDI_RHO_MIN/MAX` | `0.0 / 0.85` | 2b |
| `GDP_GROWTH_MIN/MAX` | `-5.0 / 12.0` | 2c |
| `RHO_MIN/MAX` | `-0.5 / 0.95` | 2c |
| `MU_WINDOW_GROWTH` | `range(2018, 2025)` | 2c |
| `MU_GROWTH_CLIP` | `(1.0, 8.5)` | 2c |
| `MU_GROWTH_DEFAULT` | `4.2` | 2c |
| `BRENT_HIST` | see code (2014–2024 USD/bbl) | 2c |
| `BRENT_PROJ_FLAT` | mean of 2020–2024 BRENT_HIST | 2c |
| `BLEND_WEIGHTS` | `{2025:(0.10,0.90), 2026:(0.30,0.70), 2027:(0.50,0.50)}` (w_AR, w_Axco) | 2c, 3 |
| Decay structure 2028-2030 | `0.5 * 0.7**i` for i=0,1,2 | 2c |
| `LOG_RESID_CLAMP` | `0.0008` | 3 |
| `WGI_BOUNDS` | `(-2.5, 2.5)` | 4 |
| `WGI_MAX_CHANGE_PER_YEAR` | `0.15` | 4 |
| GP kernel | `RBF(3.0, (0.1,50.0)) + WhiteKernel(0.01, (1e-5,1.0))` | 4 |
| `n_restarts_optimizer` | `5` (main), `2` (walk-forward) | 4, 9 |
| `NV_PENET_MIN/MAX` | `0.01 / 5.0` | 5 |
| `VIE_PENET_MIN/MAX` | `0.001 / 10.0` | 6 |
| `NV_SP_MIN/MAX` | `5.0 / 95.0` | 7 |
| `CONTINENTAL_SP_TREND` | `-0.29` pts/year | 7 |
| XGBoost params | `max_depth=3, n_estimators=50, lr=0.05, min_child_weight=5, subsample=0.8, colsample_bytree=0.7, reg_alpha=0.1, reg_lambda=1.0, random_state=42` | 7, 9 |
| RidgeCV α grid (most models) | `[0.01, 0.1, 1, 10, 100]` cv=5 | 3, 5, 6, 7, 9 |
| RidgeCV α grid (gdp_growth only) | `[0.05, 0.5, 1.0, 5.0, 10.0, 30.0, 100.0]` cv=5 | 2c |
| Walk-forward `SPLITS` | 5 splits 2020..2024 | 9 |
| IC scaling | `sqrt(h)` for nv/vie/gdpcap; flat for nv_sp | 9 |
| Test thresholds | T1>50%, T2 CAGR∉[-10%,25%], T3>2σ, T4>2σ, T5>+20pts, T6 cov∉[70%,90%], T7>15%, T8>20% | 10 |

## Axco file structure

- File: `Axco-Navigator-Data-Pivot-2026-04-26T00-40-40.xlsx`
- Sheet: index 0 (cell 12) and `'Report Data'` (cell 38) — same data
- `header=3` (data starts row 4)
- Columns required: `Country`, `Year`, `Annual Real GDP Growth (%)` (alternates `GDP Growth (%)`, `Real GDP Growth (%)`), `GDP Per Capita` (alternates `GDP per Capita`, `GDP Per Capita (USD)`), `Gross Domestic Product (mn)`, `Total Population (mn)`
- Anchor years used: 2025, 2026, 2027
- Country mapping: see `AXCO_COUNTRY_MAP` (EN→FR) verbatim above
- 32 countries mapped (no Mali in Axco mapping in cell 12 — wait, Mali IS there: `'Mali':'Mali'`. All 33 PAYS_33 names appear in `AXCO_COUNTRY_MAP` values.)

## Step dependencies (DAG)

```
Step 0 ──> Step 1 (population)
Step 0 ──> Step 2a (inflation_pred)
Step 0 ──> Step 2b (integration_pred, fdi_pred)
Step 0, 2a ──> Step 2c (gdp_growth_pred) ── + Axco anchors
Step 1, 2a, 2b, 2c ──> Step 3 (gdpcap_pred, gdp_pred_dict) ── + Axco anchors
Step 3 ──> Step 4 (gp_preds polstab, regqual)
Step 2a (last_infl from raw df), 2b, 3, 4 ──> Step 5 (nv_penet_pred)
Step 2a, 2b, 3, 4, 5 ──> Step 6 (vie_penet_pred)
Step 2b (fdi), 2c, 3, 4, 5 ──> Step 7 (nv_sp_pred)
Step 1, 3, 5, 6 ──> Step 8 (primes/densite/croissance)
Steps 3-7 (training data) ──> Step 9 (refit walk-forward → conformal_q)
Steps 1-9 ──> Step 10 (coherence tests)
```

## Non-obvious quirks worth noting

1. **`last_infl` in steps 5, 6, 7** uses `df_p['inflation'].iloc[-1]` (last observed value, frozen across 2025–2030), NOT the dynamic `inflation_pred` from Step 2a. The notebook uses dynamic inflation only in Steps 2c (gdp_growth) and 3 (gdpcap).
2. **Step 5 Year feature**: passes the actual prediction year `yr` (not its z-score). RidgeCV's StandardScaler handles it but be sure to pass raw year.
3. **Step 7 `polstab`**: uses the same-year prediction (`gp_preds['polstab'][pays][yr]`), not lagged (the training feature was `polstab` not `polstab_lag1`).
4. **Step 2c blending order**: blend → structural correction → μ_pays override → re-anchor. Order matters.
5. **`gdpcap` blending (Step 3)** also recomputes `gdp_pred_dict[pays][yr] = blended_gdpcap * pop` so downstream primes use the blended gdp.
6. **Step 4 historical sigma is set to 0**: only forecast years carry GP std for IC.
7. **Step 9 IC for `nv_sp`** uses `h_factor=False` (mean-reverting) — IC width is constant, not √h.
8. **Step 9 GP refit** uses `n_restarts_optimizer=2` (vs 5 in main run) for speed.
9. The notebook's `wf_metrics` records r2/mape/mae over all calibration residuals pooled — not per split.
10. **Recursive feedback loops**: `nv_penet_pred` consumes its own previous prediction (`log_nv_prev`); `vie_penet_pred` consumes both its own previous and `nv_penet_pred[pays][yr-1]`; `nv_sp_pred` uses its own `sp_prev1, sp_prev2` AND `nv_penet_pred[pays][yr]` (via `log_nv_primes_f` derived intermediate). Order of cell execution within YEARS_PRED is critical.
11. **`gdp_growth_pred` 2024**: Step 2c `gdp_growth_pred[pays][2024]` is the historical value from `df`, not μ_pays_dict (the fallback only triggers if the historical row is missing).
12. The `df_pred` `gdp_growth_pred` is stored only as point estimate — no IC built for it (only gdpcap has IC).

This is the complete, verbatim pipeline ready to be transposed into `backend/routers/predictions_axe2.py`.