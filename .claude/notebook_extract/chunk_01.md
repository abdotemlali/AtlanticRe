rows():
            yr = int(row['Year'])
            gg = np.nan
            for col_name in ['Annual Real GDP Growth (%)','GDP Growth (%)','Real GDP Growth (%)']:
                if col_name in row.index and not pd.isna(row[col_name]):
                    gg = float(row[col_name]); break
            gc = np.nan
            for col_name in ['GDP Per Capita','GDP per Capita','GDP Per Capita (USD)']:
                if col_name in row.index and not pd.isna(row[col_name]):
                    gc = float(row[col_name]); break
            if not pd.isna(gg): axco_gdp_growth_anchor[pays_fr][yr] = gg
            if not pd.isna(gc): axco_gdpcap_anchor[pays_fr][yr]     = gc

    AXCO_LOADED = True

    BLEND_WEIGHTS = {
        2025: (0.10, 0.90),  # (w_AtlanticRe, w_Axco)
        2026: (0.30, 0.70),
        2027: (0.50, 0.50),
    }

    # (A) Blend 2025-2027
    for pays in PAYS_33:
        for yr in [2025, 2026, 2027]:
            axco_val = axco_gdp_growth_anchor.get(pays, {}).get(yr, np.nan)
            ar_val   = gdp_growth_pred[pays].get(yr, np.nan)
            if not (pd.isna(axco_val) or pd.isna(ar_val)):
                w_ar, w_ax = BLEND_WEIGHTS[yr]
                blended = w_ar*ar_val + w_ax*axco_val
                gdp_growth_pred[pays][yr] = float(np.clip(blended, GDP_GROWTH_MIN, GDP_GROWTH_MAX))

    # (B) Structural correction 2028-2030 — decaying bias 0.5 * 0.7^k
    for pays in PAYS_33:
        biases = []
        for yr in [2025, 2026, 2027]:
            axco_val = axco_gdp_growth_anchor.get(pays, {}).get(yr, np.nan)
            ar_val   = gdp_growth_pred[pays].get(yr, np.nan)
            if not (pd.isna(axco_val) or pd.isna(ar_val)):
                biases.append(axco_val - ar_val)
        if len(biases) >= 2:
            avg_bias = float(np.mean(biases))
            for i_yr, yr in enumerate([2028, 2029, 2030]):
                decay = 0.5 * (0.7 ** i_yr)
                correction = avg_bias * decay
                current = gdp_growth_pred[pays].get(yr, np.nan)
                if not pd.isna(current):
                    gdp_growth_pred[pays][yr] = float(np.clip(
                        current + correction, GDP_GROWTH_MIN, GDP_GROWTH_MAX))

    # (C) Override μ_pays with Axco mean 2025-2027 (if ≥2 anchors)
    for pays in PAYS_33:
        axco_vals = [axco_gdp_growth_anchor.get(pays,{}).get(yr, np.nan) for yr in [2025,2026,2027]]
        axco_vals_valid = [v for v in axco_vals if not pd.isna(v)]
        if len(axco_vals_valid) >= 2:
            mu_axco = float(np.mean(axco_vals_valid))
            mu_pays_dict[pays] = float(np.clip(mu_axco, 1.0, 8.5))

    # (D) Re-project 2028-2030 anchored on Axco/blended 2027
    for pays in PAYS_33:
        g_start = axco_gdp_growth_anchor.get(pays,{}).get(2027, np.nan)
        if pd.isna(g_start):
            g_start = gdp_growth_pred[pays].get(2027, np.nan)
        if pd.isna(g_start):
            continue
        mu_p = mu_pays_dict[pays]
        g_prev = g_start
        for yr in [2028, 2029, 2030]:
            row = build_row_g(pays, g_prev - mu_p,
                              inflation_pred[pays].get(yr-1, 0.0), BRENT_LAG1[yr]).reshape(1,-1)
            y_centered = ridge_g.predict(scaler_g.transform(row))[0]
            g_next = float(np.clip(mu_p + y_centered, GDP_GROWTH_MIN, GDP_GROWTH_MAX))
            gdp_growth_pred[pays][yr] = g_next
            g_prev = g_next
else:
    AXCO_LOADED = False
    axco_gdp_growth_anchor = {}
    axco_gdpcap_anchor     = {}
    BLEND_WEIGHTS          = {}
```

What it does: Hierarchical Ridge with country FE + country×g_lag interaction (implicit ρ_i), centred by μ_pays(2018-24), enriched with `inflation_lag1` and `brent_lag1`. After fit, four post-processing passes consume Axco anchors: (A) blend, (B) decaying-bias structural correction, (C) μ_pays override with Axco prior, (D) re-anchor recursive projection on Axco 2027.

Dependencies: needs `inflation_pred` (2a), `BRENT_LAG1`. The Axco file structure (sheet 0, header row 3) provides at least: `Country`, `Year`, `Annual Real GDP Growth (%)` (alternates `GDP Growth (%)`, `Real GDP Growth (%)`), `GDP Per Capita` (alternates `GDP per Capita`, `GDP Per Capita (USD)`). Sheet name in cell 38 is `'Report Data'` and also exposes `Gross Domestic Product (mn)` and `Total Population (mn)`.

---

## STEP 3 — gdpcap (FE-OLS + Ridge + ARIMA residuals + Axco blending)

### 3.1 Train residual model (cell 14)

```python
df_train_gdp = df[df['Year'] >= 2016].dropna(subset=[
    'log_gdpcap','log_gdpcap_lag1','gdp_growth','inflation_lag1','integration','reg_gdpcap_mean'
]).copy()
df_train_gdp = df_train_gdp.sort_values(['Pays','Year']).reset_index(drop=True)
df_train_gdp['pop_lag1'] = df_train_gdp.groupby('Pays')['population'].shift(1)
df_train_gdp['pop_growth_hist'] = (df_train_gdp['population'] / df_train_gdp['pop_lag1'] - 1)*100
df_train_gdp = df_train_gdp.dropna(subset=['pop_growth_hist']).copy()

# Target = residual log of accounting identity
df_train_gdp['log_resid_gdp'] = (
    df_train_gdp['log_gdpcap']
    - df_train_gdp['log_gdpcap_lag1']
    - np.log1p(df_train_gdp['gdp_growth']/100.0)
    + np.log1p(df_train_gdp['pop_growth_hist']/100.0)
)

pays_dummies = pd.get_dummies(df_train_gdp['Pays'], prefix='pays', drop_first=True).astype(float)
df_train_gdp = pd.concat([df_train_gdp.reset_index(drop=True), pays_dummies.reset_index(drop=True)], axis=1)
fe_cols = [c for c in df_train_gdp.columns if c.startswith('pays_')]
feature_cols_gdp = ['log_gdpcap_lag1','inflation_lag1','integration','Year'] + fe_cols

X_gdp = df_train_gdp[feature_cols_gdp].values
y_gdp = df_train_gdp['log_resid_gdp'].values

scaler_gdp = StandardScaler()
X_gdp_sc   = scaler_gdp.fit_transform(X_gdp)

ridge_gdp = RidgeCV(alphas=[0.01,0.1,1.0,10.0,100.0], cv=5)
ridge_gdp.fit(X_gdp_sc, y_gdp)

y_gdp_pred_train = ridge_gdp.predict(X_gdp_sc)
df_train_gdp['residual_gdp'] = y_gdp - y_gdp_pred_train

arima_gdp = {}
for pays in PAYS_33:
    resid_p = df_train_gdp[df_train_gdp['Pays']==pays].sort_values('Year')['residual_gdp'].values
    if len(resid_p) >= 4:
        try:    arima_gdp[pays] = ARIMA(resid_p, order=(1,0,0)).fit()
        except: arima_gdp[pays] = None
    else:
        arima_gdp[pays] = None
```

### 3.2 Project gdpcap & gdp via accounting identity + Axco blend (cell 15)

```python
LOG_RESID_CLAMP = 0.0008  # |log_resid| ≤ 0.08% so identity holds within 1e-3

gdpcap_pred = {}
gdp_pred_dict = {}
pop_growth_pred = {}

dummy_pays_cols = fe_cols
identity_check  = {'max_dev': 0.0, 'pays_max': None, 'yr_max': None}

for pays in PAYS_33:
    df_p = df[df['Pays']==pays].sort_values('Year')
    gdpcap_pred[pays]   = {}
    gdp_pred_dict[pays] = {}
    pop_growth_pred[pays] = {}

    for yr in YEARS_HIST:
        row = df_p[df_p['Year']==yr]
        if len(row)>0:
            gdpcap_pred[pays][yr]   = float(row['gdpcap'].values[0])
            gdp_pred_dict[pays][yr] = float(row['gdp'].values[0])

    for yr in (YEARS_HIST + YEARS_PRED):
        if yr == YEARS_HIST[0]:
            pop_growth_pred[pays][yr] = np.nan; continue
        pop_t   = pop_pred_dict[pays].get(yr, np.nan)
        pop_tm1 = pop_pred_dict[pays].get(yr-1, np.nan)
        pop_growth_pred[pays][yr] = (pop_t/pop_tm1 - 1.0)*100.0 if (pop_tm1 and pop_tm1>0) else 0.0

    pays_vec = np.zeros(len(dummy_pays_cols))
    col_name = f'pays_{pays}'
    if col_name in dummy_pays_cols:
        pays_vec[dummy_pays_cols.index(col_name)] = 1.0

    if arima_gdp.get(pays) is not None:
        try:    arima_forecast = arima_gdp[pays].forecast(steps=6)
        except: arima_forecast = np.zeros(6)
    else:
        arima_forecast = np.zeros(6)

    log_gdpcap_prev = np.log(gdpcap_pred[pays][2024])

    for i, yr in enumerate(YEARS_PRED):
        infl_lag = inflation_pred[pays][yr-1]
        integ_t  = integration_pred[pays][yr]
        feat_vec = np.array([log_gdpcap_prev, infl_lag, integ_t, yr] + list(pays_vec))
        feat_sc  = scaler_gdp.transform(feat_vec.reshape(1,-1))
        log_resid_pred = float(ridge_gdp.predict(feat_sc)[0]) + float(arima_forecast[i])
        log_resid_pred = float(np.clip(log_resid_pred, -LOG_RESID_CLAMP, LOG_RESID_CLAMP))

        g_t     = gdp_growth_pred[pays][yr]
        pop_g_t = pop_growth_pred[pays][yr]

        log_gdpcap_t = (log_gdpcap_prev
                        + np.log1p(g_t/100.0)
                        - np.log1p(pop_g_t/100.0)
                        + log_resid_pred)
        gdpcap_v = max(float(np.exp(log_gdpcap_t)), 100.0)
        gdpcap_pred[pays][yr] = gdpcap_v
        pop = pop_pred_dict[pays][yr]
        gdp_pred_dict[pays][yr] = gdpcap_v * pop

        # diagnostic — accounting-identity gap
        ratio_pred = gdpcap_pred[pays][yr] / gdpcap_pred[pays][yr-1]
        ratio_id   = (1.0 + g_t/100.0) / (1.0 + pop_g_t/100.0)
        dev = abs(ratio_pred - ratio_id)
        if dev > identity_check['max_dev']:
            identity_check.update({'max_dev': dev, 'pays_max': pays, 'yr_max': yr})

        log_gdpcap_prev = log_gdpcap_t

# Axco blending on gdpcap (uses BLEND_WEIGHTS from cell 12)
if 'AXCO_LOADED' in dir() and AXCO_LOADED:
    for pays in PAYS_33:
        for yr in [2025, 2026, 2027]:
            axco_val = axco_gdpcap_anchor.get(pays, {}).get(yr, np.nan)
            ar_val   = gdpcap_pred[pays].get(yr, np.nan)
            if not (pd.isna(axco_val) or pd.isna(ar_val)):
                w_ar, w_ax = BLEND_WEIGHTS[yr]
                blended_gdpcap = max(w_ar*ar_val + w_ax*axco_val, 100.0)
                gdpcap_pred[pays][yr] = blended_gdpcap
                pop = pop_pred_dict[pays].get(yr, 1.0)
                gdp_pred_dict[pays][yr] = blended_gdpcap * pop
```

What it does: Projects `log(gdpcap)` via the exact accounting identity `Δlog gdpcap = log(1+g) − log(1+pop_g) + ε`. Ridge + per-country ARIMA(1,0,0) model only the residual `ε`, clamped to ±0.0008. After projection, blend Axco's 2025–2027 gdpcap with the same `BLEND_WEIGHTS` and recompute `gdp = gdpcap × pop`.

Dependencies: needs `gdp_growth_pred` (2c), `inflation_pred` (2a), `integration_pred` (2b), `pop_pred_dict` (1).

---

## STEP 4 — polstab & regqual via Gaussian Process (cell 17)

```python
WGI_VARS   = ['polstab', 'regqual']
WGI_BOUNDS = (-2.5, 2.5)
WGI_MAX_CHANGE_PER_YEAR = 0.15

gp_preds  = {v: {} for v in WGI_VARS}
gp_sigma  = {v: {} for v in WGI_VARS}
gp_models = {v: {} for v in WGI_VARS}

for var in WGI_VARS:
    for pays in PAYS_33:
        df_p = df[df['Pays']==pays].sort_values('Year')

        X_gp = np.column_stack([
            df_p['Year'].values,
            np.log(df_p['gdpcap'].clip(lower=1).values),
            df_p[f'reg_{var}_mean'].values
        ])
        y_gp = df_p[var].values

        sc = StandardScaler()
        X_gp_sc = sc.fit_transform(X_gp)

        kernel = (RBF(length_scale=3.0, length_scale_bounds=(0.1, 50.0))
                  + WhiteKernel(noise_level=0.01, noise_level_bounds=(1e-5, 1.0)))
        gpr = GaussianProcessRegressor(kernel=kernel, n_restarts_optimizer=5,
                                       normalize_y=True, random_state=42)
        gpr.fit(X_gp_sc, y_gp)
        gp_models[var][pays] = (gpr, sc, df_p)

        gp_preds[var][pays] = {}
        gp_sigma[var][pays] = {}
        for yr in YEARS_HIST:
            row = df_p[df_p['Year']==yr]
            gp_preds[var][pays][yr] = row[var].values[0] if len(row)>0 else y_gp.mean()
            gp_sigma[var][pays][yr] = 0.0

        # extrapolate regional trend linearly
        reg_col = f'reg_{var}_mean'
        reg_hist = df_p[[reg_col, 'Year']].dropna()
        if len(reg_hist) >= 2:
            s, b, _, _, _ = stats.linregress(reg_hist['Year'], reg_hist[reg_col])
        else:
            s, b = 0, df_p[var].mean()

        for yr in YEARS_PRED:
            reg_trend = s*yr + b
            gdpcap_f  = gdpcap_pred[pays][yr]
            X_fut = np.array([[yr, np.log(max(gdpcap_f,1)), reg_trend]])
            X_fut_sc = sc.transform(X_fut)
            y_f, sigma_f = gpr.predict(X_fut_sc, return_std=True)

            prev_val = gp_preds[var][pays][yr-1]
            raw_pred = float(y_f[0])
            constrained = np.clip(raw_pred,
                                  prev_val - WGI_MAX_CHANGE_PER_YEAR,
                                  prev_val + WGI_MAX_CHANGE_PER_YEAR)
            constrained = np.clip(constrained, WGI_BOUNDS[0], WGI_BOUNDS[1])
            gp_preds[var][pays][yr] = constrained
            gp_sigma[var][pays][yr] = float(sigma_f[0])
```

What it does: Per country and per WGI variable, fit a GP on `[Year, log(gdpcap), regional_mean]` with kernel `RBF(3.0)+WhiteKernel(0.01)`. Project future regional mean by linear regression in time, predict, then clip annual change to ±0.15 and bound to [-2.5, 2.5]. Stores GP std for IC.

Depends on `gdpcap_pred` (3).

---

## STEP 5 — nv_penetration (FE-OLS + RidgeCV + ARIMA residuals)

### 5.1 Train (cell 19)

```python
df_train_nv = df[df['Year'] >= 2016].dropna(subset=[
    'log_nv_penetration','log_nv_penetration_lag1',
    'log_gdpcap_lag1','polstab_lag1','regqual_lag1',
    'inflation_lag1','integration'
]).copy()

pays_dum_nv = pd.get_dummies(df_train_nv['Pays'], prefix='pays', drop_first=True)
df_train_nv = pd.concat([df_train_nv.reset_index(drop=True), pays_dum_nv.reset_index(drop=True)], axis=1)
fe_cols_nv  = [c for c in df_train_nv.columns if c.startswith('pays_')]

df_train_nv['reg_nv_lag1'] = df_train_nv.groupby('region')['log_nv_penetration'].shift(1)

feature_cols_nv = (['log_nv_penetration_lag1','log_gdpcap_lag1',
                    'polstab_lag1','regqual_lag1',
                    'inflation_lag1','integration','Year'] + fe_cols_nv)

df_train_nv = df_train_nv.dropna(subset=feature_cols_nv)
X_nv = df_train_nv[feature_cols_nv].values
y_nv = df_train_nv['log_nv_penetration'].values

scaler_nv = StandardScaler()
X_nv_sc   = scaler_nv.fit_transform(X_nv)
ridge_nv  = RidgeCV(alphas=[0.01,0.1,1,10,100], cv=5).fit(X_nv_sc, y_nv)

y_nv_pred_train = ridge_nv.predict(X_nv_sc)
df_train_nv['residual_nv'] = y_nv - y_nv_pred_train

arima_nv = {}
for pays in PAYS_33:
    resid_p = df_train_nv[df_train_nv['Pays']==pays].sort_values('Year')['residual_nv'].values
    if len(resid_p) >= 4:
        try:    arima_nv[pays] = ARIMA(resid_p, order=(1,0,0)).fit()
        except: arima_nv[pays] = None
    else:
        arima_nv[pays] = None
```

### 5.2 Project (cell 20)

```python
NV_PENET_MIN, NV_PENET_MAX = 0.01, 5.0  # %

nv_penet_pred = {}
dummy_pays_cols_nv = fe_cols_nv

for pays in PAYS_33:
    nv_penet_pred[pays] = {}
    df_p = df[df['Pays']==pays].sort_values('Year')

    for yr in YEARS_HIST:
        row = df_p[df_p['Year']==yr]
        nv_penet_pred[pays][yr] = row['nv_penetration'].values[0] if len(row)>0 else np.nan

    pays_vec_nv = np.zeros(len(dummy_pays_cols_nv))
    col_name = f'pays_{pays}'
    if col_name in dummy_pays_cols_nv:
        pays_vec_nv[dummy_pays_cols_nv.index(col_name)] = 1

    last_infl = df_p['inflation'].iloc[-1] if len(df_p)>0 else 7.0  # last observed inflation

    if arima_nv.get(pays) is not None:
        try:    nv_arima_fc = arima_nv[pays].forecast(steps=6)
        except: nv_arima_fc = np.zeros(6)
    else:
        nv_arima_fc = np.zeros(6)

    log_nv_prev = np.log(max(nv_penet_pred[pays][2024], NV_PENET_MIN))

    for i, yr in enumerate(YEARS_PRED):
        log_gdpcap_f  = np.log(max(gdpcap_pred[pays][yr], 1))
        polstab_f_lag = gp_preds['polstab'][pays][yr-1]
        regqual_f_lag = gp_preds['regqual'][pays][yr-1]

        feat = np.array([log_nv_prev, log_gdpcap_f, polstab_f_lag, regqual_f_lag,
                         last_infl, integration_pred[pays][yr], yr] + list(pays_vec_nv))
        feat_sc = scaler_nv.transform(feat.reshape(1,-1))
        log_nv_ridge = ridge_nv.predict(feat_sc)[0]
        log_nv_final = log_nv_ridge + nv_arima_fc[i]
        nv_v = np.clip(np.exp(log_nv_final), NV_PENET_MIN, NV_PENET_MAX)
        nv_penet_pred[pays][yr] = nv_v
        log_nv_prev = np.log(nv_v)
```

What it does: log-linear FE-OLS on penetration with country FE + lag(1) macro regressors; per-country ARIMA(1,0,0) residual. NOTE: at projection time the inflation feature is the **last observed value** (`df_p['inflation'].iloc[-1]`), NOT the dynamic `inflation_pred`. Output bounded [0.01, 5.0]%.

Depends on `gdpcap_pred` (3), `gp_preds['polstab'/'regqual']` (4), `integration_pred` (2b).

---

## STEP 6 — vie_penetration (FE-OLS + RidgeCV + ARIMA residuals + nv_penet feedback)

### 6.1 Train (cell 22)

```python
df_train_vie = df[df['Year'] >= 2016].dropna(subset=[
    'log_vie_penetration','log_vie_penetration_lag1',
    'log_gdpcap_lag1','polstab_lag1','regqual_lag1',
    'inflation_lag1','integration','log_nv_penetration_lag1'
]).copy()

pays_dum_vie = pd.get_dummies(df_train_vie['Pays'], prefix='pays', drop_first=True)
df_train_vie = pd.concat([df_train_vie.reset_index(drop=True), pays_dum_vie.reset_index(drop=True)], axis=1)
fe_cols_vie  = [c for c in df_train_vie.columns if c.startswith('pays_')]

feature_cols_vie = (['log_vie_penetration_lag1','log_gdpcap_lag1',
                     'polstab_lag1','regqual_lag1',
                     'inflation_lag1','integration',
                     'log_nv_penetration_lag1','Year'] + fe_cols_vie)

df_train_vie = df_train_vie.dropna(subset=feature_cols_vie)
X_vie = df_train_vie[feature_cols_vie].values
y_vie = df_train_vie['log_vie_penetration'].values

scaler_vie = StandardScaler()
X_vie_sc   = scaler_vie.fit_transform(X_vie)
ridge_vie  = RidgeCV(alphas=[0.01,0.1,1,10,100], cv=5).fit(X_vie_sc, y_vie)

df_train_vie['residual_vie'] = y_vie - ridge_vie.predict(X_vie_sc)

arima_vie = {}
for pays in PAYS_33:
    resid_p = df_train_vie[df_train_vie['Pays']==pays].sort_values('Year')['residual_vie'].values
    if len(resid_p) >= 4:
        try:    arima_vie[pays] = ARIMA(resid_p, order=(1,0,0)).fit()
        except: arima_vie[pays] = None
    else:
        arima_vie[pays] = None
```

### 6.2 Project (cell 23)

```python
VIE_PENET_MIN, VIE_PENET_MAX = 0.001, 10.0

vie_pen