et_pred = {}
dummy_pays_cols_vie = fe_cols_vie

for pays in PAYS_33:
    vie_penet_pred[pays] = {}
    df_p = df[df['Pays']==pays].sort_values('Year')

    for yr in YEARS_HIST:
        row = df_p[df_p['Year']==yr]
        vie_penet_pred[pays][yr] = row['vie_penetration'].values[0] if len(row)>0 else np.nan

    pays_vec_vie = np.zeros(len(dummy_pays_cols_vie))
    col_name = f'pays_{pays}'
    if col_name in dummy_pays_cols_vie:
        pays_vec_vie[dummy_pays_cols_vie.index(col_name)] = 1

    last_infl = df_p['inflation'].iloc[-1] if len(df_p)>0 else 7.0

    if arima_vie.get(pays) is not None:
        try:    vie_arima_fc = arima_vie[pays].forecast(steps=6)
        except: vie_arima_fc = np.zeros(6)
    else:
        vie_arima_fc = np.zeros(6)

    log_vie_prev = np.log(max(vie_penet_pred[pays][2024], VIE_PENET_MIN))
    log_nv_prev  = np.log(max(nv_penet_pred[pays][2024],  NV_PENET_MIN))

    for i, yr in enumerate(YEARS_PRED):
        log_gdpcap_f  = np.log(max(gdpcap_pred[pays][yr], 1))
        polstab_f_lag = gp_preds['polstab'][pays][yr-1]
        regqual_f_lag = gp_preds['regqual'][pays][yr-1]
        log_nv_f_lag  = np.log(max(nv_penet_pred[pays][yr-1], NV_PENET_MIN))

        feat = np.array([log_vie_prev, log_gdpcap_f, polstab_f_lag, regqual_f_lag,
                         last_infl, integration_pred[pays][yr], log_nv_f_lag, yr] + list(pays_vec_vie))
        feat_sc = scaler_vie.transform(feat.reshape(1,-1))
        log_vie_final = ridge_vie.predict(feat_sc)[0] + vie_arima_fc[i]
        vie_v = np.clip(np.exp(log_vie_final), VIE_PENET_MIN, VIE_PENET_MAX)
        vie_penet_pred[pays][yr] = vie_v
        log_vie_prev = np.log(vie_v)
        log_nv_prev  = np.log(max(nv_penet_pred[pays][yr], NV_PENET_MIN))
```

What it does: same recipe as nv_penetration but adds `log_nv_penetration_lag1` as feature (correlation +0.716). Output bounded [0.001, 10.0]%.

Depends on Step 5 (`nv_penet_pred`), Step 4, Step 3, Step 2b.

---

## STEP 7 — nv_sp (AR(2) + RidgeCV + XGBoost residuals)

### 7.1 Layer 1: AR(2) Ridge (cell 25)

```python
df_train_sp = df[df['Year'] >= 2017].dropna(subset=[
    'nv_sp','nv_sp_lag1','nv_sp_lag2',
    'inflation_lag1','polstab','log_nv_primes',
    'gdp_growth','fdi'
]).copy()

pays_dum_sp = pd.get_dummies(df_train_sp['Pays'], prefix='pays', drop_first=True)
df_train_sp = pd.concat([df_train_sp.reset_index(drop=True), pays_dum_sp.reset_index(drop=True)], axis=1)
fe_cols_sp  = [c for c in df_train_sp.columns if c.startswith('pays_')]

feature_cols_sp = (['nv_sp_lag1','nv_sp_lag2','inflation_lag1','polstab',
                    'log_nv_primes','gdp_growth'] + fe_cols_sp)

df_train_sp = df_train_sp.dropna(subset=feature_cols_sp)
X_sp = df_train_sp[feature_cols_sp].values
y_sp = df_train_sp['nv_sp'].values

scaler_sp = StandardScaler()
X_sp_sc   = scaler_sp.fit_transform(X_sp)
ridge_sp  = RidgeCV(alphas=[0.01,0.1,1,10,100], cv=5).fit(X_sp_sc, y_sp)

sp_pred_l1   = ridge_sp.predict(X_sp_sc)
sp_residuals = y_sp - sp_pred_l1
df_train_sp['residual_sp'] = sp_residuals
```

### 7.2 Layer 2: XGBoost on residuals (cell 26)

```python
region_dum_sp = pd.get_dummies(df_train_sp['region'], prefix='reg', drop_first=True)
df_train_sp   = pd.concat([df_train_sp.reset_index(drop=True), region_dum_sp.reset_index(drop=True)], axis=1)
reg_cols_sp   = [c for c in df_train_sp.columns if c.startswith('reg_')]

feature_cols_xgb = (['nv_sp_lag1','nv_sp_lag2','inflation_lag1','polstab',
                     'log_nv_primes','gdp_growth','fdi'] + reg_cols_sp)
feature_cols_xgb = [f for f in feature_cols_xgb if f in df_train_sp.columns]

X_xgb = df_train_sp[feature_cols_xgb].fillna(0).values
y_xgb = df_train_sp['residual_sp'].values

xgb_model = xgb.XGBRegressor(
    max_depth=3, n_estimators=50, learning_rate=0.05,
    min_child_weight=5, subsample=0.8, colsample_bytree=0.7,
    reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0
)
xgb_model.fit(X_xgb, y_xgb)
```

### 7.3 Project (cell 27)

```python
NV_SP_MIN, NV_SP_MAX = 5.0, 95.0
CONTINENTAL_SP_TREND = -0.29  # pts/year (downward bias, favorable)

nv_sp_pred = {}
dummy_pays_cols_sp = fe_cols_sp

for pays in PAYS_33:
    nv_sp_pred[pays] = {}
    df_p = df[df['Pays']==pays].sort_values('Year')
    for yr in YEARS_HIST:
        row = df_p[df_p['Year']==yr]
        nv_sp_pred[pays][yr] = row['nv_sp'].values[0] if len(row)>0 else np.nan

    pays_vec_sp = np.zeros(len(dummy_pays_cols_sp))
    col_name = f'pays_{pays}'
    if col_name in dummy_pays_cols_sp:
        pays_vec_sp[dummy_pays_cols_sp.index(col_name)] = 1

    reg_vec  = np.zeros(len(reg_cols_sp))
    reg_name = pays_to_region.get(pays, '')
    col_reg  = f"reg_{reg_name}"
    if col_reg in reg_cols_sp:
        reg_vec[reg_cols_sp.index(col_reg)] = 1

    last_infl = df_p['inflation'].iloc[-1] if len(df_p)>0 else 7.0

    sp_prev2 = nv_sp_pred[pays][2023]
    sp_prev1 = nv_sp_pred[pays][2024]

    for i, yr in enumerate(YEARS_PRED):
        polstab_f  = gp_preds['polstab'][pays][yr]   # NB: not lagged
        nv_penet_f = nv_penet_pred[pays][yr]
        gdp_f      = gdp_pred_dict[pays][yr]
        nv_primes_f = nv_penet_f * gdp_f / 100
        log_nv_primes_f = np.log(max(nv_primes_f, 1e-4))
        gdp_gr_f = gdp_growth_pred[pays][yr]

        feat_sp = np.array([sp_prev1, sp_prev2, last_infl, polstab_f,
                            log_nv_primes_f, gdp_gr_f] + list(pays_vec_sp))
        feat_sp_sc = scaler_sp.transform(feat_sp.reshape(1,-1))
        sp_l1 = ridge_sp.predict(feat_sp_sc)[0]

        feat_xgb = np.array([sp_prev1, sp_prev2, last_infl, polstab_f,
                             log_nv_primes_f, gdp_gr_f, fdi_pred[pays][yr]] + list(reg_vec))
        sp_l2 = xgb_model.predict(feat_xgb.reshape(1,-1))[0]

        sp_combined = sp_l1 + sp_l2
        sp_trended  = sp_combined + CONTINENTAL_SP_TREND
        sp_v = np.clip(sp_trended, NV_SP_MIN, NV_SP_MAX)
        nv_sp_pred[pays][yr] = sp_v
        sp_prev2 = sp_prev1
        sp_prev1 = sp_v
```

What it does: AR(2) panel + macro features in Layer 1 (RidgeCV), XGBoost shallow (depth 3, 50 trees) on residuals in Layer 2 with `fdi` and region dummies; adds a continental drift `-0.29` pts/year and clips [5, 95]%. NOTE: `polstab_f` is the **same year**, not lagged — and `last_infl` is the last observed inflation, not the dynamic projection.

Depends on Steps 2b (fdi), 2c (gdp_growth), 3 (gdp), 4 (polstab), 5 (nv_penetration).

---

## STEP 8 — Derived variables (cell 29)

```python
nv_primes_pred, nv_densite_pred = {}, {}
vie_primes_pred, vie_densite_pred = {}, {}
nv_croissance_pred, vie_croissance_pred = {}, {}

ALL_YEARS = YEARS_HIST + YEARS_PRED

for pays in PAYS_33:
    nv_primes_pred[pays]   = {}
    nv_densite_pred[pays]  = {}
    vie_primes_pred[pays]  = {}
    vie_densite_pred[pays] = {}
    nv_croissance_pred[pays]  = {}
    vie_croissance_pred[pays] = {}

    df_p = df[df['Pays']==pays].sort_values('Year')

    for yr in ALL_YEARS:
        pop = pop_pred_dict[pays][yr]
        if yr in YEARS_HIST:
            row = df_p[df_p['Year']==yr]
            nv_primes_pred[pays][yr]   = row['nv_primes'].values[0]   if len(row)>0 else np.nan
            nv_densite_pred[pays][yr]  = row['nv_densite'].values[0]  if len(row)>0 else np.nan
            vie_primes_pred[pays][yr]  = row['vie_primes'].values[0]  if len(row)>0 else np.nan
            vie_densite_pred[pays][yr] = row['vie_densite'].values[0] if len(row)>0 else np.nan
        else:
            nv_p  = nv_penet_pred[pays][yr]
            vie_p = vie_penet_pred[pays][yr]
            gdp_f = gdp_pred_dict[pays][yr]
            nv_pr  = nv_p  * gdp_f / 100
            vie_pr = vie_p * gdp_f / 100
            nv_primes_pred[pays][yr]   = nv_pr
            nv_densite_pred[pays][yr]  = nv_pr  / pop if pop>0 else np.nan
            vie_primes_pred[pays][yr]  = vie_pr
            vie_densite_pred[pays][yr] = vie_pr / pop if pop>0 else np.nan

    for yr in YEARS_PRED:
        pr_t  = nv_primes_pred[pays][yr]
        pr_t1 = nv_primes_pred[pays][yr-1]
        nv_croissance_pred[pays][yr] = ((pr_t/pr_t1)-1)*100 if pr_t1 and pr_t1>0 else np.nan
        vpr_t  = vie_primes_pred[pays][yr]
        vpr_t1 = vie_primes_pred[pays][yr-1]
        vie_croissance_pred[pays][yr] = ((vpr_t/vpr_t1)-1)*100 if vpr_t1 and vpr_t1>0 else np.nan
```

What it does: Pure derivations: `primes = penetration% * gdp / 100` (mn USD), `densite = primes / pop` (USD/hab, since gdp is in mn USD and pop in millions, ratio is USD/hab), implicit growth rates.

`gdp_pred` is already produced in Step 3.

---

## STEP 9 — Conformal Prediction (walk-forward refit, cell 31)

```python
SPLITS = [
    (list(range(2015,2020)), [2020]),
    (list(range(2015,2021)), [2021]),
    (list(range(2015,2022)), [2022]),
    (list(range(2015,2023)), [2023]),
    (list(range(2015,2024)), [2024]),
]
TARGET_VARS = ['nv_penetration','vie_penetration','gdpcap','polstab','regqual','nv_sp']

calibration_residuals = {v: [] for v in TARGET_VARS}
wf_metrics = {v: {'r2': [], 'mape': [], 'mae': []} for v in TARGET_VARS}

# ---- helpers refit per split (full code below) ----
def fit_ridge_nv_split(df_tr):
    d = df_tr.dropna(subset=[
        'log_nv_penetration','log_nv_penetration_lag1','log_gdpcap_lag1',
        'polstab_lag1','regqual_lag1','inflation_lag1','integration']).copy()
    pdum = pd.get_dummies(d['Pays'], prefix='pays', drop_first=True).astype(float)
    d = pd.concat([d.reset_index(drop=True), pdum.reset_index(drop=True)], axis=1)
    fe = [c for c in d.columns if c.startswith('pays_')]
    fc = ['log_nv_penetration_lag1','log_gdpcap_lag1','polstab_lag1','regqual_lag1',
          'inflation_lag1','integration','Year'] + fe
    d = d.dropna(subset=fc)
    if len(d) < 10: return None
    X = d[fc].values; y = d['log_nv_penetration'].values
    sc = StandardScaler().fit(X)
    rg = RidgeCV(alphas=[0.01,0.1,1,10,100], cv=min(5,len(d))).fit(sc.transform(X), y)
    return rg, sc, fc, fe

def fit_ridge_vie_split(df_tr):
    d = df_tr.dropna(subset=[
        'log_vie_penetration','log_vie_penetration_lag1','log_gdpcap_lag1',
        'polstab_lag1','regqual_lag1','inflation_lag1','integration',
        'log_nv_penetration_lag1']).copy()
    pdum = pd.get_dummies(d['Pays'], prefix='pays', drop_first=True).astype(float)
    d = pd.concat([d.reset_index(drop=True), pdum.reset_index(drop=True)], axis=1)
    fe = [c for c in d.columns if c.startswith('pays_')]
    fc = ['log_vie_penetration_lag1','log_gdpcap_lag1','polstab_lag1','regqual_lag1',
          'inflation_lag1','integration','log_nv_penetration_lag1','Year'] + fe
    d = d.dropna(subset=fc)
    if len(d) < 10: return None
    X = d[fc].values; y = d['log_vie_penetration'].values
    sc = StandardScaler().fit(X)
    rg = RidgeCV(alphas=[0.01,0.1,1,10,100], cv=min(5,len(d))).fit(sc.transform(X), y)
    return rg, sc, fc, fe

def fit_ridge_gdp_split(df_tr):
    d = df_tr.dropna(subset=[
        'log_gdpcap','log_gdpcap_lag1','gdp_growth','inflation_lag1','integration']).copy()
    d = d.sort_values(['Pays','Year']).reset_index(drop=True)
    d['pop_lag1'] = d.groupby('Pays')['population'].shift(1)
    d['pop_growth_hist'] = (d['population']/d['pop_lag1'] - 1)*100
    d = d.dropna(subset=['pop_growth_hist'])
    d['log_resid_gdp'] = (d['log_gdpcap'] - d['log_gdpcap_lag1']
                          - np.log1p(d['gdp_growth']/100.0)
                          + np.log1p(d['pop_growth_hist']/100.0))
    pdum = pd.get_dummies(d['Pays'], prefix='pays', drop_first=True).astype(float)
    d = pd.concat([d.reset_index(drop=True), pdum.reset_index(drop=True)], axis=1)
    fe = [c for c in d.columns if c.startswith('pays_')]
    fc = ['log_gdpcap_lag1','inflation_lag1','integration','Year'] + fe
    d = d.dropna(subset=fc)
    if len(d) < 10: return None
    X = d[fc].values; y = d['log_resid_gdp'].values
    sc = StandardScaler().fit(X)
    rg = RidgeCV(alphas=[0.01,0.1,1.0,10.0,100.0], cv=min(5,len(d))).fit(sc.transform(X), y)
    return rg, sc, fc, fe

def fit_gp_split(df_tr, var):
    out = {}
    for pays in PAYS_33:
        dp = df_tr[df_tr['Pays']==pays].sort_values('Year')
        dp = dp.dropna(subset=[var,'gdpcap',f'reg_{var}_mean'])
        if len(dp) < 3:
            out[pays] = None; continue
        Xg = np.column_stack([
            dp['Year'].values,
            np.log(dp['gdpcap'].clip(lower=1).values),
            dp[f'reg_{var}_mean'].values])
        yg = dp[var].values
        sc = StandardScaler().fit(Xg)
        kernel = (RBF(length_scale=3.0, length_scale_bounds=(0.1,50.0))
                  + WhiteKernel(noise_level=0.01, noise_level_bounds=(1e-5,1.0)))
        try:
            gpr = GaussianProcessRegressor(kernel=kernel, n_restarts_optimizer=2,
                                            normalize_y=True, random_state=42)
            gpr.fit(sc.transform(Xg), yg)
            out[pays] = (gpr, sc)
        except Exception:
            out[pays] = None
    return out

def fit_nv_sp_split(df_tr):
    d = df_tr.dropna(subset=[
        'nv_sp','nv_sp_lag1','nv_sp_lag2','inflation_lag1','polstab',
        'log_nv_primes','gdp_growth','fdi']).copy()
    pdum = pd.get_dummies(d['Pays'], prefix='pays', drop_first=True).astype(float)
    d = pd.concat([d.reset_index(drop=True), pdum.reset_index(drop=True)], axis=1)
    fe = [c for c in d.columns if c.startswith('pays_')]
    fc = ['nv_sp_lag1','nv_sp_lag2','inflation_lag1','polstab',
          'log_nv_primes','gdp_growth'] + fe
    d = d.dropna(subset=fc)
    if len(d) < 10: return None
    X = d[fc].values; y = d['nv_sp'].values
    sc = StandardScaler().fit(X)
    rg = RidgeCV(alphas=[0.01,0.1,1,10,100], cv=min(5,len(d))).fit(sc.transform(X), y)
    pred_l1 = rg.predict(sc.transform(X)); resid = y - pred_l1
    rdum = pd.get_dummies(d['region'], prefix='reg', drop_first=True)
    d2 = pd.concat([d.reset_index(drop=True), rdum.reset_index(drop=True)], axis=1)
    rc = [c for c in d2.columns if c.startswith('reg_')]
    fxgb = ['nv_sp_lag1','nv_sp_lag2','inflation_lag1','polstab',
            'log_nv_primes','gdp_growth','fdi'] + rc
    fxgb = [f for f in fxgb if f in d2.columns]
    Xx = d2[fxgb].fillna(0).values
    xm = xgb.XGBRegressor(max_depth=3, n_estimators=50, learning_rate=0.05,
                           min_child_weight=5, subsample=0.8, colsample_bytree=0.7,
                           reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0)
    xm.fit(Xx, resid)
    return rg, sc, fc, fe, xm, fxgb, rc

def predict_ridge_row(row, fc, fe, scaler, ridge):
    pays_vec = np.zeros(len(fe))
    cn = f"pays_{row['Pays']}"
    if cn in fe: pays_vec[fe.index(cn)] = 1.0
    base = []
    for f in fc:
        if f.startswith('pays_'): continue
        v = row.get(f, np.nan)
        if pd.isna(v): return np.nan
        base.append(float(v))
    feat = np.array(base + list(pays_vec))
    if len(feat) != len(fc): return np.nan
    return float(ridge.predict(scaler.transform(feat.reshape(1,-1)))[0])

# ---- main loop ----
for train_years, test_years in SPLITS:
    df_tr = df[df['Year'].isin(train_years)].copy()
    df_te = df[df['Year'].isin(test_years)].copy()
    fit_nv  = fit_ridge_nv_split(df_tr)
    fit_vie = fit_ridge_vie_split(df_tr)
    fit_gdp = fit_ridge_gdp_split(df_tr)
    fit_pol = fit_gp_split(df_tr, 'polstab')
    fit_reg = fit_gp_split(df_tr, 'regqual')
    fit_sp  = fit_nv_sp_split(df_tr)

    for _, row_te in df_te.iterrows():
        pays = row_te['Pays']; yr = row_te['Year']

        true_v = row_te.get('nv_penetration', np.nan)
        if not pd.isna(true_v) and true_v>0 and fit_nv is not None:
            rg, sc, fc, fe = fit_nv
            log_pred = predict_ridge_row(row_te, fc, fe, sc, rg)
            if not np.isnan(log_pred):
                calibration_residuals['nv_penetration'].append((true_v, float(np.exp(log_pred))))

        true_v = row_te.get('vie_penetration', np.nan)
        if not pd.isna(true_v) and true_v>0 and fit_vie is not None:
            rg, sc, fc, fe = fit_vie
            log_pred = predict_ridge_row(row_te, fc, fe, sc, rg)
            if not np.isnan(log_pred):
                calibration_residuals['vie_penetration'].append((true_v, float(np.exp(log_pred))))

        true_v = row_te.get('gdpcap', np.nan)
        if not pd.isna(true_v) and true_v>0 and fit_gdp is not None:
            rg, sc, fc, fe = fit_gdp
            log_resid_pred = predict_ridge_row(row_te, fc, fe, sc, rg)
            log_glag = row_te.get('log_gdpcap_lag1', np.nan)
            g_obs    = row_te.get('gdp_growth', np.nan)
            pop_t    = row_te.get('population', np.nan)
            prev = df[(df['Pays']==pays) & (df['Year']==yr-1)]
            pop_tm1 = prev['population'].values[0] if len(prev)>0 else np.nan
            if (not np.isnan(log_resid_pred) and not pd.isna(log_glag) and not pd.isna(g_obs)
                and not pd.isna(pop_t) and not pd.isna(pop_tm1) and pop_tm1>0):
                pop_g = (pop_t/pop_tm1 - 1)*100
                log_g = log_glag + np.log1p(g_obs/100) - np.log1p(pop_g/100) + log_resid_pred
                calibration_residuals['gdpcap'].append((true_v, float(np.exp(log_g))))

        for var, fits in [('polstab', fit_pol), ('regqual', fit_reg)]:
            true_v = row_te.get(var, np.nan)
            if pd.isna(true_v): continue
            mp = fits.get(pays)
            if mp is None: continue
            gpr, sc = mp
            try:
                Xq = np.array([[yr, np.log(max(row_te.get('gdpcap',1.0),1.0)),
                                row_te.get(f'reg_{var}_mean', 0.0)]])
                pv = float(gpr.predict(sc.transform(Xq))[0])
                calibration_residuals[var].append((float(true_v), pv))
            except Exception:
                pass

        true_v = row_te.get('nv_sp', np.nan)
        if not pd.isna(true_v) and fit_sp is not None:
            rg, sc, fc, fe, xm, fxgb, rc = fit_sp
            l1 = predict_ridge_row(row_te, fc, fe, sc, rg)
            if not np.isnan(l1):
                xrow = []
            