# Contexte Axe 2 — Modélisation Afrique 2030 (AtlanticRe)

> **Document de référence exhaustif — Axe 2**  
> Version : Avril 2026 | Mis à jour depuis le code source (commit f2d7a7c)  
> Ce fichier décrit **toutes les fonctionnalités existantes** de l'Axe 2 de l'application AtlanticRe.

---

## 1. Vue d'ensemble de l'Axe 2

### 1.1 Positionnement stratégique

L'Axe 2 "Modélisation Afrique 2030" est la **dimension prospective et stratégique** d'AtlanticRe. Il analyse les marchés africains d'assurance sur un plan externe (données de marché publiques, indicateurs macroéconomiques, gouvernance) pour orienter la stratégie de développement à horizon 2030.

**Périmètre** : 34 pays africains, données 2015–2024.

**Accès** : Route `/modelisation` → `ModelisationHome.tsx` (landing page de l'axe).

### 1.2 Modules de l'Axe 2 — Routes complètes

```
/modelisation                            → ModelisationHome.tsx (hub central)
/modelisation/scar                       → SCAR Scoring (ScarLayout)
/modelisation/cartographie/non-vie       → CartographieNonVie.tsx
/modelisation/cartographie/vie           → CartographieVie.tsx
/modelisation/cartographie/macroeconomie → CartographieMacro.tsx
/modelisation/cartographie/gouvernance   → CartographieGouvernance.tsx
/modelisation/analyse                    → AnalyseGlobale.tsx
/modelisation/analyse/:pays              → AnalysePays.tsx
/modelisation/comparaison                → ComparaisonPays.tsx   ← NOUVEAU
```

Toutes ces routes sont sous le layout `<ScarLayout />` (navbar olive, fond clair adapté Axe 2).

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
| `useSearchParams` (react-router) | Récupération des paramètres query (`:a`, `:b` dans ComparaisonPays) |
| `react-select` | Sélecteur de pays avec navigation automatique |

---

## 2. Page : Hub Modélisation (`/modelisation`)

### 2.1 Description

`ModelisationHome.tsx` — Page d'accueil de l'Axe 2. Présente les modules disponibles et des indicateurs clés de synthèse SCAR. Inclut désormais un accès direct au module **Analyse par Pays** et **Comparaison de Pays**.

### 2.2 Structure de la page

- **Header** : Logo + description de l'axe stratégique
- **Grille des modules** : cartes navigables (SCAR, Non-Vie, Vie, Macro, Gouvernance, ML, Analyse, Comparaison)
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

## 3. Layout et Navigation Axe 2

### 3.1 `ScarLayout`

Wrapper layout pour toutes les pages Axe 2. Fournit :
- Navbar olive dédiée Axe 2 (distincte de la navbar Navy de l'Axe 1)
- Zone scrollable principale avec `id="scar-main-scroll"` — utilisée par tous les composants pour le scroll-to-top lors des changements d'onglets
- `<Outlet />` pour le rendu des pages enfants

### 3.2 `CartographieLayout`

Layout wrapper commun à toutes les pages cartographie. Props :

```typescript
interface CartographieLayoutProps {
  title: string       // Titre de la page (vide = header masqué)
  subtitle: string    // Description
  dataSource: string  // Sources de données
  navItems: NavItem[] // Navigation interne (vide = nav masquée)
  children: ReactNode
}
```

**Évolution** : Dans la version actuelle, les pages cartographie (Non-Vie, Vie, Macro, Gouvernance) passent `navItems=[]` car la navigation interne est remplacée par le système de **tabs horizontaux**. `CartographieLayout` masque automatiquement le header si `title` est vide et la nav si `navItems` est vide.

---

## 4. Système de Tabs pour les pages Cartographie

### 4.1 Architecture commune (refactorisée)

Toutes les pages cartographie (Non-Vie, Vie, Macro, Gouvernance) utilisent désormais un **système de navigation par onglets horizontaux** à la place du layout avec scroll d'ancre. Ce refactoring améliore l'UX en segmentant le contenu analytique dense en sections distinctes.

**Composants de navigation communs** (définis localement dans chaque page) :

```typescript
type TabId = 'kpis' | 'top10' | 'carte' | 'scatter' | 'evolution' | 'structure' | 'distribution' | 'detail' | 'tableau'

function TabNav({ activeTab, onTabChange }) // Barre de tabs horizontale scrollable
function TabProgress({ activeTab })         // Barre de progression (segments colorés)
// goPrev / goNext                          // Navigation Précédent/Suivant
```

**Comportement** :
- Changement d'onglet → scroll automatique vers le haut via `document.getElementById('scar-main-scroll').scrollTo({ top: 0, behavior: 'instant' })`
- Compteur `X / 9` centré entre les boutons Préc/Suiv
- Segment actif : couleur navy (`hsl(213,60%,27%)`) pour les 4 pages cartographie
- Segment inactif précédent : couleur atténuée `hsla(213,60%,27%,0.35)`

### 4.2 Tabs de CartographieNonVie

```typescript
const TABS = [
  { id: 'kpis',         label: 'KPIs',             icon: '📊' },
  { id: 'top10',        label: 'Top 10',            icon: '🏆' },
  { id: 'carte',        label: 'Carte',             icon: '🗺️' },
  { id: 'scatter',      label: 'Scatter',           icon: '🎯' },
  { id: 'evolution',    label: 'Évolution',         icon: '📈' },
  { id: 'structure',    label: 'Structure',         icon: '🥧' },
  { id: 'distribution', label: 'Distribution S/P', icon: '📉' },
  { id: 'detail',       label: 'Détail Pays',       icon: '🌍' },
  { id: 'tableau',      label: 'Classement',        icon: '📋' },
]
```

### 4.3 Tabs de CartographieMacro / CartographieVie / CartographieGouvernance

Schéma similaire à Non-Vie avec adaptations thématiques (ex: `'distribution'` devient `'inflation'` pour Macro, `'evolution'` adaptée, etc.).

---

## 5. Composants cartographie réutilisables

### 5.1 `AfricaMap`

Composant de carte choroplèthe interactive de l'Afrique. Props :

```typescript
interface AfricaMapProps {
  indicators: {
    key: string
    label: string
    scale: 'primes' | 'penetration' | 'densite' | 'croissance' | 'gdp' | 'gdpCap' | 'wgi' | 'inflation' | 'currentAcc' | 'sp'
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
  - `sp` : divergente avec seuil 70%
- **Hover country** : tooltip avec valeur, pays, région
- **Légende** de couleurs intégrée

### 5.2 `ConfigurableScatterBubble`

Scatter plot interactif avec axes configurables. Props :

```typescript
interface ConfigurableScatterBubbleProps {
  title: string
  metrics: MetricDef[]      // Liste des métriques disponibles pour X et Y
  defaultX: string
  defaultY: string
  sizeLabel: string
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
```

### 5.3 `ScatterBubble`

Version simplifiée du scatter avec axes fixes. Utilisée dans `CartographieGouvernance`.

### 5.4 `CartographieKPIGrid`

Grille de 4 KPI cards. Props :

```typescript
kpis: {
  label: string
  value: string
  sublabel: string
  accent: 'green' | 'navy' | 'amber' | 'olive'
}[]
```

### 5.5 `InsightPanel`

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

### 5.6 `CountryTable`

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

### 5.7 `RegionLegend`

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

### 5.8 `HeatmapChart`

Heatmap pays × années. Props :

```typescript
interface HeatmapChartProps {
  matrix: Record<string, Record<number, number | null>> // pays → année → valeur
  years: number[]
  countries: string[]
  regions: Record<string, string>  // pays → région
  scale: 'inflation' | 'wgi' | 'penetration'
  format: (v: number) => string
  // Légende verticale de couleur positionnée à droite
}
```

### 5.9 `RegionalDonutChart`

Donut chart de répartition régionale (utilise Plotly.js). Sélecteur année + bouton moyenne.

### 5.10 `AnimatedControls`

Sélecteur d'année animé avec pilules.

---

## 6. Hook central : `useCartographieData`

```typescript
const { data, years, countries, loading, error } = useCartographieData(endpoint)
// endpoint: 'non-vie' | 'vie' | 'macroeconomie' | 'gouvernance'

// Retourne :
// data[]    : tableau de lignes (MacroRow | VieRow | GouvRow | NonVieRow)
// years[]   : liste des années disponibles (dédupliquées, triées)
// countries[]: liste des pays disponibles (dédupliqués, triés)
```

---

## 7. Types de données (cartographie)

### 7.1 `NonVieRow`

```typescript
interface NonVieRow {
  pays: string
  region: string | null
  annee: number
  primes_emises_mn_usd: number | null
  taux_penetration_pct: number | null
  densite_assurance_usd: number | null
  croissance_primes_pct: number | null
  ratio_sp_pct: number | null           // Ratio Sinistres/Primes (anciennement sp_ratio_pct)
}
```

> **Note** : Le champ ratio S/P s'appelle `ratio_sp_pct` dans la version actuelle (CartographieNonVie.tsx), différent de `sp_ratio_pct` documenté dans les anciennes versions.

### 7.2 `VieRow`

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

### 7.3 `MacroRow`

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

### 7.4 `GouvRow`

```typescript
interface GouvRow {
  pays: string
  region: string | null
  annee: number
  political_stability: number | null      // WGI [-2.5, +2.5]
  regulatory_quality: number | null       // WGI [-2.5, +2.5]
  fdi_inflows_pct_gdp: number | null      // IDE en % du PIB
  kaopen: number | null                   // Index Chinn-Ito [-2.5, +2.5]
}
```

---

## 8. Page : Cartographie Non-Vie (`/modelisation/cartographie/non-vie`)

### 8.1 Description

`CartographieNonVie.tsx` — Analyse complète du marché de l'assurance Non-Vie africain. Architecture refactorisée en **9 onglets**.

**Note** : L'Afrique du Sud est traitée comme une région distincte `'Afrique du Sud'` pour éviter les distorsions d'échelle (~50% du marché continental).

### 8.2 KPIs (4 cartes — onglet `kpis`)

| KPI | Calcul | Accent |
|---|---|---|
| Primes Non-Vie totales | Σ primes année max, 34 pays | Navy |
| Croissance médiane | Médiane des `croissance_primes_pct` | Green |
| Pénétration moyenne | Moyenne des `taux_penetration_pct` | Olive |
| Ratio S/P médian | Médiane des `ratio_sp_pct` | Amber |

### 8.3 Top 10 pays par primes (onglet `top10`)

- BarChart horizontal — couleur par région
- `YearOrAvgNav` (boutons: chaque année + "Moy. 2015-2024")
- **Mode moyenne** : agrégation pondérée sur toute la série
- Insights dynamiques : `useTop10Insights(data, top10Year)` (alias de `useNonVieTop10Insights`)

### 8.4 Carte choroplèthe (onglet `carte`)

Indicateurs disponibles :
- Primes Émises (Mn USD) — scale logarithmique
- Ratio S/P (%) — scale divergente (`sp`)
- Pénétration (%) — scale power
- Densité (USD/hab) — scale linéaire
- Croissance (%) — scale divergente

### 8.5 Scatter multi-axes (onglet `scatter`)

Axes disponibles :
```typescript
const scatterMetrics: MetricDef[] = [
  { key: 'penetration', label: 'Pénétration (%)', format: fmtPct },
  { key: 'densite',     label: 'Densité (USD/hab)', format: fmtUsd },
  { key: 'croissance',  label: 'Croissance Primes (%)', format: fmtPct, ref: 0 },
  { key: 'sp',          label: 'Ratio S/P (%)', format: fmtPct, ref: 70 },
]
```

- Option **"Exclure l'Afrique du Sud"** : toggle checkbox
- `onAxesChange` → met à jour `scatterXKey`, `scatterYKey` → insights recalculés

### 8.6 Évolution régionale (onglet `evolution`)

- ComposedChart stacked area — toutes les régions + Line séparée pour ZAF sur axe droit
- Barre régionale avec `AnimatedControls` + bouton "Moy. 2015–2024"
- Insights dynamiques : `useEvolutionInsights(data)` + `useBarRegionalInsights(data, barYear, barShowAvg, years)`

### 8.7 Structure du marché (onglet `structure`)

- Donut Plotly — répartition % des primes par région
- Sélecteur année + bouton moyenne
- Insights dynamiques : `useStructureInsights(data, year)`

### 8.8 Distribution S/P (onglet `distribution`)

- ComposedChart simulant une boîte à moustaches (Q1/Q3 + médiane + min/max)
- Ligne de référence : `y=70` → seuil sinistralité
- `YearOrAvgNav` (sélection année ou moyenne)
- Insights dynamiques : `useSPDistributionInsights(data)`

### 8.9 Détail pays (onglet `detail`)

- Sélecteur pays (select)
- ComposedChart dual-axis : Bar primes + Lines (pénétration, croissance, S/P coloré conditionnel)
- Insights dynamiques : `useCountryInsights(data, pays)` → `{ cards, region, coverage }`

### 8.10 Tableau Classement (onglet `tableau`)

- `YearOrAvgNav` pour sélection période
- `CountryTable` avec colonnes : `Pays | Région | Primes (Mn USD) | Croissance | Pénétration | Ratio S/P | Densité`
- Badge S/P : vert < 70%, orange 70-90%, rouge > 90%
- Tri initial : `primes` décroissant
- Insights dynamiques : `useRankingInsights(data)`

### 8.11 Hooks d'insights (noms à jour)

```typescript
// Imports depuis '../hooks/useNonVieInsights'
useChoroplethInsights(data)                          // carte
computeScatterInsights(xKey, yKey, data)             // scatter (pure function, pas hook)
useTop10Insights(data, top10Year)                    // top 10
useEvolutionInsights(data)                           // stacked area
useBarRegionalInsights(data, barYear, barShowAvg, years) // barre régionale
useStructureInsights(data, year)                     // donut
useSPDistributionInsights(data)                      // box plot S/P
useCountryInsights(data, pays)                       // détail pays
useRankingInsights(data)                             // classement
```

---

## 9. Page : Cartographie Vie (`/modelisation/cartographie/vie`)

### 9.1 Description

`CartographieVie.tsx` — Analyse du marché Vie africain. Architecture en onglets.

**Note** : L'Afrique du Sud représente ~85% du marché vie continental.

### 9.2 KPIs

| KPI | Calcul | Accent |
|---|---|---|
| Primes Vie totales | Σ primes année max | Navy |
| Croissance médiane | Médiane `croissance_primes_pct` | Green |
| Pénétration moyenne | Moyenne `taux_penetration_pct` | Olive |
| Densité moyenne | Moyenne `densite_assurance_usd` | Amber |

(Structure des onglets identique à Non-Vie avec adaptations : distribution pénétration au lieu de S/P, NvVieStructure remplacé, etc.)

---

## 10. Page : Cartographie Macroéconomie (`/modelisation/cartographie/macroeconomie`)

### 10.1 Description

`CartographieMacro.tsx` — Analyse macroéconomique des 34 pays africains. Sources : World Bank, IMF, UNCTAD.

**Route** : `/modelisation/cartographie/macroeconomie` (le préfixe est `macroeconomie` dans App.tsx, non `macro`).

**Note** : L'Afrique du Sud → région `'Afrique Australe'` (correction useMemo au chargement).

### 10.2 Indicateurs couverts (7)

1. PIB (`gdp_mn`)
2. PIB/habitant (`gdp_per_capita`)
3. Croissance PIB (`gdp_growth_pct`)
4. Inflation (`inflation_rate_pct`)
5. Compte courant (`current_account_mn`)
6. Intégration régionale (`integration_regionale_score`)
7. PIB (Mn USD) en plus

### 10.3 KPIs

| KPI | Calcul | Accent |
|---|---|---|
| Croissance PIB médiane | Médiane `gdp_growth_pct` | Green |
| PIB/hab médian | Médiane `gdp_per_capita` | Navy |
| Inflation médiane | Médiane `inflation_rate_pct` | Amber |
| Meilleure intégration | Top pays par `integration_regionale_score` | Olive |

### 10.4 Carte choroplèthe (6 indicateurs)

| Clé | Label | Échelle |
|---|---|---|
| `gdp` | PIB (Mn USD) | `gdp` |
| `gdpCap` | PIB/hab (USD) | `gdpCap` |
| `growth` | Croissance PIB (%) | `croissance` |
| `infl` | Inflation (%) | `inflation` |
| `ca` | Compte courant (Mn USD) | `currentAcc` |
| `integ` | Intégration régionale | `wgi` |

`showZafBorder={false}` (pas de bordure spéciale).

### 10.5 Radar profil macro régional

RadarChart — 4 dimensions par région :
```typescript
growthScore = min(100, max(0, 20 + avgGrow * 8))
inflScore   = min(100, max(0, 100 - avgInfl * 5))
gdpCapScore = min(100, avgGdpCap / 120)
integScore  = avgInteg * 100 / 0.65
```

### 10.6 Hooks d'insights Macro

```typescript
// Imports depuis '../hooks/useMacroInsights'
useMacroChoroplethInsights, computeMacroScatterInsights, useMacroEvolutionInsights
useMacroTop10Insights, useMacroBarRegionalInsights, useMacroInflationDistributionInsights
useMacroIntegrationInsights, useMacroCountryInsights, useMacroRankingInsights
```

---

## 11. Page : Cartographie Gouvernance (`/modelisation/cartographie/gouvernance`)

### 11.1 Description

`CartographieGouvernance.tsx` — Analyse de la gouvernance et du risque politique. Sources : WGI, Chinn-Ito, UNCTAD FDI.

**Note** : Afrique du Sud → région `'Afrique Australe'`.

### 11.2 Indicateurs couverts (4)

1. Stabilité politique (`political_stability`) — WGI [-2.5, +2.5]
2. Qualité réglementaire (`regulatory_quality`) — WGI [-2.5, +2.5]
3. Flux IDE (`fdi_inflows_pct_gdp`) — % du PIB
4. KAOPEN (`kaopen`) — Index Chinn-Ito [-2.5, +2.5]

### 11.3 Scatters gouvernance

**Scatter 1 : Stabilité vs Réglementation** — quadrants institutionnels  
**Scatter 2 : KAOPEN vs IDE** — ouverture financière vs attractivité IDE

> Le bouton "Inclure/Exclure Afrique du Sud" a été **retiré** des scatters gouvernance.

### 11.4 KaopenBadge

- `Ouvert` (vert, KAOPEN > 1)
- `Partiel` (orange, -0.5 à 1)
- `Fermé` (rouge, < -0.5)

### 11.5 Hooks d'insights Gouvernance

```typescript
// Imports depuis '../hooks/useGouvInsights'
useGouvChoroplethInsights, useGouvScatterStabRegInsights, useGouvScatterKaopenFdiInsights
useGouvEvolutionInsights, useGouvCountryInsights, useGouvKaopenDistribInsights
useGouvRankingInsights, useGouvHeatmapRegInsights, useGouvHeatmapStabInsights
```

---

## 12. Système d'Insights Dynamiques

### 12.1 Principe d'architecture

Chaque page cartographie a un fichier de hooks dédié :

```
hooks/
  useNonVieInsights.ts     → CartographieNonVie
  useVieInsights.ts        → CartographieVie
  useMacroInsights.ts      → CartographieMacro
  useGouvInsights.ts       → CartographieGouvernance
  useAnalyseInsights.ts    → AnalyseGlobale + AnalysePays
```

### 12.2 Règle d'unicité des insights

**Contrainte absolue** : chaque insight dans un panel doit être **unique et non-redondant** par rapport aux autres panels de la même page. Chaque panel doit apporter une **valeur analytique distincte**.

### 12.3 Structure d'un hook d'insight

```typescript
export function useGouvChoroplethInsights(data: GouvRow[]): InsightCard[] {
  return useMemo(() => {
    if (!data.length) return []
    // Calculs statistiques sur data
    return [
      {
        label: 'LEADERS INSTITUTIONNELS',
        value: `${topCountries.slice(0, 3).join(' · ')}`,
        text: `Ces pays combinent stabilité politique (WGI > 0.5)...`,
        accent: 'green',
      },
      // ...
    ]
  }, [data])
}
```

### 12.4 `compute*` vs `use*` hooks

- Fonctions `compute*` : fonctions pures, appelées dans `useMemo` du composant parent, recalculées à chaque changement d'état (ex: axes scatter)
- Hooks `use*` : hooks React standards (`useMemo` encapsulé), dépendent uniquement des données

---

## 13. Constantes cartographie

### 13.1 `cartographieConstants.ts`

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

## 14. Design System (Axe 2)

### 14.1 Palette de couleurs (thème Olive)

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

### 14.2 Formatters communs

```typescript
// Non-Vie
fmtMn(v)   = v >= 1000 ? `${(v/1000).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$`
fmtPct(v)  = `${v.toFixed(1)}%`
fmtUsd(v)  = `${v.toFixed(1)}$`

// Macro
fmtBn(v)   = v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)} Bn$` : fmtMn(v)
fmtPctSgn(v) = `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
fmtUsd(v)  = `$${Math.round(v).toLocaleString()}/hab`
fmtScore(v) = v.toFixed(3)

// Gouvernance
fmtWgi(v)    = `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
```

### 14.3 `YearOrAvgNav` (composant local partagé)

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

## 15. Page : Analyse Globale (`/modelisation/analyse`)

### 15.1 Description

`AnalyseGlobale.tsx` — **Hub de navigation** vers les fiches pays individuelles. Présente une vue consolidée des 34 pays africains et permet d'accéder à la fiche détaillée ou à la **comparaison de deux pays**.

### 15.2 Architecture de la page

```
[Sélecteur de pays] → Navigation vers /modelisation/analyse/:pays
[KPI Cards globaux] → 4 indicateurs continentaux
[Classements par indicateur] → 6 cartes Top-8 (cliquables)
[Tableau de synthèse] → 34 pays × 9 colonnes
[Insights globaux] → useAnalyseGlobaleInsights
```

### 15.3 Navigation interne (NAV_ITEMS)

```typescript
const NAV_ITEMS = [
  { id: 'recherche',   label: 'Recherche' },
  { id: 'classements', label: 'Classements' },
  { id: 'tableau',     label: 'Tableau' },
  { id: 'insights',    label: 'Insights' },
]
```

### 15.4 Classements par indicateur (6 cartes)

`RankingCard` (sous-composant interne) — Top 8 pays avec badge région coloré et valeur. Chaque ligne est **cliquable** → navigate vers la fiche pays.

| Carte | Indicateur | Format |
|---|---|---|
| 🏆 Top Primes Non-Vie | `primes_emises_mn_usd` | `fmtMn` |
| 🌱 Top Pénétration Non-Vie | `taux_penetration_pct` | `xx.xx%` |
| 💼 Top Primes Vie | `primes_emises_mn_usd` (vieData) | `fmtMn` |
| 💰 Top PIB par habitant | `gdp_per_capita` | `$X XXX` |
| 🏛 Top Stabilité Politique | `political_stability` | `±X.XX` |
| 🌍 Top Attractivité IDE | `fdi_inflows_pct_gdp` | `X.X% PIB` |

### 15.5 Tableau de synthèse (`CountryTable`)

- `34 lignes × 9 colonnes`
- **Click sur ligne** → navigate vers la fiche pays
- **Sélecteur année** : `YearOrAvgNav`

Colonnes avec badges colorés :

| Colonne | Badges |
|---|---|
| `gdpGrowth` | Vert ≥ 5%, Orange 0-5%, Rouge < 0% |
| `inflation` | Vert ≤ 5%, Orange 5-10%, Rouge > 10% |
| `politStab` | Vert ≥ 0.5, Orange -0.5 à 0.5, Rouge < -0.5 |
| `fdi` | Vert ≥ 5%, Orange 1-5%, Rouge < 1% |

### 15.6 Data flow

```typescript
// 4 datasets chargés en parallèle
const { data: nvData, years } = useCartographieData('non-vie')
const { data: vieData }       = useCartographieData('vie')
const { data: macroData }     = useCartographieData('macroeconomie')
const { data: gouvData }      = useCartographieData('gouvernance')
```

---

## 16. Page : Analyse Pays (`/modelisation/analyse/:pays`)

### 16.1 Description

`AnalysePays.tsx` — **Fiche pays complète** sur les 4 dimensions. Page la plus exhaustive de l'Axe 2.

**Architecture** : Système de **9 tabs horizontaux** — similaire aux pages cartographie mais thème olive pour l'actif.

### 16.2 Accès et navigation

- **Depuis** : `AnalyseGlobale` (clic sur un pays dans les classements ou le tableau)
- **URL** : `/modelisation/analyse/:pays` (pays encodé en URI)
- **Changement de pays** : Dropdown `react-select` dans le tab Identité
- **Reset automatique** : Changement de pays → retour automatique à l'onglet `identite`
- **Bouton "Comparer"** : navigate vers `/modelisation/comparaison?a={pays}` pour déclencher la ComparaisonPays avec ce pays pré-sélectionné

### 16.3 Système de tabs (TABS)

```typescript
type TabId =
  | 'identite' | 'kpis' | 'evolution' | 'radar'
  | 'non-vie' | 'vie' | 'macro' | 'gouvernance' | 'positionnement'

const TABS = [
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

**Navigation** : `TabNav` (barre scrollable), `TabProgress` (9 segments olive), boutons Précédent/Suivant, compteur `X / 9`.

### 16.4 Sélecteur de période

`YearOrAvgNav` — état `selectedYear: number | 'avg'` (défaut : `'avg'`).

L'onglet **Évolution** affiche toujours la série complète 2015–2024 (indépendante du sélecteur).

### 16.5 Tab : Identité

- Nom du pays en `h1` avec badge région colorié
- Dropdown `react-select` pour changer de pays
- 4 cartes Overview : Dimensions (4) · Période (2015–2024) · Périmètre (34 pays) · Sources (5+)
- Grille de raccourcis : boutons cliquables vers chaque onglet thématique

### 16.6 Tab : KPIs

`CartographieKPIGrid` — 8 cartes en grille :

| KPI | Source | Accent dynamique |
|---|---|---|
| Primes Non-Vie | `nvData` | Navy |
| Pénétration NV | `nvData` | Olive |
| Primes Vie | `vieData` | Green |
| Pénétration Vie | `vieData` | Amber |
| PIB | `macroData` | Navy |
| PIB / habitant | `macroData` | Olive |
| Stabilité politique | `gouvData` | Green/Amber/Red selon WGI |
| IDE (% PIB) | `gouvData` | Green/Amber/Red selon valeur |

### 16.7 Tab : Évolution

ComposedChart dual-axis — série complète 2015–2024.

### 16.8 Tab : Radar

RadarChart Recharts — profil multidimensionnel 6 axes (pays vs médiane continentale).

### 16.9 Tabs : Non-Vie, Vie, Macro, Gouvernance

Chaque tab contient : évolution graphique + graphique spécifique (rang / structure / radar) + tableau historique + InsightPanel.

### 16.10 Tab : Positionnement

**Bloc 1** — Rang continental (7 indicateurs), badge couleur top 10 / 11-20 / 21+  
**Bloc 2** — Vs moyenne de sa région (`VsTable`)  
**Bloc 3** — Vs médiane continentale (`VsTable`)  
**Synthèse** — `useAnalysePaysInsights` — insights stratégiques orientés AtlanticRe

### 16.11 Sous-composants internes

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
| `YearOrAvgNav` | Sélecteur d'année local |
| `SectionTitle` | `<h2>` avec bordure olive stylisée |

### 16.12 Helper clé : `getRowVal`

```typescript
function getRowVal<T>(rows: T[], field: keyof T, year: YearSel): number | null
// Si year === 'avg' : moyenne de toute la série
// Sinon : valeur de l'année exacte
```

---

## 17. Page : Comparaison de Pays (`/modelisation/comparaison`) ← NOUVELLE

### 17.1 Description

`ComparaisonPays.tsx` — **Analyse comparative côte-à-côte de deux pays africains** sur les 4 dimensions (Non-Vie, Vie, Macro, Gouvernance). Inspirée de `AnalysePays` (onglets) et de `Comparison` Axe 1.

### 17.2 Accès

- **Depuis `AnalyseGlobale`** : bouton "Comparer" sur un pays → navigate `/modelisation/comparaison?a={pays}`
- **Depuis `AnalysePays`** : bouton "Comparer ce pays" → navigate `/modelisation/comparaison?a={pays}`
- **Accès direct** : `/modelisation/comparaison` (pas de pré-sélection)

**Pré-remplissage** via query param `?a=<pays>` : lu dans `useEffect` à l'initialisation, décode `decodeURIComponent(a)` et pré-sélectionne `paysA`.

### 17.3 Système de Tabs (7 onglets)

```typescript
type TabId = 'kpis' | 'radar' | 'non-vie' | 'vie' | 'macro' | 'gouvernance' | 'positionnement'

const TABS = [
  { id: 'kpis',           label: 'KPIs & Évolution', icon: '📊' },
  { id: 'radar',          label: 'Radar',             icon: '🎯' },
  { id: 'non-vie',        label: 'Non-Vie',           icon: '🔵' },
  { id: 'vie',            label: 'Vie',               icon: '🟢' },
  { id: 'macro',          label: 'Macroéconomie',     icon: '💹' },
  { id: 'gouvernance',    label: 'Gouvernance',       icon: '🏛' },
  { id: 'positionnement', label: 'Positionnement',   icon: '🏆' },
]
```

Navigation identique aux autres pages : `TabNav`, `TabProgress`, boutons Préc/Suiv, compteur `X / 7`.

### 17.4 Header permanent (toujours visible)

**Ligne 1** : Titre + sélecteurs A vs B
- `Pays A` : react-select, filtré (exclut le pays B)
- `Pays B` : react-select, filtré (exclut le pays A)
- Badge VS centré avec gradient navy → olive
- Changement de pays → reset vers onglet `kpis`

**Ligne 2** : Sélecteur de période (`YearOrAvgNav`) + Pills pays sélectionnés (`CountryPill`)

**Ligne 3** : `TabNav` (visible seulement si `ready = paysA && paysB && paysA !== paysB`)

**Placeholder** : Si l'un des pays n'est pas sélectionné, affiche un état vide explicatif.

### 17.5 Couleurs A vs B

```typescript
const COLOR_A = '#1B3F6B'          // navy (Pays A)
const COLOR_B = 'hsl(83,52%,36%)' // olive (Pays B)
```

### 17.6 `KpiRow` — Ligne de comparaison KPI

```typescript
function KpiRow({ label, valA, valB, fmt, lowerIsBetter })
// Grille 3 colonnes : [valeur A avec ✓ si gagnant] [label + DeltaBadge] [valeur B avec ✓ si gagnant]
// DeltaBadge : calcul écart relatif (a-b)/|b| * 100, affiche ▲▼ en couleur
```

### 17.7 Tab : KPIs & Évolution

- Tableau `KpiRow` avec 9 lignes (Primes NV, Pénétration NV, Primes Vie, Pénétration Vie, PIB, PIB/hab, Croiss. PIB, Stabilité pol., IDE)
- Gradient de fond : `linear-gradient(to right, COLOR_A·10%, white 50%, COLOR_B·10%)`
- **Évolution Primes** : BarChart + 4 séries (NV-A, NV-B, Vie-A, Vie-B) sur série 2015–2024
- **Évolution Macro** : LineChart (Croiss. PIB A/B + Inflation A/B)

### 17.8 Tab : Radar (6 dimensions)

`RadarChart` Recharts avec **3 séries** : Pays A (navy), Pays B (olive), Médiane continentale (gris pointillés).

6 dimensions normalisées [0-100] :
- Primes NV, Pénétration NV, Primes Vie : `(valeur / max continental) × 100`
- PIB/hab : `(valeur / max continental) × 100`
- Stabilité pol., Ouverture fin. (KAOPEN) : `((WGI + 2.5) / 5) × 100`

### 17.9 Tabs thématiques (Non-Vie, Vie, Macro, Gouvernance)

Chaque tab contient :
1. **Graphique comparatif** : BarChart ou LineChart avec séries A et B côte-à-côte
2. **Tableau historique** (`HistoTable`) : toutes les années, colonnes A et B

`HistoTable` (sous-composant interne) :
```typescript
function HistoTable({ rowsA, rowsB, fields })
// En-têtes : [Année] [Label A | Label B] ...
// Sous-en-têtes colorés (COLOR_A / COLOR_B) : A | B
```

### 17.10 Tab : Positionnement

- **Rang continental** : pour chaque indicateur, calcul dynamique du rang (sur `selectedYear` ou moyenne) pour Pays A et Pays B simultanément
- Tableau côte-à-côte : `Indicateur | Valeur A | Rang A/34 | Valeur B | Rang B/34`
- Badge rang : Vert top 10 / Orange 11-20 / Rouge 21+

### 17.11 Data flow

```typescript
// 4 datasets Axe 2 (même pattern qu'AnalysePays)
const { data: nvData, years } = useCartographieData('non-vie')
const { data: vieData }       = useCartographieData('vie')
const { data: macroData }     = useCartographieData('macroeconomie')
const { data: gouvData }      = useCartographieData('gouvernance')

// Rows filtrés par pays
const nvA    = nvData.filter(r => r.pays === paysA).sort(...)
const nvB    = nvData.filter(r => r.pays === paysB).sort(...)
// ... × 4 sources

// evoData : union des années pour les graphiques d'évolution
const evoData = useMemo(() => ...)  // combinaison nvA, nvB, macA, macB, vieA, vieB

// radarData : 6 dimensions + médiane calculée sur les 34 pays
const radarData = useMemo(() => ...)  // selon selectedYear
```

### 17.12 Route dans App.tsx

```typescript
const ComparaisonPays = lazy(() => import('./pages/ComparaisonPays'))
// ...
<Route path="/modelisation/comparaison" element={<ErrorBoundary><ComparaisonPays /></ErrorBoundary>} />
// Intégrée dans le bloc <ScarLayout /> (public, pas besoin d'authentification)
```

---

## 18. Page : SCAR Scoring (`/modelisation/scar`)

### 18.1 Description

Module de **scoring SCAR (Scoring des Capacités et Attractivité de Réassurance)** appliqué aux marchés africains d'un point de vue stratégique.

### 18.2 Fonctionnalités (structure générale)

- Tableau de scoring des pays africains selon des critères SCAR
- Combinaison des dimensions non-vie, vie, macro et gouvernance
- Visualisation radar par pays

---

## 19. Hooks d'insights : `useAnalyseInsights`

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

## 20. Points d'attention et contraintes techniques (Axe 2)

> **Unicité des insights** : Règle absolue — chaque `InsightPanel` doit apporter une valeur analytique strictement différente des autres panels de la même page.

> **Afrique du Sud — traitement différencié** :
> - **Non-Vie / Vie** : ZAF dans sa propre région `'Afrique du Sud'` (évite distorsion ~85% du marché)
> - **Macro / Gouvernance / Analyse Pays / ComparaisonPays** : ZAF intégrée à `'Afrique Australe'` (pays normal)
> - Correction via `useMemo` au chargement des données

> **`useCartographieData`** : Hook central. Dans `AnalysePays` et `ComparaisonPays`, il est appelé **4 fois** (une fois par endpoint) — intentionnel, les 4 sources sont indépendantes.

> **Tabs refactorisés** : Les 4 pages cartographie (Non-Vie, Vie, Macro, Gouvernance) utilisent désormais un système de tabs horizontaux. La navigation par ancre (scroll) est abandonnée. `CartographieLayout` reçoit `navItems=[]` dans toutes ces pages.

> **ComparaisonPays — Guard** : La page n'affiche les tabs que si `ready = paysA && paysB && paysA !== paysB`. Sinon, un placeholder est affiché.

> **Pré-remplissage ComparaisonPays** : Le paramètre `?a=<pays>` (encodé URI) est lu dans `useEffect` et set `paysA`. Utilisé par `AnalysePays` et `AnalyseGlobale` pour pré-sélectionner le pays de contexte.

> **Données manquantes** : Les colonnes peuvent être `null` pour certains pays/années. Toujours filtrer : `.filter((v): v is number => v != null)` avant les calculs statistiques.

> **NonVieRow — champ ratio S/P** : Le champ s'appelle `ratio_sp_pct` dans le code actuel (buildMatrix, tableaux), pas `sp_ratio_pct`. Vérifier la cohérence avec le backend.

> **Code splitting** : Toutes les pages Axe 2 chargées via `React.lazy()` dans `App.tsx`. `ComparaisonPays` est également lazy-loadée.

> **Navigation entre fiches pays** : La route `:pays` est encodée en URI. Toujours utiliser `encodeURIComponent(pays)` lors de la navigation et `decodeURIComponent(paysParam)` lors de la réception.

> **`getRowVal` et `getCountryAvg`** : Deux helpers similaires, `getRowVal` est omniprésent dans les composants, `getCountryAvg` est un helper de niveau supérieur. Ne pas les confondre.

> **Rang continental dans `ComparaisonPays`** : La fonction `rank(data, field, pays, desc)` est définie inline dans le tab positionnement — elle calcule le classement en agrégeant par pays (moyenne si multi-années), puis trouve le rang du pays demandé.
