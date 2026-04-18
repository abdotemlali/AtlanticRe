# Contexte Axe 2 — Modélisation Afrique 2030 (AtlanticRe)

> **Document de référence exhaustif — Axe 2**  
> Version : Avril 2026 | Généré à partir du code source  
> Ce fichier décrit **toutes les fonctionnalités existantes** de l'Axe 2 de l'application AtlanticRe.

---

## 1. Vue d'ensemble de l'Axe 2

### 1.1 Positionnement stratégique

L'Axe 2 "Modélisation Afrique 2030" est la **dimension prospective et stratégique** d'AtlanticRe. Il analyse les marchés africains d'assurance sur un plan externe (données de marché publiques, indicateurs macroéconomiques, gouvernance) pour orienter la stratégie de développement à horizon 2030.

**Périmètre** : 34 pays africains, données 2015–2024.

**Accès** : Route `/modelisation` → `ModelisationHome.tsx` (landing page de l'axe).

### 1.2 Modules de l'Axe 2

```
/modelisation                          → ModelisationHome.tsx (hub central)
/modelisation/scar                     → SCAR Scoring
/modelisation/cartographie/non-vie     → CartographieNonVie.tsx
/modelisation/cartographie/vie         → CartographieVie.tsx
/modelisation/cartographie/macro       → CartographieMacro.tsx
/modelisation/cartographie/gouvernance → CartographieGouvernance.tsx
/modelisation/projections              → Projections ML
/modelisation/analyse                  → AnalyseGlobale.tsx  ← NOUVEAU
/modelisation/analyse/:pays            → AnalysePays.tsx     ← NOUVEAU
```

### 1.3 Sources de données

| Module | Sources |
|---|---|
| Non-Vie | Axco Navigator · Backcasting |
| Vie | Axco Navigator · Backcasting |
| Macroéconomie | World Bank · IMF · UNCTAD |
| Gouvernance | World Bank WGI · Chinn-Ito Index · UNCTAD FDI |
| Analyse par Pays | Consolidation des 4 sources ci-dessus |

### 1.4 Stack technique (Axe 2 spécifique)

| Technologie | Usage |
|---|---|
| `useCartographieData` | Hook central de récupération des données cartographie |
| `react-simple-maps` | Rendu de la carte SVG Afrique |
| `recharts` | Tous les graphiques (bar, scatter, radar, heatmap…) |
| Hooks d'insights | `useNonVieInsights`, `useVieInsights`, `useMacroInsights`, `useGouvInsights`, `useAnalyseInsights` |
| `useParams` (react-router) | Récupération du pays depuis l'URL (`:pays`) |
| `react-select` | Sélecteur de pays avec navigation automatique |

---

## 2. Page : Hub Modélisation (`/modelisation`)

### 2.1 Description

`ModelisationHome.tsx` — Page d'accueil de l'Axe 2. Présente les modules disponibles et des indicateurs clés de synthèse SCAR. Inclut désormais un accès direct au module **Analyse par Pays**.

### 2.2 Structure de la page

- **Header** : Logo + description de l'axe stratégique
- **Grille des modules** : 5 cartes navigables (SCAR, Non-Vie, Vie, Macro, Gouvernance, ML)
- **Section indicateurs SCAR** : Tableau de bord synthétique des indicateurs phares

### 2.3 Indicateurs SCAR (INDICATEURS constant)

Les indicateurs clés présentés sur la page d'accueil :

```typescript
const INDICATEURS = [
  { label: 'Taux de pénétration Afrique',    value: '2.8%',   trend: '+0.3%' },
  { label: 'Primes Non-Vie continent',        value: '$28 Md', trend: '+4.1%' },
  { label: "Indice de stabilité politique",   value: '-0.42',  trend: '-0.08' },
  { label: 'PIB per capita médian',           value: '$2 100', trend: '+2.4%' },
  // ...
]
```

---

## 3. Composants cartographie réutilisables

### 3.1 `CartographieLayout`

Layout wrapper commun à toutes les pages cartographie. Props :

```typescript
interface CartographieLayoutProps {
  title: string       // Titre de la page
  subtitle: string    // Description
  dataSource: string  // Sources de données
  navItems: NavItem[] // Navigation interne (scroll anchor)
  children: ReactNode
}
```

Fournit :
- Header sticky avec titre, sous-titre et badges de source
- Navigation latérale (ou top) avec liens d'ancre vers les sections
- Layout responsive avec scrolling fluide

### 3.2 `AfricaMap`

Composant de carte choroplèthe interactive de l'Afrique. Props :

```typescript
interface AfricaMapProps {
  indicators: {
    key: string
    label: string
    scale: 'primes' | 'penetration' | 'densite' | 'croissance' | 'gdp' | 'gdpCap' | 'wgi' | 'inflation' | 'currentAcc'
    format: (v: number) => string
  }[]
  rowsByCountryYear: Record<string, Record<number, Record<string, number | null>>>
  years: number[]
  defaultYear: number
  showZafBorder?: boolean   // Bordure spéciale pour Afrique du Sud
}
```

Fonctionnalités :
- **Sélecteur d'indicateur** : dropdown premium intégré dans la carte
- **Sélecteur d'année** : buttons pilules
- **Palette de couleurs** : échelles différentes selon le type d'indicateur
  - `primes` : logarithmique
  - `penetration` : power transform
  - `densite` : linéaire
  - `croissance` / `inflation` : divergente (rouge-blanc-vert)
  - `wgi` : divergente autour de 0
- **Hover country** : tooltip avec valeur, pays, région
- **Légende** de couleurs intégrée
- **Afrique du Sud** : traitement spécial selon le contexte (échelle hors-norme pour Non-Vie/Vie, intégrée normalement pour Macro/Gouvernance)

### 3.3 `ConfigurableScatterBubble`

Scatter plot interactif avec axes configurables. Props :

```typescript
interface ConfigurableScatterBubbleProps {
  title: string
  metrics: MetricDef[]      // Liste des métriques disponibles pour X et Y
  defaultX: string
  defaultY: string
  sizeLabel: string         // Label de la bulle (ex: "Primes émises")
  sizeFormat: Function
  pointsByYear: Record<number, ConfigurableScatterPoint[]>
  years: number[]
  defaultYear: number
  onAxesChange?: (x: string, y: string) => void
}

interface MetricDef {
  key: string
  label: string
  format: Function
  ref?: number    // Valeur de référence (ligne pointillée)
}

interface ConfigurableScatterPoint {
  pays: string
  region: string
  primes: number  // Taille de bulle
  [key: string]: any  // Valeurs pour axes X et Y
}
```

Fonctionnalités :
- Dropdowns de sélection des axes X et Y
- Coloration par région (palette `REGION_COLORS`)
- Sélecteur d'année (buttons pilules)
- Tooltip riche : pays, région, valeur X, valeur Y, taille
- Lignes de référence pointillées (si `ref` défini sur la métrique)
- Quadrants avec labels optionnels

### 3.4 `ScatterBubble`

Version simplifiée du scatter avec axes fixes. Utilisée dans `CartographieGouvernance`. Props :

```typescript
interface ScatterBubbleProps {
  title: string
  xLabel: string  yLabel: string  zLabel: string
  xFormat: Function  yFormat: Function  zFormat: Function
  pointsByYear: Record<number | string, ScatterPoint[]>
  years: number[]
  defaultYear: number
  xRef?: number  yRef?: number     // Lignes de référence
  showAvgButton?: boolean          // Bouton "Moyenne 2015-2024"
  quadrantLabels?: { tl, tr, bl, br: string }  // Labels des 4 quadrants
}
```

### 3.5 `CartographieKPIGrid`

Grille de 4 KPI cards. Props :

```typescript
kpis: {
  label: string
  value: string
  sublabel: string
  accent: 'green' | 'navy' | 'amber' | 'olive'
}[]
```

### 3.6 `InsightPanel`

Panneau d'insights analytiques. Props :

```typescript
interface InsightPanelProps {
  icon: string      // Emoji ou SVG
  title: string
  subtitle?: string
  cards: InsightCard[]
}

interface InsightCard {
  label: string     // Titre de l'insight
  value?: string    // Valeur principale (optionnel)
  text: string      // Description analytique
  accent?: string   // Couleur d'accent
}
```

Tous les insights sont **100% dynamiques** : calculés à partir des données réelles via des hooks dédiés.

### 3.7 `CountryTable`

Tableau de classement des pays triable. Props :

```typescript
interface CountryTableProps<T> {
  rows: T[]
  columns: TableColumn<T>[]
  initialSort: string
  showRank?: boolean    // Afficher colonne rang
}

interface TableColumn<T> {
  key: keyof T
  label: string
  numeric?: boolean
  format?: (v: any) => string
  badge?: (v: any) => { color: string; bg: string } | null  // Badge coloré
}
```

### 3.8 `RegionLegend`

Légende de couleurs par région africaine. Affichée en haut de chaque page cartographie.

```typescript
const REGION_COLORS = {
  'Afrique de l\'Ouest':  '#4E7D4B',  // Vert foncé
  'Afrique de l\'Est':    '#2980B9',  // Bleu
  'Afrique Centrale':     '#8E44AD',  // Violet
  'Afrique du Nord':      '#E67E22',  // Orange
  'Afrique Australe':     '#C0392B',  // Rouge
  'Afrique du Sud':       '#2C3E50',  // Gris-bleu (hors-norme)
  'Autre':                '#95a5a6',
}
```

### 3.9 `HeatmapChart`

Heatmap pays × années. Props :

```typescript
interface HeatmapChartProps {
  matrix: Record<string, Record<number, number | null>> // pays → année → valeur
  years: number[]
  countries: string[]
  regions: Record<string, string>  // pays → région
  scale: 'inflation' | 'wgi' | 'penetration'
  format: (v: number) => string
  // Inclut une légende verticale de couleur positionnée à droite
}
```

Fonctionnalités :
- Cellules colorées selon l'échelle sélectionnée
- Légende verticale (gradient bar) à droite
- Tooltip : pays, année, valeur
- Lignes groupées par région
- Cellules vides (`null`) en gris neutre

### 3.10 `RegionalDonutChart`

Donut chart de répartition régionale (utilise Plotly.js). Props :

```typescript
interface RegionalDonutChartProps {
  data: any[]
  years: number[]
  year: number
  showAvg: boolean
  onYearChange: (y: number) => void
  onToggleAvg: () => void
}
```

### 3.11 `AnimatedControls`

Sélecteur d'année animé. Props :

```typescript
interface AnimatedControlsProps {
  years: number[]
  value: number
  onChange: (y: number) => void
}
```

### 3.12 `CartographieLayout` — Navigation interne

Chaque page cartographie définit ses propres `NAV_ITEMS` :

```typescript
const NAV_ITEMS = [
  { id: 'kpis',    label: 'KPIs' },
  { id: 'carte',   label: 'Carte' },
  // ... sections de la page
]
```

Les sections utilisent `id="X" className="scroll-mt-20"` pour le scroll smooth.

---

## 4. Hook central : `useCartographieData`

```typescript
const { data, years, countries, loading, error } = useCartographieData(endpoint)
// endpoint: 'non-vie' | 'vie' | 'macroeconomie' | 'gouvernance'

// Retourne :
// data[]    : tableau de lignes (MacroRow | VieRow | GouvRow | NonVieRow)
// years[]   : liste des années disponibles (dédupliquées, triées)
// countries[]: liste des pays disponibles (dédupliqués, triés)
```

---

## 5. Types de données (cartographie)

### 5.1 `NonVieRow`

```typescript
interface NonVieRow {
  pays: string
  region: string | null
  annee: number
  primes_emises_mn_usd: number | null
  taux_penetration_pct: number | null
  densite_assurance_usd: number | null
  croissance_primes_pct: number | null
  sp_ratio_pct: number | null           // Sinistres/Primes
}
```

### 5.2 `VieRow`

```typescript
interface VieRow {
  pays: string
  region: string | null
  annee: number
  primes_emises_mn_usd: number | null
  taux_penetration_pct: number | null
  densite_assurance_usd: number | null
  croissance_primes_pct: number | null
}
```

### 5.3 `MacroRow`

```typescript
interface MacroRow {
  pays: string
  region: string | null
  annee: number
  gdp_mn: number | null                    // PIB en millions USD
  gdp_per_capita: number | null            // PIB/habitant USD
  gdp_growth_pct: number | null            // Croissance PIB %
  inflation_rate_pct: number | null        // Taux d'inflation %
  current_account_mn: number | null        // Solde courant Mn USD
  integration_regionale_score: number | null // Score Chinn-Ito / autre
}
```

### 5.4 `GouvRow`

```typescript
interface GouvRow {
  pays: string
  region: string | null
  annee: number
  political_stability: number | null      // WGI [-2.5, +2.5]
  regulatory_quality: number | null       // WGI [-2.5, +2.5]
  fdi_inflows_pct_gdp: number | null      // IDE en % du PIB
  kaopen: number | null                    // Index Chinn-Ito [-2.5, +2.5]
}
```

---

## 6. Page : Cartographie Non-Vie (`/modelisation/cartographie/non-vie`)

### 6.1 Description

`CartographieNonVie.tsx` — Analyse complète du marché de l'assurance Non-Vie africain. Couverture : 34 pays, 2015–2024.

**Note** : L'Afrique du Sud est traitée comme une région distincte `'Afrique du Sud'` pour éviter les distorsions d'échelle (représente ~50% du marché continental).

### 6.2 KPIs (4 cartes)

| KPI | Calcul | Accent |
|---|---|---|
| Primes Non-Vie totales | Σ primes année max, 34 pays | Navy |
| Croissance médiane | Médiane des `croissance_primes_pct` | Green |
| Pénétration moyenne | Moyenne des `taux_penetration_pct` | Olive |
| Densité moyenne | Moyenne des `densite_assurance_usd` | Amber |

### 6.3 Top 10 pays par primes

- BarChart horizontal — couleur par région
- Sélecteur année/moyenne : `YearOrAvgNav` (boutons: chaque année + "Moy. 2015-2024")
- **Mode moyenne** : agrégation pondérée sur toute la série
- Insights dynamiques : `useNonVieTop10Insights(data, top10Year)`

### 6.4 Carte choroplèthe

Indicateurs disponibles :
- Primes Non-Vie (Mn USD) — scale logarithmique
- Pénétration (%) — scale power
- Densité (USD/hab) — scale linéaire
- Croissance (%) — scale divergente
- S/P Ratio (%) — scale divergente

**Carte interactive** : dropdown indicateur premium + sélecteur année intégrés dans le composant `AfricaMap`.

Insights dynamiques : `useNonVieChoroplethInsights(data)`

### 6.5 Scatter multi-axes (ConfigurableScatterBubble)

Axes disponibles :
```typescript
const scatterMetrics: MetricDef[] = [
  { key: 'penetration', label: 'Pénétration (%)', format: fmtPct2 },
  { key: 'densite',     label: 'Densité (USD/hab)', format: fmtUsd },
  { key: 'sp_ratio',   label: 'S/P Ratio (%)', format: fmtPct, ref: 100 },
  { key: 'croissance', label: 'Croissance Primes (%)', format: fmtPct, ref: 0 },
]
```

- Taille bulle = Primes émises (Mn USD)
- Option **"Exclure l'Afrique du Sud"** : toggle checkbox, retire ZAF du scatter et recalcule les axes automatiquement
- Insights dynamiques recalculés à chaque changement d'axes : `computeNonVieScatterInsights(xKey, yKey, excludeSA, data)`

### 6.6 Évolution régionale (Stacked Area)

- ComposedChart stacked area — chaque région = une couleur de la palette `REGION_COLORS`
- X=Année, Y=Primes (Mn USD) cumulées par région
- Légende interactive
- Insights dynamiques : `useNonVieEvolutionInsights(data)` → CAGR réels 2015-2024 + accélération post-2020

**Barre régionale** (accompagne le stacked area) :
- BarChart vertical par région
- Contrôles : `AnimatedControls` (par année) + bouton "Moy. 2015-2024"
- Insights dynamiques : `useNonVieBarRegionalInsights(data, barYear, barShowAvg, years)`

### 6.7 Structure du marché (RegionalDonutChart)

- Donut Plotly — répartition % des primes par région
- **Afrique du Sud** : annotation côté droit (sa dominance ~50%)
- Sélecteur année + bouton moyenne
- Légende positionnée à l'extrême droite
- Insights dynamiques : `useNonVieStructureInsights(data, year)`

### 6.8 Distribution S/P (Box plot par région)

- ComposedChart simulant une boîte à moustaches
  - `Bar q3` : tige supérieure
  - `Bar q1` : tige intérieure (masquée en blanc)
  - `Line median` : point médian (navy)
  - `Line max` : point maximum (rouge)
  - `Line min` : point minimum (gris)
- Ligne de référence : `y=100` → seuil sinistralité
- Tooltip personnalisé : région, min, Q1, médiane, Q3, max
- Insights dynamiques : `useNonVieSPDistributionInsights(data)`

### 6.9 Détail pays

- Sélecteur pays (select)
- ComposedChart dual-axis :
  - Axe gauche (Mn USD) : Bar `primes_emises_mn_usd`
  - Axe droit (%) : Line `taux_penetration_pct` (amber) + Line `sp_ratio_pct` (rouge) + Line `croissance_primes_pct` (violet, pointillés)
- Insights dynamiques : `useNonVieCountryInsights(data, pays)` → trend, CAGR, S/P diagnostic

### 6.10 Tableau Classement (CountryTable)

- Colonnes : `Pays | Région | Primes (Mn USD) | Croissance | S/P Ratio | Pénétration | Densité`
- Badges colorés :
  - **S/P Ratio** : vert ≤ 70%, orange 70-100%, rouge > 100%
  - **Pénétration** : navy ≥ 2%, orange 0.5-2%, vert < 0.5%
- Tri initial : `primes` décroissant
- `showRank = true`
- Sélecteur année / moyenne
- Insights dynamiques : `useNonVieRankingInsights(data)`

### 6.11 Navigation interne (NAV_ITEMS)

```typescript
const NAV_ITEMS = [
  { id: 'kpis',         label: 'KPIs' },
  { id: 'carte',        label: 'Carte' },
  { id: 'scatter',      label: 'Scatter multi-axes' },
  { id: 'evolution',    label: 'Évolution régionale' },
  { id: 'structure',    label: 'Structure' },
  { id: 'distribution', label: 'Distribution S/P' },
  { id: 'detail',       label: 'Détail Pays' },
  { id: 'tableau',      label: 'Classement' },
]
```

---

## 7. Page : Cartographie Vie (`/modelisation/cartographie/vie`)

### 7.1 Description

`CartographieVie.tsx` — Analyse du marché de l'assurance Vie africain. Couverture : 34 pays, 2015–2024.

**Note** : L'Afrique du Sud représente ~85% du marché vie continental. Elle apparaît dans la région `'Afrique du Sud'` (traitée séparément de `'Afrique Australe'` pour les graphiques).

### 7.2 KPIs

| KPI | Calcul | Accent |
|---|---|---|
| Primes Vie totales | Σ primes année max | Navy |
| Croissance médiane | Médiane `croissance_primes_pct` | Green |
| Pénétration moyenne | Moyenne `taux_penetration_pct` | Olive |
| Densité moyenne | Moyenne `densite_assurance_usd` | Amber |

### 7.3 Top 10 par primes vie émises

- BarChart horizontal couleur par région
- `YearOrAvgNav` (chaque année + "Moy. 2015-2024")
- Insights dynamiques : `useVieTop10Insights(data, top10Year)`

### 7.4 Carte choroplèthe

Indicateurs :
- Primes Vie (Mn USD)
- Pénétration (%)
- Densité (USD/hab)
- Croissance (%)

Insights dynamiques : `useVieChoroplethInsights(data)`

### 7.5 Scatter multi-axes

Axes disponibles :
```typescript
const scatterMetrics: MetricDef[] = [
  { key: 'penetration', label: 'Pénétration (%)' },
  { key: 'densite',     label: 'Densité (USD/hab)' },
  { key: 'croissance',  label: 'Croissance Primes (%)', ref: 0 },
]
```

- Option **"Exclure l'Afrique du Sud"** : toggle checkbox (similaire à Non-Vie)
- Insights dynamiques recalculés : `computeVieScatterInsights(xKey, yKey, excludeSA, data)`

### 7.6 Évolution régionale (Stacked Area)

- ComposedChart dual-axis :
  - Zones empilées (axe gauche) : toutes les régions hors ZAF
  - Line séparée (axe droit) : `'Afrique du Sud'` avec sa propre échelle
- Insights dynamiques : `useVieEvolutionInsights(data)` → CAGR + accélération post-2020

**Barre régionale** :
- BarChart vertical par région
- Toggle "Moy. 2015-2024" + `AnimatedControls`
- Insights dynamiques : `useVieBarRegionalInsights(data, barYear, barShowAvg, years)`

### 7.7 Structure régionale (RegionalDonutChart)

- Donut Plotly — répartition par région (hors ZAF optionnel)
- Insights dynamiques : `useVieStructureInsights(data, year)`

### 7.8 Distribution Pénétration (Box plot)

- ComposedChart boîte à moustaches par région
- Q1, médiane, Q3, min, max de `taux_penetration_pct`
- Lignes de référence : `y=1%` (seuil marché développé, vert) + `y=0.5%` (orange)
- Sélecteur année / moyenne
- Insights dynamiques : `useViePenetrationDistributionInsights(data)`

### 7.9 Détail pays

- ComposedChart dual-axis :
  - Axe gauche : Line `primes_emises_mn_usd` (navy)
  - Axe droit : Line `taux_penetration_pct` (amber) + Line `densite_assurance_usd` (vert) + Line `croissance_primes_pct` (violet, pointillés)
- Insights dynamiques : `useVieCountryInsights(data, pays)` → structure : `{ cards, region, coverage }`

### 7.10 Tableau Classement

- Colonnes : `Pays | Région | Primes (Mn USD) | Croissance | Pénétration | Densité`
- Badge `Pénétration` : navy ≥ 2% / orange 0.5-2% / vert < 0.5%
- Tri initial : `primes`
- Insights dynamiques : `useVieRankingInsights(data)`

### 7.11 Navigation interne

```typescript
const NAV_ITEMS = [
  { id: 'kpis',         label: 'KPIs' },
  { id: 'carte',        label: 'Carte' },
  { id: 'scatter',      label: 'Scatter multi-axes' },
  { id: 'evolution',    label: 'Évolution régionale' },
  { id: 'structure',    label: 'Structure' },
  { id: 'distribution', label: 'Distribution Pénétration' },
  { id: 'detail',       label: 'Détail Pays' },
  { id: 'tableau',      label: 'Classement' },
]
```

---

## 8. Page : Cartographie Macroéconomie (`/modelisation/cartographie/macro`)

### 8.1 Description

`CartographieMacro.tsx` — Analyse macroéconomique des 34 pays africains. Sources : World Bank, IMF, UNCTAD.

**Note** : L'Afrique du Sud est traitée comme un pays normal dans Macro → région `'Afrique Australe'`.

```typescript
// Correction de région ZAF au chargement
const macroData = useMemo(
  () => data.map(r => r.pays === 'Afrique du Sud' && (r.region === 'Afrique du Sud' || r.region == null)
    ? { ...r, region: 'Afrique Australe' }
    : r),
  [data]
)
```

### 8.2 Indicateurs couverts (7)

1. **PIB** (`gdp_mn`) — en Millions USD
2. **PIB/habitant** (`gdp_per_capita`) — USD
3. **Croissance PIB** (`gdp_growth_pct`) — %
4. **Inflation** (`inflation_rate_pct`) — %
5. **Compte courant** (`current_account_mn`) — Mn USD
6. **Taux de change** (référencé)
7. **Intégration régionale** (`integration_regionale_score`) — score normalisé

### 8.3 KPIs

| KPI | Calcul | Accent |
|---|---|---|
| Croissance PIB médiane | Médiane `gdp_growth_pct` | Green |
| PIB/hab médian | Médiane `gdp_per_capita` | Navy |
| Inflation médiane | Médiane `inflation_rate_pct` | Amber |
| Meilleure intégration | Top pays par `integration_regionale_score` | Olive |

### 8.4 Top 10 PIB africains

- BarChart horizontal vertical couleur par région
- `YearOrAvgNav` (chaque année + "Moy.")
- Insights dynamiques : `useMacroTop10Insights(macroData, top10Year)`

### 8.5 Carte choroplèthe (6 indicateurs)

| Clé | Label | Échelle |
|---|---|---|
| `gdp` | PIB (Mn USD) | `gdp` |
| `gdpCap` | PIB/hab (USD) | `gdpCap` |
| `growth` | Croissance PIB (%) | `croissance` |
| `infl` | Inflation (%) | `inflation` |
| `ca` | Compte courant (Mn USD) | `currentAcc` |
| `integ` | Intégration régionale | `wgi` |

`showZafBorder={false}` (pas de bordure spéciale)

Insights dynamiques : `useMacroChoroplethInsights(macroData)`

### 8.6 Scatter multi-axes macro

Axes disponibles :
```typescript
const scatterMetrics: MetricDef[] = [
  { key: 'inflation',   label: 'Inflation (%)',       ref: 5  },
  { key: 'growth',      label: 'Croissance PIB (%)',   ref: 0  },
  { key: 'gdpCap',      label: 'PIB/hab (USD)'              },
  { key: 'currentAcc',  label: 'Compte courant (Mn USD)', ref: 0 },
  { key: 'gdp',         label: 'PIB (Mn USD)'               },
]
```

Taille bulle = PIB (Mn USD).

Insights dynamiques : `computeMacroScatterInsights(xKey, yKey, macroData)` — **9 combinaisons d'axes** avec insights distincts.

### 8.7 Évolution PIB par région (2015–maxYear)

- ComposedChart stacked area — régions africaines
- Insights dynamiques : `useMacroEvolutionInsights(macroData)` → CAGR réels, "Afrique du Sud incluse dans Afrique Australe"

**Barre PIB par région** :
- BarChart vertical, couleur par région
- `AnimatedControls` (par année) + bouton "Moy. 2015–2024"
- Insights dynamiques : `useMacroBarRegionalInsights(macroData, barYear, barShowAvg, years)`

### 8.8 Distribution Inflation (Heatmap + Box plot)

**Heatmap historique** :
- `HeatmapChart` avec `scale="inflation"` et `format=fmtPct`
- Matrice : pays × années → `inflation_rate_pct`
- Légende verticale intégrée à droite

**Box plot par région** :
- ComposedChart boîte à moustaches
- Q1, médiane, Q3, min, max de `inflation_rate_pct` par région
- Lignes de référence : `y=5%` (stable, vert) + `y=10%` (risque, rouge)
- Tooltip personnalisé : région, médiane, Q1-Q3, min-max

Insights dynamiques : `useMacroInflationDistributionInsights(macroData)`

### 8.9 Intégration régionale + Radar

**Bar chart classement** :
- Meilleur score d'intégration par pays (valeur max sur toute la série)
- BarChart horizontal (`layout="vertical"`)
- Ligne de référence : `x=0.4` (seuil "bien intégré", vert)
- Label "Seuil 0.4" positionné à la hauteur du dernier pays qui l'atteint (logique de positionnement précise via `viewBox`)

**Radar profil macro régional** :
- RadarChart — 4 dimensions par région :
  - `growthScore = min(100, max(0, 20 + avgGrow * 8))`
  - `inflScore = min(100, max(0, 100 - avgInfl * 5))`
  - `gdpCapScore = min(100, avgGdpCap / 120)`
  - `integScore = avgInteg * 100 / 0.65`

Insights dynamiques : `useMacroIntegrationInsights(macroData)`

### 8.10 Détail pays

- Sélecteur pays (select)
- ComposedChart dual-axis :
  - Axe gauche : Bar `gdp_mn` (navy, opacité 0.6)
  - Axe droit : Line `gdp_growth_pct` (vert) + Line `inflation_rate_pct` (amber) + Line `current_account_mn` (violet, pointillés)
- Ligne de référence : `y=0` axe droit
- Insights dynamiques : `useMacroCountryInsights(macroData, country)` → `{ cards, region, coverage }`

### 8.11 Tableau Classement

- Sélecteur année / moyenne (`YearOrAvgNav`)
- Colonnes : `Pays | Région | PIB (Mn USD) | PIB/hab | Croissance | Inflation | Compte Courant | Intégration`
- Badges colorés :
  - **Croissance** : vert ≥ 5%, orange 0-5%, rouge < 0%
  - **Inflation** : vert ≤ 5%, orange 5-10%, rouge > 10%
- Tri initial : `gdp`
- Insights dynamiques : `useMacroRankingInsights(macroData)`

### 8.12 Navigation interne

```typescript
const NAV_ITEMS = [
  { id: 'kpis',        label: 'KPIs' },
  { id: 'carte',       label: 'Carte' },
  { id: 'scatter',     label: 'Scatter multi-axes' },
  { id: 'evolution',   label: 'Évolution PIB' },
  { id: 'inflation',   label: 'Distribution Inflation' },
  { id: 'integration', label: 'Intégration Régionale' },
  { id: 'detail',      label: 'Détail Pays' },
  { id: 'tableau',     label: 'Classement' },
]
```

### 8.13 Helpers locaux

```typescript
median(arr: number[]): number           // Médiane statistique
avgArr(arr: number[]): number           // Moyenne
buildMatrix(rows, key)                  // → Record<annee, Record<pays, valeur>>
buildHeatMatrix(rows, key)              // → Record<pays, Record<annee, valeur>>
inflBoxByRegion(data: MacroRow[])       // → Box plot stats par région
YearOrAvgNav(...)                       // Composant de sélection année/moy.
```

---

## 9. Page : Cartographie Gouvernance (`/modelisation/cartographie/gouvernance`)

### 9.1 Description

`CartographieGouvernance.tsx` — Analyse de la gouvernance et du risque politique pour 34 pays africains. Sources : World Bank WGI, Chinn-Ito Index, UNCTAD FDI.

**Note** : Afrique du Sud → région `'Afrique Australe'` (même correction que Macro).

### 9.2 Indicateurs couverts (4)

1. **Stabilité politique** (`political_stability`) — WGI [-2.5, +2.5]
2. **Qualité réglementaire** (`regulatory_quality`) — WGI [-2.5, +2.5]
3. **Flux IDE** (`fdi_inflows_pct_gdp`) — % du PIB
4. **KAOPEN** (`kaopen`) — Index Chinn-Ito [-2.5, +2.5]

### 9.3 KPIs

| KPI | Calcul | Accent |
|---|---|---|
| Stabilité politique moyenne | Moyenne `political_stability` + médiane | Navy |
| Meilleur environnement politique | Top pays `political_stability` | Green |
| IDE moyen (% PIB) | Moyenne `fdi_inflows_pct_gdp` | Amber |
| Marchés financièrement ouverts | Count pays avec KAOPEN > 1 | Olive |

### 9.4 Carte choroplèthe (4 indicateurs)

| Clé | Label | Échelle |
|---|---|---|
| `stab` | Stabilité politique (WGI) | `wgi` |
| `reg` | Qualité réglementaire (WGI) | `wgi` |
| `fdi` | IDE (% PIB) | `penetration` |
| `ka` | Ouverture financière KAOPEN | `wgi` |

Insights dynamiques : `useGouvChoroplethInsights(gouvData)`

### 9.5 Scatter 1 : Stabilité vs Réglementation

```
X = political_stability (WGI)
Y = regulatory_quality (WGI)
Z = fdi_inflows_pct_gdp (taille bulle)
xRef = 0   yRef = 0   (quadrants)
showAvgButton = true  (afficher moyenne 2015-2024)
```

**4 quadrants** :
- TL : "Instable mais bien régulé"
- TR : "✓ Leaders : stable + régulé"
- BL : "⚠ Double risque institutionnel"
- BR : "Stable mais sous-régulé"

Insights dynamiques : `useGouvScatterStabRegInsights(gouvData)`

### 9.6 Scatter 2 : KAOPEN vs IDE

```
X = kaopen (Chinn-Ito)
Y = fdi_inflows_pct_gdp (IDE % PIB)
Z = (political_stability + regulatory_quality + 5) / 2  (score composite, taille bulle)
xRef = 0   yRef = 3   (quadrants)
showAvgButton = true
```

**4 quadrants** :
- TL : "Fermé mais attractif (ressources)"
- TR : "✓ Ouvert + attractif"
- BL : "⚠ Fermé & peu attractif"
- BR : "Ouvert mais peu de capitaux"

Insights dynamiques : `useGouvScatterKaopenFdiInsights(gouvData)`

**Note** : Le bouton "Inclure/Exclure Afrique du Sud" a été **retiré** de ce scatter.

### 9.7 Évolution Stabilité politique par région

- ComposedChart : Lines par région (`ALL_REGIONS`)
- X=Année, Y=WGI stabilité (domaine [-2.5, 1.5])
- `connectNulls = true`
- Ligne de référence : `y=0` (neutre)
- Insights dynamiques : `useGouvEvolutionInsights(gouvData)`

**Heatmap Stabilité politique** :
- `HeatmapChart` avec `scale="wgi"` et `format=fmtWgi`
- Insights dynamiques : `useGouvHeatmapStabInsights(gouvData)` → anomalies temporelles, chocs géopolitiques, résilience

### 9.8 Profil pays (Section 5)

- Sélecteur pays (select)

**Radar profil WGI** (4 axes normalisés 0-100) :
```
Stabilité pol.  = ((val + 2.5) / 5) * 100
Qualité régl.   = ((val + 2.5) / 5) * 100
KAOPEN          = ((val + 2.5) / 5) * 100
IDE (% PIB)     = min(100, val * 6.67)
```

**KPI scorecard** (colonne droite) :
- `KpiRow` : Stabilité pol. | Qualité régl. | KAOPEN | IDE % PIB
- `KaopenBadge` : Ouvert (vert, KAOPEN > 1) / Partiel (orange, -0.5 à 1) / Fermé (rouge, < -0.5)

**Timeline individuelle** (ComposedChart dual-axis) :
- Axe gauche (WGI) : Line Stabilité (navy) + Line Qualité régl. (vert) + Line KAOPEN (violet, pointillés)
- Axe droit : Line IDE % PIB (amber, pointillés)
- Ligne de référence `y=0` (axe WGI)

Insights dynamiques : `useGouvCountryInsights(gouvData, pays)`

### 9.9 Distribution KAOPEN par région

**Box plot KAOPEN** :
- ComposedChart boîte à moustaches
- Q1, médiane, Q3, min, max de `kaopen` par région
- Lignes de référence : `y=0` (KAOPEN neutre, navy) + `y=1` (ouverture, vert) + `y=-1` (fermeture, rouge)
- Tooltip : région, médiane, Q1-Q3, min-max

Insights dynamiques : `useGouvKaopenDistribInsights(gouvData)`

**Heatmap Qualité Réglementaire** :
- `HeatmapChart` matrice pays × années pour `regulatory_quality`
- Insights dynamiques : `useGouvHeatmapRegInsights(gouvData)` → "trajectoire réformiste, prévisibilité (σ), convergence intra-régionale"

### 9.10 Tableau Classement

- Sélecteur année / moyenne (`YearOrAvgNav`)
- Colonnes : `Pays | Région | Stabilité pol. | Qualité régl. | KAOPEN | IDE (% PIB)`
- Badges colorés :
  - **Stabilité** : vert ≥ 0.5, orange -0.5 à 0.5, rouge < -0.5
  - **Qualité régl.** : vert ≥ 0, orange -0.5 à 0, rouge < -0.5
  - **KAOPEN** : vert > 1, orange -0.5 à 1, rouge ≤ -0.5
  - **IDE** : vert ≥ 5%, orange 1-5%, rouge < 1%
- Tri initial : `stab`
- Insights dynamiques : `useGouvRankingInsights(gouvData)` → "Top pays stabilité · réglementation · KAOPEN · IDE"

### 9.11 Navigation interne

```typescript
const NAV_ITEMS = [
  { id: 'kpis',       label: 'KPIs' },
  { id: 'carte',      label: 'Carte' },
  { id: 'scatter1',   label: 'Stab / Régl.' },
  { id: 'scatter2',   label: 'KAOPEN / IDE' },
  { id: 'evolution',  label: 'Évolution' },
  { id: 'pays',       label: 'Détail pays' },
  { id: 'kaopen',     label: 'KAOPEN' },
  { id: 'classement', label: 'Classement' },
]
```

---

## 10. Système d'Insights Dynamiques

### 10.1 Principe d'architecture

Chaque page cartographie a un fichier de hooks dédié :

```
hooks/
  useNonVieInsights.ts     → CartographieNonVie
  useVieInsights.ts        → CartographieVie
  useMacroInsights.ts      → CartographieMacro
  useGouvInsights.ts       → CartographieGouvernance
```

### 10.2 Règle d'unicité des insights

**Contrainte absolue** : chaque insight dans un panel doit être **unique et non-redondant** par rapport aux autres panels de la même page. Chaque panel doit apporter une **valeur analytique distincte**.

L'audit de gouvernance (conversation `8d2e1cb0`) a établi les règles de non-redondance qui s'appliquent à tous les modules.

### 10.3 Structure d'un hook d'insight

```typescript
export function useGouvChoroplethInsights(data: GouvRow[]): InsightCard[] {
  return useMemo(() => {
    if (!data.length) return []
    // Calculs statistiques sur data
    // Retourne 3-4 InsightCard[]
    return [
      {
        label: 'LEADERS INSTITUTIONNELS',
        value: `${topCountries.slice(0, 3).join(' · ')}`,
        text: `Ces pays combinent stabilité politique (WGI > 0.5) et qualité réglementaire positive...`,
        accent: 'green',
      },
      // ...
    ]
  }, [data])
}
```

### 10.4 Nomenclature des hooks

**Non-Vie** :
- `useNonVieChoroplethInsights(data)` — carte
- `computeNonVieScatterInsights(xKey, yKey, excludeSA, data)` — scatter (recalculé à chaque changement d'axes)
- `useNonVieEvolutionInsights(data)` — stacked area
- `useNonVieBarRegionalInsights(data, barYear, barShowAvg, years)` — barre régionale
- `useNonVieStructureInsights(data, year)` — donut
- `useNonVieSPDistributionInsights(data)` — box plot S/P
- `useNonVieCountryInsights(data, pays)` — détail pays
- `useNonVieRankingInsights(data)` — classement

**Vie** (mirrors Non-Vie) :
- `useVieChoroplethInsights`, `computeVieScatterInsights`, `useVieEvolutionInsights`
- `useVieBarRegionalInsights`, `useVieStructureInsights`, `useViePenetrationDistributionInsights`
- `useVieCountryInsights`, `useVieRankingInsights`, `useVieTop10Insights`

**Macro** :
- `useMacroChoroplethInsights`, `computeMacroScatterInsights`, `useMacroEvolutionInsights`
- `useMacroTop10Insights`, `useMacroBarRegionalInsights`, `useMacroInflationDistributionInsights`
- `useMacroIntegrationInsights`, `useMacroCountryInsights`, `useMacroRankingInsights`

**Gouvernance** :
- `useGouvChoroplethInsights`, `useGouvScatterStabRegInsights`, `useGouvScatterKaopenFdiInsights`
- `useGouvEvolutionInsights`, `useGouvCountryInsights`, `useGouvKaopenDistribInsights`
- `useGouvRankingInsights`, `useGouvHeatmapRegInsights`, `useGouvHeatmapStabInsights`

---

## 11. Constantes cartographie

### 11.1 `cartographieConstants.ts`

```typescript
export const REGION_COLORS: Record<string, string> = {
  "Afrique de l'Ouest":  '#4E7D4B',
  "Afrique de l'Est":    '#2980B9',
  "Afrique Centrale":    '#8E44AD',
  "Afrique du Nord":     '#E67E22',
  "Afrique Australe":    '#C0392B',
  "Afrique du Sud":      '#2C3E50',   // Cas spécial Non-Vie et Vie
  "Autre":               '#95a5a6',
}

export const ALL_REGIONS: string[] = [
  "Afrique de l'Ouest",
  "Afrique de l'Est",
  "Afrique Centrale",
  "Afrique du Nord",
  "Afrique Australe",
  "Afrique du Sud",  // Séparée dans Non-Vie et Vie
]
```

---

## 12. Design System (Axe 2)

### 12.1 Palette de couleurs (thème Olive)

L'Axe 2 utilise une palette différente de l'Axe 1 (Olive/SCAR vs Navy/Dashboard) :

```css
/* Axe 2 principal */
--scar-olive:       hsl(83, 52%, 36%)   /* Accent principal Axe 2 */
--scar-olive-light: hsl(83, 50%, 55%)
--navy:             #1B3F6B             /* Bleu AtlanticRe classique */

/* Régions */
--ouest:    '#4E7D4B'
--est:      '#2980B9'
--centrale: '#8E44AD'
--nord:     '#E67E22'
--australe: '#C0392B'
--zaf:      '#2C3E50'
```

### 12.2 Formatters communs

```typescript
// Non-Vie
fmtMn(v)   = v >= 1000 ? `${(v/1000).toFixed(1)} Md$` : `${v.toFixed(0)} Mn$`
fmtPct(v)  = `${v.toFixed(1)}%`
fmtUsd(v)  = `${v.toFixed(1)}$`

// Macro
fmtBn(v)   = v >= 1000 ? `$${(v/1000).toFixed(1)} Mrd` : `$${v.toFixed(0)}M`
fmtPctSgn(v) = `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
fmtUsd(v)  = `$${v.toFixed(0)}/hab`
fmtScore(v) = v.toFixed(3)

// Gouvernance
fmtWgi(v)    = v.toFixed(2)
fmtWgiSgn(v) = `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
```

### 12.3 `YearOrAvgNav` (composant local partagé)

Commun à CartographieMacro et CartographieGouvernance :

```typescript
function YearOrAvgNav({ years, value, onChange }: {
  years: number[]
  value: number | 'avg'
  onChange: (v: number | 'avg') => void
})
// Boutons pilules : chaque année + "Moy. XXXX–XXXX"
// Actif : fond #1B3F6B (navy) texte blanc
// Inactif : fond gray-100 texte gray-600
```

---

## 13. Page : Analyse Globale (`/modelisation/analyse`)

### 13.1 Description

`AnalyseGlobale.tsx` — **Hub de navigation** vers les fiches pays individuelles. Présente une vue consolidée des 34 pays africains sur les 4 dimensions (Non-Vie, Vie, Macro, Gouvernance) et permet d'accéder à la fiche détaillée de n'importe quel pays.

### 13.2 Architecture de la page

```
[Sélecteur de pays] → Navigation vers /modelisation/analyse/:pays
[KPI Cards globaux] → 4 indicateurs continentaux
[Classements par indicateur] → 6 cartes Top-8
[Tableau de synthèse] → 34 pays × 9 colonnes
[Insights globaux] → useAnalyseGlobaleInsights
```

### 13.3 Navigation interne (NAV_ITEMS)

```typescript
const NAV_ITEMS = [
  { id: 'recherche',   label: 'Recherche' },
  { id: 'classements', label: 'Classements' },
  { id: 'tableau',     label: 'Tableau' },
  { id: 'insights',    label: 'Insights' },
]
```

### 13.4 Section 0 : Sélecteur de pays

- `react-select` avec les 34 pays africains (union des pays Non-Vie + Macro)
- Sélection → `navigate('/modelisation/analyse/${encodeURIComponent(pays)}')`
- Placeholder : "Rechercher un pays parmi les 34 marchés africains…"

### 13.5 KPI Cards globaux (4 cartes)

| KPI | Calcul | Accent |
|---|---|---|
| Pays couverts | Fixe : "34 pays · 4 dimensions" | Navy |
| Pénétration NV médiane | Médiane des pénétrations par pays (filtré par année) | Olive |
| PIB médian / habitant | Médiane des PIB/hab par pays (filtré par année) | Amber |
| Stabilité politique moy. | Moyenne WGI des 34 pays | Green si ≥ 0, Navy sinon |

### 13.6 Classements par indicateur (6 cartes)

`RankingCard` (sous-composant interne) — Top 8 pays avec badge région coloré et valeur. Chaque ligne est **cliquable** → navigate vers la fiche pays.

| Carte | Indicateur | Format |
|---|---|---|
| 🏆 Top Primes Non-Vie | `primes_emises_mn_usd` | `fmtMn` |
| 🌱 Top Pénétration Non-Vie | `taux_penetration_pct` | `xx.xx%` |
| 💼 Top Primes Vie | `primes_emises_mn_usd` (vieData) | `fmtMn` |
| 💰 Top PIB par habitant | `gdp_per_capita` | `$X XXX` |
| 🏛 Top Stabilité Politique | `political_stability` | `±X.XX` |
| 🌍 Top Attractivité IDE | `fdi_inflows_pct_gdp` | `X.X% PIB` |

### 13.7 Tableau de synthèse (`CountryTable`)

- `34 lignes × 9 colonnes`
- **Tri initial** : `primesNV` descendant
- **Click sur ligne** → navigate vers la fiche pays
- **Sélecteur année** : `YearOrAvgNav` (boutons pilules, inclut "Moy. 2015-2024")

Colonnes avec badges colorés :

| Colonne | Badges |
|---|---|
| `gdpGrowth` | Vert ≥ 5%, Orange 0-5%, Rouge < 0% |
| `inflation` | Vert ≤ 5%, Orange 5-10%, Rouge > 10% |
| `politStab` | Vert ≥ 0.5, Orange -0.5 à 0.5, Rouge < -0.5 |
| `fdi` | Vert ≥ 5%, Orange 1-5%, Rouge < 1% |

### 13.8 Insights globaux

```typescript
const insights = useAnalyseGlobaleInsights(nvData, vieData, macroData, gouvData)
```

Fournit des insights croisés consolidant les 4 dimensions d'analyse.

### 13.9 Data flow

```typescript
// 4 datasets chargés en parallèle
const { data: nvData, years } = useCartographieData('non-vie')
const { data: vieData }       = useCartographieData('vie')
const { data: macroData }     = useCartographieData('macroeconomie')
const { data: gouvData }      = useCartographieData('gouvernance')

// Helper de consolidation
function computeRanking<T>(data, field, year, descending): { pays, region, value }[]
// Moyenne par pays sur la période sélectionnée
function getCountryAvg<T>(data, pays, field): number | null
```

---

## 14. Page : Analyse Pays (`/modelisation/analyse/:pays`)

### 14.1 Description

`AnalysePays.tsx` — **Fiche pays complète** sur les 4 dimensions. Page la plus exhaustive de l'Axe 2 : agrège les données Non-Vie, Vie, Macro et Gouvernance en une fiche unifiée pour un pays sélectionné via l'URL (`:pays` encodé en URI).

**Architecture** : Système de 9 **tabs horizontaux** — chaque tab est une sous-page indépendante affichant uniquement son contenu. Toutes les données sont chargées une seule fois au niveau du composant parent.

**Source de données** : Axco Navigator · World Bank · IMF · WGI · Chinn-Ito

### 14.2 Accès et navigation

- **Depuis** : `AnalyseGlobale` (clic sur un pays dans les classements ou le tableau)
- **URL** : `/modelisation/analyse/:pays` (pays encodé en URI : `encodeURIComponent(pays)`)
- **Changement de pays** : Dropdown `react-select` dans le tab Identité → `navigate('/modelisation/analyse/${encodeURIComponent(v.value)}')`
- **Retour** : Bouton "← Retour à l'analyse globale" → `/modelisation/analyse`
- **Pays introuvable** : Garde `notFound` → page d'erreur avec bouton retour
- **Reset automatique** : Changement de pays → retour automatique à l'onglet `identite`

### 14.3 Système de tabs (TABS)

```typescript
type TabId =
  | 'identite' | 'kpis' | 'evolution' | 'radar'
  | 'non-vie' | 'vie' | 'macro' | 'gouvernance' | 'positionnement'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'identite',       label: 'Identité',      icon: '🌍' },
  { id: 'kpis',           label: 'KPIs',           icon: '📊' },
  { id: 'evolution',      label: 'Évolution',      icon: '📈' },
  { id: 'radar',          label: 'Radar',          icon: '🎯' },
  { id: 'non-vie',        label: 'Non-Vie',        icon: '🔵' },
  { id: 'vie',            label: 'Vie',            icon: '🟢' },
  { id: 'macro',          label: 'Macroéconomie', icon: '💹' },
  { id: 'gouvernance',    label: 'Gouvernance',    icon: '🏛' },
  { id: 'positionnement', label: 'Positionnement',icon: '🏆' },
]
```

**Composants de navigation** :
- **`TabNav`** : Barre de tabs horizontale scrollable avec strip identité pays (couleur région), onglets avec icônes, état actif en olive.
- **`TabProgress`** : Barre de progression horizontale (9 segments) — segment actif = olive, précédents = olive clair, suivants = gris.
- **Boutons Précédent / Suivant** : En bas de chaque tab, navigation entre onglets avec label du tab cible.
- **Compteur** : `X / 9` centré entre les boutons Préc/Suiv.

### 14.4 Sélecteur de période

`YearOrAvgNav` — état `selectedYear: number | 'avg'` (défaut : `'avg'`). Affiché dans chaque tab qui nécessite un filtre d'année (KPIs, Radar, Macroéconomie, Gouvernance, Positionnement). **L'onglet Évolution** affiche toujours la série complète 2015–2024 (indépendante du sélecteur).

### 14.5 Tab : Identité (`id='identite'`)

- **Nom du pays** en `h1` avec badge région colorié
- **Icône pays** (carré couleur région)
- **Dropdown `react-select`** pour changer de pays
- **Bouton retour** vers l'Analyse Globale
- **`YearOrAvgNav`** (sélecteur de période global)
- **4 cartes Overview** : Dimensions (4) · Période (2015–2024) · Périmètre (34 pays) · Sources (5+)
- **Grille de raccourcis** : boutons cliquables vers chaque onglet thématique

### 14.6 Tab : KPIs (`id='kpis'`)

`CartographieKPIGrid` — 8 cartes en grille :

| KPI | Source | Format | Accent dynamique |
|---|---|---|---|
| Primes Non-Vie | `nvData` | `fmtMn` | Navy |
| Pénétration NV | `nvData` | `fmtPct` | Olive |
| Primes Vie | `vieData` | `fmtMn` | Green |
| Pénétration Vie | `vieData` | `fmtPct` | Amber |
| PIB | `macroData` | `fmtBn` | Navy |
| PIB / habitant | `macroData` | `fmtUsd` | Olive |
| Stabilité politique | `gouvData` | `fmtWgi` | Green/Amber/Red selon WGI |
| IDE (% PIB) | `gouvData` | `fmtPct` | Green/Amber/Red selon valeur |

Le KPI "Stabilité politique" affiche un sublabel dynamique : `'✓ Stable'` (WGI ≥ 0.5) / `'~ Modéré'` (-0.5 à 0.5) / `'⚠ Instable'` (< -0.5).

### 14.7 Tab : Évolution (`id='evolution'`)

**ComposedChart dual-axis** — série complète 2015–2024, ignore le sélecteur d'année :

```
Axe gauche (Mn USD) : Bar primes_nv (olive 0.7) + Bar primes_vie (vert 0.5)
Axe droit (%) :       Line gdp_growth (navy) + Line inflation (amber, pointillés)
```

Donnée construite par `evoData` : union des années présentes dans nvRows ET macRows.

### 14.8 Tab : Radar (`id='radar'`)

`RadarChart` Recharts — **profil multidimensionnel** du pays vs la médiane continentale :

| Dimension | Normalisation |
|---|---|
| Primes NV | `(valeur / max continental) × 100` |
| Pénétration NV | `(valeur / max continental) × 100` |
| Primes Vie | `(valeur / max continental) × 100` |
| PIB/hab | `(valeur / max continental) × 100` |
| Stabilité pol. | `((WGI + 2.5) / 5) × 100` |
| Ouverture fin. | `((KAOPEN + 2.5) / 5) × 100` |

- Série **pays** : `hsl(83,52%,42%)` — vert olive plein, opacity 0.3
- Série **Médiane continentale** : `#1B3F6B` — navy, pointillés, opacity 0.1
- Dépend de `selectedYear` — recalcule toutes les normalisations

### 14.9 Tab : Non-Vie (`id='non-vie'`)

**5a — Évolution NV** (série complète) :
```
Axe gauche : Bar primes_emises_mn_usd (olive 0.7)
Axe droit  : Line taux_penetration_pct (navy) + Line densite_assurance_usd (amber)
             Line croissance_primes_pct (vert, pointillés)
```

**5b — Rang continental NV** :
- `BarChart layout="vertical"` horizontal
- Top 10 pays par primes + le pays courant (ajouté avec préfixe `... Pays` s'il n'est pas dans le top 10)
- **Highlight** : barre du pays courant en `hsl(83,52%,36%)` (olive), autres en `hsla(27,47%,37%,0.30)` (brun clair)
- Sélecteur `YearOrAvgNav` pour le rang

**5c — `NvTable`** (sous-composant) :
Tableau série historique trié par année DESC :
`Année | Primes (Mn$) | Pénétration (%) | Densité ($/hab) | Croissance (%) | S/P (%)`

Badge coloré sur Croissance : Vert ≥ 0%, Rouge < 0%.

**5d — InsightPanel NV** :
```typescript
<InsightPanel icon="🔵" title={`PROFIL NON-VIE — ${pays}`} cards={nvInsights} />
// nvInsights = useCountryInsights(nvData, paysDecoded)  [alias de useNonVieInsights]
```

### 14.10 Tab : Vie (`id='vie'`)

**6a — Évolution Vie** (série complète) :
```
Axe gauche : Bar primes_emises_mn_usd Vie (hsl(140,50%,40%) 0.7)
Axe droit  : Line taux_penetration_pct (olive) + Line densite (amber)
             Line croissance (vert, pointillés)
```

**6b — `NvVieStructure`** (sous-composant) :
BarChart groupé NV vs Vie par année : côte-à-côte, permet de visualiser la structure du marché local.

**6c — `VieTable`** :
Tableau série historique :
`Année | Primes (Mn$) | Pénétration (%) | Densité ($/hab) | Croissance (%)`

**6d — InsightPanel Vie** :
```typescript
<InsightPanel icon="🟢" title={`PROFIL VIE — ${pays}`} cards={vieInsights} />
// vieInsights = useVieCountryInsights(vieData, paysDecoded)
```

### 14.11 Tab : Macroéconomie (`id='macro'`)

**7a — Évolution macro** (série complète) :
```
Axe gauche : Bar gdp_mn (hsl(209,42%,30%) 0.6)
Axe droit  : Line gdp_growth_pct (vert) + Line inflation_rate_pct (amber, pointillés)
```

**7b — `MacroRadar`** (sous-composant) :
RadarChart 4 axes — pays vs moyenne de sa région :

| Axe | Normalisation |
|---|---|
| Croissance PIB | `min(100, max(0, 20 + growth × 8))` |
| Stabilité prix | `min(100, max(0, 100 - infl × 5))` |
| PIB/hab | `min(100, gdpCap / 120)` |
| Intégration | `min(100, integ × 100 / 0.65)` |

- Série pays : olive, opacity 0.3
- Série `Moy. {région}` : navy, pointillés, opacity 0.1

**7c — `MacroTable`** :
Tableau série historique avec badges colorés :
`Année | PIB (Mn$) | PIB/hab | Croissance | Inflation | Solde courant | Intégration`

- Croissance : Vert ≥ 5%, Orange 0-5%, Rouge < 0%
- Inflation : Vert ≤ 5%, Orange 5-10%, Rouge > 10%

**7d — InsightPanel Macro** :
```typescript
<InsightPanel icon="📊" title={`PROFIL MACRO — ${pays}`} cards={macInsights} />
// macInsights = useMacroCountryInsights(macroData, paysDecoded)
```

### 14.12 Tab : Gouvernance (`id='gouvernance'`)

**8a — Évolution WGI** (série complète, dual-axis) :
```
Axe gauche [-2.5, +2.5] : Line political_stability (navy)
                           Line regulatory_quality (vert)
                           Line kaopen (violet, pointillés)
Axe droit (%):             Line fdi_inflows_pct_gdp (amber)
```

Ligne de référence `y=0` axe gauche.

**8b — `GouvRadar`** (sous-composant) :
RadarChart 4 axes — pays vs **médiane continentale** :

| Axe | Normalisation |
|---|---|
| Stabilité pol. | `((WGI + 2.5) / 5) × 100` |
| Qualité régl. | `((WGI + 2.5) / 5) × 100` |
| KAOPEN | `((val + 2.5) / 5) × 100` |
| IDE (% PIB) | `min(100, val × 6.67)` |

- Série pays : olive, opacity 0.3
- Série "Médiane continentale" : navy, pointillés, opacity 0.1

**8c — `GouvScorecard`** (sous-composant) :
Grille `2×2` (xl: `4×1`) de 4 mini-cartes avec badges dynamiques :

| Carte | Badge affiché |
|---|---|
| Stab. politique (moy. 2015-2024) | `StabBadge` (Stable / Modéré / Instable) |
| Qualité réglementaire (moy.) | Favorable / Faible |
| KAOPEN (moy.) | `KaopenBadge` (Ouvert / Partiel / Fermé) |
| IDE % PIB (moy.) | `FdiBadge` (Attractif / Modéré / Faible) |

**8d — `GouvTable`** :
Tableau série historique :
`Année | Stab. pol. (WGI) | Qualité régl. (WGI) | KAOPEN | IDE (% PIB)`

Avec badges `StabBadge` et `KaopenBadge` et `FdiBadge` inline.

**8e — InsightPanel Gouvernance** :
```typescript
<InsightPanel icon="🏛" title={`PROFIL GOUVERNANCE — ${pays}`} cards={gouvInsights} />
// gouvInsights = useGouvCountryInsights(gouvData, paysDecoded)
```

### 14.13 Tab : Positionnement (`id='positionnement'`)

**Grille `1×3` (desktop `3×1`)** — 3 blocs de comparaison :

#### Bloc 1 — Rang continental (sur 34 pays)

Tableau `Indicateur | Valeur | Rang` — 7 indicateurs :

| Indicateur | Source | Badge rang |
|---|---|---|
| Primes NV | nvData | Vert si top 10 · Orange si 11-20 · Rouge si 21+ |
| Pénétration NV | nvData | idem |
| Primes Vie | vieData | idem |
| PIB/hab | macroData | idem |
| Croissance PIB | macroData | idem |
| Stabilité pol. | gouvData | idem |
| IDE (% PIB) | gouvData | idem |

Le rang est calculé dynamiquement selon `selectedYear` (ou moyenne toutes années).

#### Bloc 2 — Vs moyenne de sa région

`VsTable` (sous-composant) — `Indicateur | Valeur pays | Réf. (moy. région) | Écart` :
5 lignes : Primes NV · Pénétration NV · PIB/hab · Stab. pol. · IDE

- Écart favorable (pays ≥ ref) : ↑ vert
- Écart défavorable : ↓ rouge

#### Bloc 3 — Vs médiane continentale

Même `VsTable` mais référence = médiane des 34 pays.

### 14.14 Synthèse finale (InsightPanel)

```typescript
<InsightPanel
  icon="🎯"
  title={`SYNTHÈSE — ${pays.toUpperCase()} · PERSPECTIVES ATLANTIC RE`}
  cards={syntheseInsights}
/>
// syntheseInsights = useAnalysePaysInsights(
//   paysDecoded, nvRows, vieRows, macRows, gouvRows, nvData, macroData, gouvData
// )
```

Cet insight final est le plus stratégique : il croise les 4 dimensions et formule des perspectives directement orientées **Atlantic Re** (opportunités de souscription, risques identifiés).

### 14.15 Sous-composants internes (`AnalysePays.tsx`)

| Composant | Description |
|---|---|
| `NvTable` | Tableau Non-Vie série historique |
| `VieTable` | Tableau Vie série historique |
| `NvVieStructure` | BarChart groupé NV vs Vie par année |
| `MacroTable` | Tableau Macro série historique avec badges |
| `MacroRadar` | RadarChart pays vs région (4 axes macro) |
| `GouvRadar` | RadarChart pays vs médiane continentale (4 axes WGI) |
| `GouvScorecard` | 4 mini-cartes indicateurs gouvernance avec badges |
| `GouvTable` | Tableau Gouvernance série historique avec badges |
| `VsTable` | Tableau de comparaison pays vs référence (région/médiane) |
| `StabBadge` | Badge Stable / Modéré / Instable (WGI) |
| `KaopenBadge` | Badge Ouvert / Partiel / Fermé (KAOPEN) |
| `FdiBadge` | Badge Attractif / Modéré / Faible (IDE) |
| `YearOrAvgNav` | Sélecteur d'année local (réutilisé depuis Macro/Gouv) |
| `SectionTitle` | `<h2>` avec bordure olive stylisée |

### 14.16 Helper clé : `getRowVal`

```typescript
function getRowVal<T>(rows: T[], field: keyof T, year: YearSel): number | null
// Si year === 'avg' : moyenne de toute la série
// Sinon : valeur de l'année exacte
```

Fonction utilitaire omniprésente dans la page, centralise la logique `année vs moyenne`.

---

## 15. Page : SCAR Scoring (`/modelisation/scar`)

### 13.1 Description

Module de **scoring SCAR (Scoring des Capacités et Attractivité de Réassurance)** appliqué aux marchés africains d'un point de vue stratégique (différent du scoring opérationnel de l'Axe 1).

### 13.2 Fonctionnalités (structure générale)

- Tableau de scoring des pays africains selon des critères SCAR
- Combinaison des dimensions non-vie, vie, macro et gouvernance
- Visualisation radar par pays
- Export / rapport

---

## 16. Page : Projections ML (`/modelisation/projections`)

### 16.1 Description

Module de projections par machine learning des indicateurs clés à horizon 2030.

### 16.2 Fonctionnalités (structure générale)

- Projections de primes par pays/région
- Intervalles de confiance
- Scénarios (optimiste / central / pessimiste)
- Visualisation temporelle 2015–2030

---

## 17. Hooks d'insights : `useAnalyseInsights`

```typescript
// Fichier : hooks/useAnalyseInsights.ts

export function useAnalyseGlobaleInsights(
  nvData: NonVieRow[],
  vieData: VieRow[],
  macroData: MacroRow[],
  gouvData: GouvRow[]
): InsightCard[]
// Insights croisés continentaux : leaders multidimensionnels, convergences,
// marchés à surveiller pour Atlantic Re sur l'ensemble des 34 pays

export function useAnalysePaysInsights(
  pays: string,
  nvRows: NonVieRow[],
  vieRows: VieRow[],
  macRows: MacroRow[],
  gouvRows: GouvRow[],
  nvData: NonVieRow[],       // Référence continentale
  macroData: MacroRow[],     // Référence continentale
  gouvData: GouvRow[]        // Référence continentale
): InsightCard[]
// Insights contextualisés pays vs continent :
// positionnement, tendances, risques, opportunités Atlantic Re
```

---

## 18. Points d'attention et contraintes techniques (Axe 2)

> **Unicité des insights** : Règle absolue — chaque `InsightPanel` doit apporter une valeur analytique strictement différente des autres panels de la même page. Auditées régulièrement.

> **Afrique du Sud — traitement différencié** :
> - **Non-Vie / Vie** : ZAF dans sa propre région `'Afrique du Sud'` (évite distorsion ~85% du marché)
> - **Macro / Gouvernance / Analyse Pays** : ZAF intégrée à `'Afrique Australe'` (pays normal)
> - Correction via `useMemo` au chargement des données

> **`useCartographieData`** : Hook central. Retourne `data`, `years`, `countries`. Dans `AnalysePays`, il est appelé **4 fois** (une fois par endpoint), ce qui est intentionnel car les 4 sources sont indépendantes.

> **`computeScatterInsights` vs `useScatterInsights`** : Les fonctions de type `compute*` sont des fonctions pures (pas de hook), appelées dans `useMemo` directement dans le composant, ce qui permet le recalcul à chaque changement d'axes.

> **Données manquantes** : Les colonnes peuvent être `null` pour certains pays/années. Toujours filtrer : `.filter((v): v is number => v != null)` avant les calculs statistiques.

> **`scatter1` (Gouvernance)** : Le toggle "Inclure Afrique du Sud" a été **retiré** définitivement. La fonction `buildScatter` inclut désormais un mode `'avg'` (moyenne toutes années) accessible via `showAvgButton`.

> **Heatmap** : La légende de couleur verticale est positionnée à droite du composant (amélioration de la conversation `e11a05ea`).

> **Intégration régionale (Macro)** : Le label "Seuil 0.4" de la `ReferenceLine` est positionné dynamiquement en calculant la hauteur de bande et l'index du dernier pays qui atteint le seuil (logique dans la prop `label` de Recharts).

> **Code splitting** : Toutes les pages Axe 2 chargées via `React.lazy()` dans `App.tsx`. `AnalyseGlobale` et `AnalysePays` sont également lazy-loadées.

> **Navigation entre fiches pays** : La route `:pays` est encodée en URI. Toujours utiliser `encodeURIComponent(pays)` lors de la navigation et `decodeURIComponent(paysParam)` lors de la réception pour éviter les erreurs sur les pays avec des accents (ex: "Côte d'Ivoire").

> **Rang continental dans `AnalysePays`** : La logique `nvPositionData` construit le Top 10 puis **appende le pays courant** avec le préfixe `... ` si celui-ci n'est pas dans le top 10. Cela garantit que le pays analysé est toujours visible dans le graphique de classement.

> **`getRowVal` vs `getCountryAvg`** : Deux helpers similaires existent :
> - `getRowVal(rows, field, year)` : utilisé dans `AnalysePays` (opère sur les `rows` du pays courant)
> - `getCountryAvg(data, pays, field)` : utilisé dans `AnalyseGlobale` (opère sur le dataset complet)
