Below is the full extracted pipeline. Source notebook: `C:\Users\SMAIKI\AtlanticRe\prediction\axe2_atlanticre_predictions_2030.ipynb` (45 cells; code cells 2–38 contain the pipeline).

---

# AtlanticRe Axe 2 — Pipeline 2025–2030 (extraction verbatim)

## Imports & file paths (cell 2)

```python
import warnings; warnings.filterwarnings('ignore')
import numpy as np, pandas as pd
import matplotlib.pyplot as plt, matplotlib.gridspec as gridspec
from matplotlib import cm
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
from sklearn.metrics import r2_score, mean_absolute_error, mean_absolute_percentage_error
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import xgboost as xgb
from scipy import stats
import os

BASE_DIR = os.path.dirname(os.path.abspath('__file__')) if '__file__' in dir() else '.'
PATH_ECO = os.path.join(BASE_DIR, 'africa_eco_integration_FINAL.csv')
PATH_NV  = os.path.join(BASE_DIR, 'marche_assurance_non_vie_FINAL.csv')
PATH_VIE = os.path.join(BASE_DIR, 'marche_assurance_vie_FINAL.csv')
PATH_WGI = os.path.join(BASE_DIR, 'wgi_africa_kaopen_FINAL.csv')
```

NOTE: `SimpleExpSmoothing` is in the user's tool list but is NOT used in the notebook — only `ARIMA` is.

---

## STEP 0 — Data loading & feature engineering

### 0.1 Load + merge + drop South Africa (cell 3)

```python
df_eco  = pd.read_csv(PATH_ECO)
df_nv   = pd.read_csv(PATH_NV)
df_vie  = pd.read_csv(PATH_VIE)
df_wgi  = pd.read_csv(PATH_WGI)

# Année -> Year on all 4
df_eco  = df_eco.rename(columns={'Année': 'Year'})
df_wgi  = df_wgi.rename(columns={'Année': 'Year'})
df_nv   = df_nv.rename(columns={'Année': 'Year'})
df_vie  = df_vie.rename(columns={'Année': 'Year'})

df_eco = df_eco.rename(columns={
    'Annual Real GDP Growth (%)': 'gdp_growth',
    'GDP Per Capita': 'gdpcap',
    'Gross Domestic Product (mn)': 'gdp',
    'Inflation Rate (%)': 'inflation',
    'Integration_Regionale_Score': 'integration',
    'Current Account Balance (mn)': 'current_account',
    'Exchange Rate': 'exchange_rate'
})
df_nv = df_nv.rename(columns={
    'Primes Emises (mn USD)': 'nv_primes',
    'Croissance Primes (%)': 'nv_croissance',
    'Taux Penetration (%)': 'nv_penetration',
    'Ratio S/P (%)': 'nv_sp',
    'Densite Assurance (USD/hab)': 'nv_densite'
})
df_vie = df_vie.rename(columns={
    'Primes Emises (mn USD)': 'vie_primes',
    'Croissance Primes (%)': 'vie_croissance',
    'Taux Penetration (%)': 'vie_penetration',
    'Densite Assurance (USD/hab)': 'vie_densite'
})
df_wgi = df_wgi.rename(columns={
    'FDI Inflows % GDP': 'fdi',
    'Political Stability': 'polstab',
    'Regulatory Quality': 'regqual',
})

df = df_eco.merge(df_nv,  on=['Pays','Year'])
df = df.merge(df_vie, on=['Pays','Year'])
df = df.merge(df_wgi, on=['Pays','Year'])

df = df[df['Pays'] != 'Afrique du Sud'].copy()  # exclude South Africa (scale bias)
```

### 0.2 REGIONS & PAYS_33 (cell 4)

```python
REGIONS = {
    'Afrique du Nord':   ['Algérie', 'Égypte', 'Maroc', 'Tunisie'],
    "Afrique de l'Ouest": ['Bénin','Burkina Faso','Cap-Vert',"Côte d'Ivoire",
                           'Ghana','Mali','Mauritanie','Niger','Nigeria','Sénégal','Togo'],
    'Afrique Centrale':  ['Cameroun','Congo','Gabon','RDC','Tchad'],
    "Afrique de l'Est":  ['Burundi','Éthiopie','Kenya','Madagascar','Mozambique','Ouganda','Tanzanie'],
    'Afrique Australe':  ['Angola','Botswana','Malawi','Maurice','Namibie','Zambie']
}
pays_to_region = {pays: reg for reg, pays_list in REGIONS.items() for pays in pays_list}
df['region'] = df['Pays'].map(pays_to_region)

PAYS_33    = sorted(df['Pays'].unique())  # 33 countries (after dropping Afrique du Sud)
YEARS_HIST = list(range(2015, 2025))      # 2015..2024
YEARS_PRED = list(range(2025, 2031))      # 2025..2030
```

PAYS_33 enumerated (4 + 11 + 5 + 7 + 6 = 33): Algérie, Angola, Bénin, Botswana, Burkina Faso, Burundi, Cameroun, Cap-Vert, Congo, Côte d'Ivoire, Égypte, Éthiopie, Gabon, Ghana, Kenya, Madagascar, Malawi, Mali, Maroc, Maurice, Mauritanie, Mozambique, Namibie, Niger, Nigeria, Ouganda, RDC, Sénégal, Tanzanie, Tchad, Togo, Tunisie, Zambie. (Order: `sorted()` — Python locale collation; the notebook sorts and uses this list everywhere.)

### 0.3 Transforms, lags, winsorisation, kaopen, population, regional means (cell 5)

```python
df = df.sort_values(['Pays','Year']).reset_index(drop=True)

# Log-transforms
df['log_nv_penetration']  = np.log(df['nv_penetration'].clip(lower=1e-4))
df['log_vie_penetration'] = np.log(df['vie_penetration'].clip(lower=1e-4))
df['log_gdpcap']          = np.log(df['gdpcap'].clip(lower=1))
df['log_nv_primes']       = np.log(df['nv_primes'].clip(lower=1e-4))

# Lags (t-1) by Pays
for col in ['gdpcap','log_gdpcap','polstab','regqual','inflation','nv_penetration',
            'log_nv_penetration','vie_penetration','log_vie_penetration',
            'nv_sp','log_nv_primes','gdp_growth']:
    df[f'{col}_lag1'] = df.groupby('Pays')[col].shift(1)
df['nv_sp_lag2'] = df.groupby('Pays')['nv_sp'].shift(2)

# Winsorisation
df['vie_croissance_w'] = df['vie_croissance'].clip(-50, 100)
df['nv_croissance_w']  = df['nv_croissance'].clip(-50, 100)

# kaopen → 3 buckets, dummies (drop_first=True)
df['kaopen_group'] = pd.cut(df['kaopen'], bins=[-np.inf, -1.0, 0.5, np.inf],
                            labels=['ferme','semi_ouvert','ouvert'])
kaopen_dummies = pd.get_dummies(df['kaopen_group'], prefix='kaopen', drop_first=True)
df = pd.concat([df, kaopen_dummies], axis=1)

# Implicit population (millions): gdp(mn USD) / gdpcap(USD)
df['population'] = df['gdp'] / df['gdpcap']

# Regional means per (region, year) for convergence features
regional_means = df.groupby(['region','Year'])[['nv_penetration','vie_penetration',
                                                 'gdpcap','polstab','regqual']].mean().reset_index()
regional_means = regional_means.rename(columns={
    'nv_penetration':'reg_nv_penet_mean','vie_penetration':'reg_vie_penet_mean',
    'gdpcap':'reg_gdpcap_mean','polstab':'reg_polstab_mean','regqual':'reg_regqual_mean'
})
df = df.merge(regional_means, on=['region','Year'], how='left')
```

What it does: harmonize CSVs, build the panel (33 × 10), engineer log/lag features, winsorize growth, discretize `kaopen`, derive implicit population, and compute regional means used as convergence features in WGI/penetration models.

---

## STEP 1 — Population projection (cell 7)

```python
CAGR_WINDOW = (2018, 2024)
POP_GROWTH_MIN, POP_GROWTH_MAX = 0.0, 0.045  # [0%, 4.5%/year]

pop_pred_dict   = {}   # {pays: {year: pop}}
pop_growth_dict = {}   # {pays: cagr}

for pays in PAYS_33:
    df_p = df[df['Pays'] == pays].sort_values('Year')
    pop_pred_dict[pays] = {}
    for yr in YEARS_HIST:
        v = df_p[df_p['Year'] == yr]['population'].values
        if len(v) > 0 and not pd.isna(v[0]):
            pop_pred_dict[pays][yr] = float(v[0])

    yr_a, yr_b = CAGR_WINDOW
    pop_a = pop_pred_dict[pays].get(yr_a)
    pop_b = pop_pred_dict[pays].get(yr_b)
    if pop_a and pop_b and pop_a > 0:
        cagr = (pop_b / pop_a) ** (1.0/(yr_b-yr_a)) - 1.0
    else:
        years_avail = sorted(pop_pred_dict[pays].keys())
        if len(years_avail) >= 2:
            ya, yb = years_avail[0], years_avail[-1]
            cagr = (pop_pred_dict[pays][yb]/pop_pred_dict[pays][ya])**(1.0/(yb-ya)) - 1.0
        else:
            cagr = 0.025
    cagr = float(np.clip(cagr, POP_GROWTH_MIN, POP_GROWTH_MAX))
    pop_growth_dict[pays] = cagr

    pop_prev = pop_pred_dict[pays][2024]
    for yr in YEARS_PRED:
        pop_next = pop_prev * (1.0 + cagr)
        pop_pred_dict[pays][yr] = float(pop_next)
        pop_prev = pop_next
```

What it does: Compounds population at a country-specific CAGR computed on 2018–2024, clipped to [0%, 4.5%], with fallback 2.5% if data missing.

---

## STEP 2a — Inflation projection (cell 9)

```python
INFL_MIN, INFL_MAX = -2.0, 60.0
INFL_RHO_MIN, INFL_RHO_MAX = 0.0, 0.95
INFL_MU_WINDOW = list(range(2018, 2025))  # 2018..2024

inflation_pred = {}
infl_rho_dict, infl_mu_dict = {}, {}

for pays in PAYS_33:
    df_p = df[df['Pays'] == pays].sort_values('Year')
    mu_p = df_p[df_p['Year'].isin(INFL_MU_WINDOW)]['inflation'].mean()
    if pd.isna(mu_p): mu_p = df_p['inflation'].mean()
    infl_mu_dict[pays] = float(mu_p)

    df_fit = df_p.dropna(subset=['inflation','inflation_lag1'])
    if len(df_fit) >= 5:
        x = (df_fit['inflation_lag1'].values - mu_p).reshape(-1,1)
        y = (df_fit['inflation'].values - mu_p)
        try:
            rho = float(np.linalg.lstsq(x, y, rcond=None)[0][0])
        except Exception:
            rho = 0.5
    else:
        rho = 0.5
    infl_rho_dict[pays] = float(np.clip(rho, INFL_RHO_MIN, INFL_RHO_MAX))

    inflation_pred[pays] = {}
    for yr in YEARS_HIST:
        v = df_p[df_p['Year']==yr]['inflation'].values
        inflation_pred[pays][yr] = float(v[0]) if len(v)>0 else mu_p

    infl_prev = inflation_pred[pays][2024]
    for yr in YEARS_PRED:
        infl_next = infl_rho_dict[pays] * (infl_prev - mu_p) + mu_p
        infl_next = float(np.clip(infl_next, INFL_MIN, INFL_MAX))
        inflation_pred[pays][yr] = infl_next
        infl_prev = infl_next
```

What it does: Per country, AR(1) mean-reversion `infl_t = ρ·(infl_{t-1}-μ)+μ`, with μ = mean 2018–2024, ρ estimated by least squares (clipped 0..0.95), values clipped to [-2%, 60%].

---

## STEP 2b — Exogenous projection: integration + fdi (cell 10)

```python
EXOG_MU_WINDOW = list(range(2018, 2025))

# integration ∈ [0,1]
INTEG_MIN, INTEG_MAX = 0.0, 1.0
INTEG_RHO_MIN, INTEG_RHO_MAX = 0.0, 0.85
integration_pred, integ_rho_dict, integ_mu_dict = {}, {}, {}

for pays in PAYS_33:
    df_p = df[df['Pays']==pays].sort_values('Year')
    s_int = df_p[df_p['Year'].isin(EXOG_MU_WINDOW)]['integration'].dropna()
    mu = float(s_int.mean()) if len(s_int)>0 else float(df_p['integration'].mean())
    if pd.isna(mu): mu = 0.5
    integ_mu_dict[pays] = mu

    df_fit = df_p.dropna(subset=['integration'])
    df_fit = df_fit.assign(lag=df_fit['integration'].shift(1)).dropna()
    if len(df_fit) >= 5:
        x = (df_fit['lag'].values - mu).reshape(-1,1)
        y = (df_fit['integration'].values - mu)
        try:    rho = float(np.linalg.lstsq(x, y, rcond=None)[0][0])
        except: rho = 0.5
    else:
        rho = 0.5
    integ_rho_dict[pays] = float(np.clip(rho, INTEG_RHO_MIN, INTEG_RHO_MAX))

    integration_pred[pays] = {}
    for yr in YEARS_HIST:
        v = df_p[df_p['Year']==yr]['integration'].values
        integration_pred[pays][yr] = float(v[0]) if len(v)>0 and not pd.isna(v[0]) else mu

    prev = integration_pred[pays][2024]
    for yr in YEARS_PRED:
        nxt = integ_rho_dict[pays] * (prev - mu) + mu
        nxt = float(np.clip(nxt, INTEG_MIN, INTEG_MAX))
        integration_pred[pays][yr] = nxt
        prev = nxt

# fdi (% GDP) ∈ [-5, 30]
FDI_MIN, FDI_MAX = -5.0, 30.0
FDI_RHO_MIN, FDI_RHO_MAX = 0.0, 0.85
fdi_pred, fdi_rho_dict, fdi_mu_dict = {}, {}, {}

for pays in PAYS_33:
    df_p = df[df['Pays']==pays].sort_values('Year')
    s_fdi = df_p[df_p['Year'].isin(EXOG_MU_WINDOW)]['fdi'].dropna()
    mu = float(s_fdi.mean()) if len(s_fdi)>0 else float(df_p['fdi'].mean())
    if pd.isna(mu): mu = 2.0
    fdi_mu_dict[pays] = mu

    df_fit = df_p.dropna(subset=['fdi'])
    df_fit = df_fit.assign(lag=df_fit['fdi'].shift(1)).dropna()
    if len(df_fit) >= 5:
        x = (df_fit['lag'].values - mu).reshape(-1,1)
        y = (df_fit['fdi'].values - mu)
        try:    rho = float(np.linalg.lstsq(x, y, rcond=None)[0][0])
        except: rho = 0.4
    else:
        rho = 0.4
    fdi_rho_dict[pays] = float(np.clip(rho, FDI_RHO_MIN, FDI_RHO_MAX))

    fdi_pred[pays] = {}
    for yr in YEARS_HIST:
        v = df_p[df_p['Year']==yr]['fdi'].values
        fdi_pred[pays][yr] = float(v[0]) if len(v)>0 and not pd.isna(v[0]) else mu

    prev = fdi_pred[pays][2024]
    for yr in YEARS_PRED:
        nxt = fdi_rho_dict[pays] * (prev - mu) + mu
        nxt = float(np.clip(nxt, FDI_MIN, FDI_MAX))
        fdi_pred[pays][yr] = nxt
        prev = nxt
```

What it does: Same AR(1) MR pattern as inflation, applied separately to `integration` (μ-fallback 0.5) and `fdi` (μ-fallback 2.0) with their own ρ-bounds (≤0.85) and value bounds.

---

## STEP 2c — gdp_growth: hierarchical Ridge + Axco blending

### 2c.1 Hierarchical Ridge fit & projection (cell 11)

```python
GDP_GROWTH_MIN, GDP_GROWTH_MAX = -5.0, 12.0
RHO_MIN, RHO_MAX = -0.5, 0.95
MU_WINDOW_GROWTH = list(range(2018, 2025))      # 2018..2024
MU_GROWTH_CLIP   = (1.0, 8.5)
MU_GROWTH_DEFAULT = 4.2
MU_CONTINENT      = 4.0

BRENT_HIST = {2014: 99.0, 2015: 52.4, 2016: 43.7, 2017: 54.2, 2018: 71.0,
              2019: 64.3, 2020: 41.8, 2021: 70.9, 2022: 100.9,
              2023: 82.5, 2024: 80.5}
BRENT_PROJ_FLAT = float(np.mean([BRENT_HIST[y] for y in range(2020, 2025)]))
BRENT_LAG1 = {y: BRENT_HIST[y-1] for y in range(2015, 2025)}
for yr in YEARS_PRED:
    BRENT_LAG1[yr] = BRENT_PROJ_FLAT

# 1) μ_pays
mu_pays_dict = {}
for pays in PAYS_33:
    df_p = df[df['Pays']==pays].sort_values('Year')
    g_window = df_p[df_p['Year'].isin(MU_WINDOW_GROWTH)]['gdp_growth'].dropna()
    mu_p = float(g_window.mean()) if len(g_window)>0 else MU_GROWTH_DEFAULT
    mu_pays_dict[pays] = float(np.clip(mu_p, MU_GROWTH_CLIP[0], MU_GROWTH_CLIP[1]))

# 2) Train dataset — y centered by μ_pays
df_gdp = df.dropna(subset=['gdp_growth','gdp_growth_lag1','inflation_lag1']).copy()
df_gdp['brent_lag1'] = df_gdp['Year'].map(BRENT_LAG1)
df_gdp['mu_pays']    = df_gdp['Pays'].map(mu_pays_dict)
df_gdp['g_lag_dev']  = df_gdp['gdp_growth_lag1'] - df_gdp['mu_pays']

pays_dum_g = pd.get_dummies(df_gdp['Pays'], prefix='pays', drop_first=True).astype(float)
pays_int_g = pays_dum_g.multiply(df_gdp['g_lag_dev'].values, axis=0)
pays_int_g.columns = [c.replace('pays_','rho_') for c in pays_int_g.columns]

X_g = pd.concat([
    df_gdp[['g_lag_dev','inflation_lag1','brent_lag1']].reset_index(drop=True),
    pays_dum_g.reset_index(drop=True),
    pays_int_g.reset_index(drop=True),
], axis=1)
y_g = df_gdp['gdp_growth'].values - df_gdp['mu_pays'].values

scaler_g = StandardScaler()
X_g_sc   = scaler_g.fit_transform(X_g.values)

ridge_g = RidgeCV(alphas=[0.05, 0.5, 1.0, 5.0, 10.0, 30.0, 100.0], cv=5)
ridge_g.fit(X_g_sc, y_g)

# 3) Helper to assemble a feature row for inference
feat_names_g = list(X_g.columns); n_feat_g = len(feat_names_g)
idx_glag  = feat_names_g.index('g_lag_dev')
idx_infl  = feat_names_g.index('inflation_lag1')
idx_brent = feat_names_g.index('brent_lag1')

def build_row_g(pays, g_lag_dev_val, infl_val, brent_val):
    row = np.zeros(n_feat_g, dtype=float)
    row[idx_glag]  = g_lag_dev_val
    row[idx_infl]  = infl_val
    row[idx_brent] = brent_val
    pcol, rcol = f'pays_{pays}', f'rho_{pays}'
    if pcol in feat_names_g: row[feat_names_g.index(pcol)] = 1.0
    if rcol in feat_names_g: row[feat_names_g.index(rcol)] = g_lag_dev_val
    return row

# 4) Implicit ρ_pays diagnostic
rho_implied = {}
for pays in PAYS_33:
    r1 = build_row_g(pays, 1.0, 0.0, 0.0)
    r0 = build_row_g(pays, 0.0, 0.0, 0.0)
    p1 = ridge_g.predict(scaler_g.transform(r1.reshape(1,-1)))[0]
    p0 = ridge_g.predict(scaler_g.transform(r0.reshape(1,-1)))[0]
    rho_implied[pays] = float(np.clip(p1 - p0, RHO_MIN, RHO_MAX))

# 5) Recursive projection 2025-2030
gdp_growth_pred = {}
for pays in PAYS_33:
    df_p = df[df['Pays']==pays].sort_values('Year')
    gdp_growth_pred[pays] = {}
    for yr in YEARS_HIST:
        v = df_p[df_p['Year']==yr]['gdp_growth'].values
        gdp_growth_pred[pays][yr] = float(v[0]) if len(v)>0 else mu_pays_dict[pays]

    mu_p   = mu_pays_dict[pays]
    g_prev = gdp_growth_pred[pays][2024]
    for yr in YEARS_PRED:
        row = build_row_g(pays, g_prev - mu_p,
                          inflation_pred[pays][yr-1], BRENT_LAG1[yr]).reshape(1,-1)
        y_centered = ridge_g.predict(scaler_g.transform(row))[0]
        g_next = float(np.clip(mu_p + y_centered, GDP_GROWTH_MIN, GDP_GROWTH_MAX))
        gdp_growth_pred[pays][yr] = g_next
        g_prev = g_next

rho_dict = rho_implied
beta_infl_dict = {p: 0.0 for p in PAYS_33}
```

### 2c.2 Axco loading + blending + structural correction + re-anchor (cell 12)

```python
AXCO_PATH = os.path.join(BASE_DIR, 'Axco-Navigator-Data-Pivot-2026-04-26T00-40-40.xlsx')

if os.path.exists(AXCO_PATH):
    df_axco_raw = pd.read_excel(AXCO_PATH, sheet_name=0, header=3)
    df_axco_raw = df_axco_raw[pd.to_numeric(df_axco_raw['Year'], errors='coerce').notna()].copy()
    df_axco_raw['Year'] = df_axco_raw['Year'].astype(int)
    df_axco_ref = df_axco_raw[df_axco_raw['Year'].isin([2025, 2026, 2027])].copy()

    AXCO_COUNTRY_MAP = {
        'Algeria':'Algérie','Angola':'Angola','Benin':'Bénin','Botswana':'Botswana',
        'Burkina Faso':'Burkina Faso','Burundi':'Burundi','Cameroon':'Cameroun',
        'Cape Verde':'Cap-Vert','Chad':'Tchad',
        'Congo, Democratic Republic of the':'RDC','Congo, Republic of the':'Congo',
        'Egypt':'Égypte','Ethiopia':'Éthiopie','Ivory Coast':"Côte d'Ivoire",
        'Gabon':'Gabon','Ghana':'Ghana','Kenya':'Kenya','Madagascar':'Madagascar',
        'Malawi':'Malawi','Mali':'Mali','Mauritania':'Mauritanie','Mauritius':'Maurice',
        'Morocco':'Maroc','Mozambique':'Mozambique','Namibia':'Namibie','Niger':'Niger',
        'Nigeria':'Nigeria','Senegal':'Sénégal','Tanzania':'Tanzanie','Togo':'Togo',
        'Tunisia':'Tunisie','Uganda':'Ouganda','Zambia':'Zambie',
    }
    df_axco_ref['Pays_FR'] = df_axco_ref['Country'].map(AXCO_COUNTRY_MAP)

    axco_gdp_growth_anchor = {}
    axco_gdpcap_anchor     = {}
    for pays_fr in PAYS_33:
        axco_gdp_growth_anchor[pays_fr] = {}
        axco_gdpcap_anchor[pays_fr]     = {}
        sub = df_axco_ref[df_axco_ref['Pays_FR'] == pays_fr]
        for _, row in sub.iter