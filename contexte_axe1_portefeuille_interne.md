# Contexte Axe 1 — Portefeuille Interne (AtlanticRe)

> **Document de référence exhaustif — Axe 1**  
> Version : Avril 2026 | Mis à jour depuis le code source (commit f2d7a7c)  
> Ce fichier décrit **toutes les fonctionnalités existantes** de l'Axe 1 de l'application AtlanticRe.

---

## 1. Vue d'ensemble architecturale

### 1.1 Positionnement dans l'application

L'application AtlanticRe est structurée autour de **deux axes stratégiques** accessibles depuis la page d'accueil (`Home.tsx`) :

- **Axe 1 — Portefeuille Interne** : Pilotage opérationnel du portefeuille de réassurance (souscription, scoring, rétrocession).
- **Axe 2 — Modélisation Afrique 2030** : Analyse stratégique des marchés africains (SCAR, cartographies, projections ML).

Ce fichier couvre **exclusivement l'Axe 1**.

### 1.2 Stack technique (Frontend)

| Technologie | Usage |
|---|---|
| **React 18** | Framework UI, gestion d'état local |
| **react-router-dom v6** | Routing SPA avec `lazy` / `Suspense` |
| **Recharts** | Graphiques (BarChart, LineChart, ScatterChart, ComposedChart) |
| **lucide-react** | Icônes SVG |
| **react-select** | Filtres multi-select |
| **react-hot-toast** | Notifications toast |
| **xlsx** | Export Excel natif côté client |
| **TypeScript** | Typage statique complet |

### 1.3 Stack technique (Backend)

| Technologie | Usage |
|---|---|
| **Python FastAPI** | API REST |
| **SQLite (`atlanticre.db`)** | Base de données principale |
| **pandas / SQLAlchemy** | Manipulation et requêtage de données |

### 1.4 Architecture des routes (Axe 1)

Toutes les routes Axe 1 sont **protégées** par `AuthProvider`. Le code-splitting via `React.lazy` est utilisé sur toutes les pages.

```
/                         → Home.tsx (choix des axes)
/login                    → Login.tsx (public)
/reset-password           → ResetPassword.tsx (public)
/change-password          → ChangePassword.tsx (public)

─── Axe 1 (Dashboard opérationnel) ───────────────────────
/dashboard                → Dashboard.tsx
/analyse                  → Analysis.tsx (Analyse Cédantes)
/analyse/:pays            → Analysis.tsx (avec pays pré-sélectionné)
/analyse-cedante          → CedanteAnalysis.tsx
/analyse-cedante/:cedante → CedanteAnalysis.tsx (fiche cédante)
/scoring                  → MarketSelection.tsx (Scoring marché)
/comparaison              → Comparison.tsx
/recommandations          → Recommendations.tsx
/analyse-courtiers        → BrokerAnalysis.tsx
/analyse-courtiers/:brokerName → BrokerDetail.tsx
/top-brokers              → BrokerAnalysis.tsx (alias)
/exposition               → ExpositionRisques.tsx
/fac-saturation           → FacSaturation.tsx

─── Axe 1 — Rétrocession ──────────────────────────────────
/retrocession/traites     → AffairesTraites.tsx
/cibles-tty               → TargetShare.tsx
/retrocession/securites   → PanelSecurites.tsx
/retrocession/fac-to-fac  → FacToFac.tsx

─── Admin ─────────────────────────────────────────────────
/admin                    → Admin.tsx (admin uniquement)
```

---

## 2. Système de filtrage global (DataContext)

### 2.1 Architecture du contexte

Le fichier `DataContext.tsx` centralise l'**état global des filtres** de l'Axe 1. Toutes les pages du dashboard partagent ce contexte.

```typescript
interface Filters {
  years: number[]           // Années souscription sélectionnées
  branches: string[]        // Branches d'assurance sélectionnées
  pays: string[]            // Pays sélectionnés
  courtiers: string[]       // Courtiers sélectionnés
  cedantes: string[]        // Cédantes sélectionnées
  typeContrat: string[]     // Types de contrats
  vieNonVie: string | null  // Périmètre Vie / Non-Vie
}
```

### 2.2 Fonction `filtersToParams`

Transforme l'état des filtres en paramètres HTTP pour les appels API :

```typescript
export function filtersToParams(filters: Filters): Record<string, string>
```

### 2.3 FilterPanel global

Composant `FilterPanel.tsx` — barre de filtres persistante en haut du dashboard. Contient :
- Multi-select années de souscription
- Multi-select branches
- Multi-select pays
- Multi-select courtiers / cédantes
- Toggle Vie / Non-Vie
- Bouton Réinitialiser

### 2.4 LocalFilterPanel

Composant `LocalFilterPanel.tsx` — panneau de filtres **local** (indépendant du contexte global). Utilisé dans `TargetShare.tsx` et `Analysis.tsx`. Les props `features[]` contrôlent quels filtres sont affichés :

```typescript
features: ['year', 'branch', 'typeContract', 'lifeScope', 'cedante', 'broker', 'country']
```

### 2.5 PageFilterPanel

Composant `PageFilterPanel.tsx` — panneau de filtres local alternatif, utilisé dans certaines pages analytiques. Similaire à `LocalFilterPanel` mais avec une UI différente.

---

## 3. Page : Dashboard (`/dashboard`)

### 3.1 Description fonctionnelle

Page d'accueil opérationnelle de l'Axe 1. Donne une vue panoramique du portefeuille AtlanticRe avec indicateurs de performance clés.

### 3.2 Composants inclus

| Composant | Rôle |
|---|---|
| `FilterPanel` | Filtres globaux persistants |
| `KPICards` | Cartes de KPI haut de page |
| `WorldMap` | Carte mondiale choroplèthe |
| `EvolutionChart` | Courbe d'évolution temporelle des primes |
| `DistributionCharts` | Répartition par branche |
| `RentabiliteChart` | S/P par pays ou branche |
| `FinancesChart` | KPIs financiers |
| `DashboardAlerts` | Alertes et signaux de risque |
| `PipelineView` | Vue pipeline des affaires |

### 3.3 KPIs affichés

1. **Prime totale souscrite** — Somme des `written_premium` filtrés (MAD)
2. **Résultat net** — Somme des `resultat` filtrés (MAD)
3. **ULR moyen** — Ratio sinistres/primes pondéré
4. **Nombre de contrats** — Count des affaires filtrées

> **Note monnaie** : Toutes les valeurs monétaires de l'Axe 1 sont en **MAD (Dirham Marocain)**. L'icône `Banknote` (lucide-react) est utilisée systématiquement à la place de `DollarSign`. Le formatter `formatMAD` est défini dans `utils/formatters.ts`.

### 3.4 Graphiques

- **WorldMap** : Choroplèthe mondiale, couleur = volume de primes par pays, hover = tooltip détaillé
- **EvolutionChart** : Stacked area ou line par année de souscription
- **DistributionCharts** : BarChart horizontal – répartition % par branche
- **RentabiliteChart** : Scatter ou BarChart – ULR par pays (top 20)

---

## 4. Page : Analyse Cédantes (`/analyse`)

### 4.1 Description fonctionnelle

`Analysis.tsx` — Analyse approfondie par cédante et par pays du portefeuille souscrit. Permet d'identifier les marchés performants et les cédantes à risque.

### 4.2 Architecture technique

Utilise un mélange de **filtres globaux** (`DataContext`) et de **filtres locaux** (`useLocalFilters`) :

```typescript
const { filters } = useData()
const lf = useLocalFilters()
const params = { ...filtersToParams(filters), ...lf.buildParams }
```

### 4.3 Route avec paramètre

La route `/analyse/:pays` permet de pré-sélectionner un pays via l'URL — utilisé par la navigation depuis d'autres pages.

### 4.4 Sections de la page

**Section 1 : Profil Pays**
- Sélecteur de pays (dropdown)
- Volume de primes par année (BarChart)
- ULR historique (LineChart)
- Répartition par branche (donut)
- Top cédantes dans ce pays (tableau)

**Section 2 : Analyse par Branche**
- Sélecteur de branche
- Évolution primes par année
- Distribution ULR
- Top cédantes par branche

**Section 3 : Analyse Cédante**
- Sélecteur de cédante
- Fiche détaillée : primes, résultat, ULR sur toute la période
- Répartition géographique (pays couverts)
- Évolution temporelle + branches actives

### 4.5 API Endpoints

```
GET /analyse/pays-profil?pays=XX&...
GET /analyse/branche-detail?branche=XX&...
GET /analyse/cedante-profil?cedante=XX&...
```

### 4.6 Composants spécifiques

- `FilterPanel` global + `LocalFilterPanel`
- `ExportButton` — export Excel du tableau courant
- Tableaux triables avec `SortHeader` (ASC/DESC par colonne)

---

## 5. Page : Analyse Cédante Détaillée (`/analyse-cedante`)

### 5.1 Description fonctionnelle

`CedanteAnalysis.tsx` — Fiche cédante exhaustive. Accessible depuis `/analyse-cedante` (avec sélecteur) ou directement via `/analyse-cedante/:cedante` (URL avec cédante pré-sélectionnée).

### 5.2 Fonctionnalités

- Fiche complète par cédante : historique primes, ULR, résultat
- Répartition géographique des affaires
- Top branches et pays de la cédante
- Évolution temporelle

---

## 6. Page : Analyse Courtiers (`/analyse-courtiers`)

### 6.1 Description fonctionnelle

`BrokerAnalysis.tsx` — Analyse dédiée aux courtiers (intermédiaires entre AtlanticRe et les cédantes).

### 6.2 Métriques affichées

| Métrique | Description |
|---|---|
| Volume de primes | Somme des primes via ce courtier |
| ULR moyen | Performance technique du portefeuille apporté |
| Nombre de cédantes | Diversification |
| Résultat net contribué | Impact sur le bottom-line |
| Répartition géographique | Pays couverts |

### 6.3 Visualisations

- **Top 10 courtiers par primes** : BarChart horizontal
- **Scatter courtiers** : X=Volume, Y=ULR → identification attractifs vs à risque
- **Timeline** : Évolution temporelle par courtier sélectionné
- **Tableau détail** : Tri sur toutes colonnes, export Excel

### 6.4 Filtres disponibles

- Année de souscription (multi)
- Branche (multi)
- Pays (multi)
- Toggle Vie/Non-Vie

### 6.5 Navigation vers fiche courtier

Clic sur un courtier → navigate vers `/analyse-courtiers/:brokerName` → `BrokerDetail.tsx`. La fiche détaillée présente la performance individuelle du courtier, son portefeuille de cédantes et sa répartition géographique.

---

## 7. Page : Scoring Marché (`/scoring`)

### 7.1 Description fonctionnelle

`MarketSelection.tsx` — Module de **scoring multicritère dynamique** des marchés (Pays × Branche). Permet à l'équipe de souscription d'identifier les marchés attractifs.

### 7.2 Architecture de la page

Deux zones :
1. **Sidebar gauche (360px)** — sticky, configuration des critères
2. **Zone droite** — résultats du scoring

### 7.3 Critères de scoring par défaut

```typescript
const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'ulr',             label: 'Loss Ratio (ULR)',       weight: 40, threshold: 70,     direction: 'lower_is_better'  },
  { key: 'written_premium', label: 'Prime écrite (volume)',  weight: 25, threshold: 100000, direction: 'higher_is_better' },
  { key: 'resultat',        label: 'Résultat net',           weight: 20, threshold: 0,      direction: 'higher_is_better' },
  { key: 'commi',           label: 'Taux de commission',     weight: 10, threshold: 35,     direction: 'lower_is_better'  },
  { key: 'share_written',   label: 'Part souscrite (Share)', weight: 5,  threshold: 5,      direction: 'higher_is_better' },
]
```

### 7.4 Interface de configuration

Pour chaque critère :
- **Poids (%)** — input numérique, somme doit = 100%
- **Seuil cible** — valeur de référence
- **Direction** — `↓ Min` ou `↑ Max`

**Jauge de validation** : barre rouge/verte selon `Σ poids = 100%` (tolérance ±1%).

### 7.5 Calcul du scoring

Envoyé au backend :
```typescript
POST /scoring/compute
Body: { filters: params, criteria: Criterion[] }
Response: { markets: MarketScore[] }
```

### 7.6 Données retournées par marché

```typescript
interface MarketScore {
  pays: string
  branche: string
  score: number              // 0-100
  badge: 'ATTRACTIF' | 'NEUTRE' | 'A_EVITER'
  written_premium: number
  avg_ulr: number
  total_resultat: number
  avg_commission: number
  avg_share: number
  contract_count: number
}
```

### 7.7 Score badges

| Badge | Condition | Couleur |
|---|---|---|
| ATTRACTIF | score ≥ 70 | `hsl(83,52%,36%)` — vert olive |
| NEUTRE | 40 ≤ score < 70 | `hsl(30,88%,56%)` — orange |
| À ÉVITER | score < 40 | `hsl(358,66%,54%)` — rouge |

### 7.8 Tableau de résultats

Colonnes triables : `# | Pays | Branche | Score Global | Recommandation | Prime écrite | LR% | Résultat | Commission | Share% | Contrats | Comparer`

- Colonne Score : badge coloré + barre de progression de fond
- Colonne ULR : coloration conditionnelle (vert < 70%, orange 70-100%, rouge > 100%)
- Colonne Résultat : vert si ≥ 0, rouge si < 0
- Bouton **Comparer** : navigate vers `/comparaison` avec `sessionStorage.setItem('compare_market_a', JSON.stringify({pays, branche}))`

### 7.9 Filtres de résultats

- Filtre badge : `Tous | Attractifs | Neutres | À éviter`
- Top N : input numérique (5-50)
- `ExportButton` : export Excel avec `variant="recommendations"`

### 7.10 Sauvegarde des seuils

```typescript
PUT /scoring/defaults   → Body: { criteria }
GET /scoring/defaults   → Lecture des seuils enregistrés
```

Accès conditionné par `can('modify_scoring')`.

---

## 8. Page : Comparaison Marchés (`/comparaison`)

### 8.1 Description fonctionnelle

`Comparison.tsx` — Outil de comparaison côte-à-côte de deux marchés (Pays × Branche). Pré-rempli depuis le scoring (via `sessionStorage`).

### 8.2 Fonctionnalités

- Sélection de deux marchés A et B
- Comparaison des métriques : primes, ULR, résultat, commission, share, nb contrats
- Graphique radar ou bar grouped
- Historique temporel des deux marchés en superposition

---

## 9. Page : Affaires Traitées (`/retrocession/traites`)

### 9.1 Description fonctionnelle

`AffairesTraites.tsx` — Module de **pilotage de la rétrocession en traité (TTY)**. Analyse les placements des traités auprès des sécurités (réassureurs preneurs). Architecture en **2 onglets** :

```
[Onglet "Vue Globale"]       → Analyse agrégée tous traités
[Onglet "Vue par Courtier"]  → Analyse par courtier
```

### 9.2 Filtres disponibles

- **UY** : multi-select par boutons pilules (inclut "Toutes")
- **Nature** : Proportionnel / Non Proportionnel
- **Traité** : select
- Bouton Réinitialiser

### 9.3 KPI Cards (5 cartes communes)

| KPI | Couleur | Description |
|---|---|---|
| EPI Total | Bleu | Volume de prime protégé (MAD) |
| PMD Totale | Orange | Coût de protection payé (MAD) |
| Courtage Total | Rouge | Coût d'intermédiation (MAD) |
| Taux Placement | Olive | Ratio PMD / EPI |
| Rating > A | Vert/Orange | Part chez sécurités solides (%) |

**Formule Taux de Placement** : `PMD / EPI`

### 9.4 Vue Globale — Graphiques

- **Donut Prop vs Non-Prop** : Répartition EPI proportionnel / non-proportionnel (Plotly / PieChart)
- **PMD par Traité** : BarChart horizontal — couleur Bleu (Prop) vs Orange (Non-Prop)
- **Taux de Placement** : BarChart horizontal — par traité
- Si **multi-années** : labels composites `{traite} ({uy})`

### 9.5 Vue Globale — Tableau des Traités

Colonnes : `▶ | Traité | Nature | UY | EPI | PMD 100% | PMD Totale | Courtage | Taux de Plac.% | Séc. | Rating>A`

- **Ligne expandable** → affiche le détail des sécurités de ce traité
- Sous-lignes sécurités : `↳ Sécurité | PMD par Sécurité | Commission Courtage | Part (%)`
- Export Excel : 2 feuilles (`Traités` + `Détail Sécurités`)

### 9.6 Vue par Courtier — Section Croisement

**Scatter "Double Rôle"** :
- X = Primes apportées (contrats), Y = PMD placée (rétro), Z = Volume total
- Affiche uniquement les courtiers `role_double = true`

**Accordions "Apporteurs purs"** (collapsible) :
- Table : `Courtier | Prime apportée | Volume total`
- `pursApporteurOpen` state, transition `max-height` animée

**Accordions "Placeurs purs"** (collapsible) :
- Table : `Courtier | PMD placée | Volume total`
- `pursPlaceurOpen` state, même animation

### 9.7 Vue par Courtier — Graphiques et Tableau

- **Top Courtiers par PMD Placée** : BarChart horizontal — top 10, olive
- **Taux de Courtage Moyen** : BarChart horizontal — top 10, orange

**Tableau des Courtiers** :
- **Filtre de rôle** (pills) : `Tous | Double Rôle | Apporteur | Placeur`
  - Compteurs inline par rôle : `Double Rôle (N)`, `Apporteur (N)`, `Placeur (N)`
  - `filteredCourtiers` calculé via `useMemo` selon `roleFilter`
- Colonnes : `Courtier | Rôle | Primes Apportées | PMD Placée | Courtage Rétro | Volume Total`
- Badges de rôle : `Double Rôle` (olive vert) / `Apporteur` (bleu-gris) / `Placeur` (orange)
- Valeur `—` si zéro (pas de confusion)
- Export Excel : `courtiers_retrocession_{date}.xlsx`

### 9.8 ROLE_CONFIG

```typescript
const ROLE_CONFIG = {
  double:    { label: 'Double Rôle', color: '#4E6820', bg: '#EEF3E6' },
  apporteur: { label: 'Apporteur',   color: '#2D3E50', bg: '#E8EDF1' },
  placeur:   { label: 'Placeur',     color: '#E67E22', bg: '#FEF5EC' },
}
```

### 9.9 API Endpoints

```
GET /retrocession/options
GET /retrocession/summary
GET /retrocession/by-traite
GET /retrocession/by-year
GET /retrocession/by-nature
GET /retrocession/by-courtier
GET /retrocession/courtier-croise
GET /retrocession/placement-status
```

---

## 10. Page : Cibles TTY (`/cibles-tty`)

### 10.1 Description fonctionnelle

`TargetShare.tsx` — Module de **calcul des parts cibles** sur les traités TTY. Calcule pour chaque traité une part-cible optimale basée sur des règles d'ajustement paramétrables.

### 10.2 Structure de la page

```
[FilterPanel Local]
[Panneau Ajustements — collapsible]
[Header + KPI Cards]
[Pills de filtre : Stable | Baisse | Hausse | Tous]
[Tableau détail avec expand-row — pagination 25/page]
[Charts : Top 15 + Scatter part actuelle vs cible]
```

### 10.3 Système d'ajustements paramétrables

```typescript
const DEFAULT_ADJUSTMENTS: AdjustmentParams = {
  ulr_low_threshold: 60,          // Bonus si ULR < 60%
  ulr_low_bonus: 1,               // +1 pt
  lob_threshold: 4,               // Bonus si LOB couverts ≥ 4
  lob_bonus: 1,                   // +1 pt
  low_share_threshold: 5,         // Bonus si part < 5%
  low_share_bonus: 1,             // +1 pt
  ulr_high_threshold: 80,         // Malus si ULR > 80%
  ulr_high_malus: -1,             // -1 pt
  max_increase_per_renewal: 2,    // Hausse max: +2 pts par renouvellement
  max_multiple: 3,                // Plafond: 3× la part actuelle
  cap_mdh: 10,                    // Cap prime cible: 10 MDH
}
```

**Formule de calcul** :
```
Ajustement brut  = ulr_bonus + lob_bonus + low_share_bonus + ulr_malus
Ajustement net   = min(ajustement_brut, max_increase_per_renewal)
Part cible       = share_actuelle + ajustement_net/100
                   [capped par max_multiple × share_actuelle et cap_mdh]
Potentiel add.   = prime_cible - prime_actuelle
```

### 10.4 KPI Cards

| KPI | Couleur | Description |
|---|---|---|
| Traités TTY | Navy | Nombre de contrats analysés |
| Potentiel Additionnel | Emerald | Gain potentiel total (MAD) |
| Traités en Hausse | Olive | Count badge = HAUSSE |
| Au Cap 10 MDH | Orange | Plafonds atteints |

### 10.5 Classification des traités

| Badge | Icône | Condition |
|---|---|---|
| HAUSSE | 📈 | Part cible > Part actuelle |
| STABLE | ⏸ | Part cible ≈ Part actuelle |
| BAISSE | 📉 | Part cible < Part actuelle |

### 10.6 Tableau détail — colonnes

`Cédante | Pays | Branche | Part actuelle | ULR | LOB | Ajust. | [expand]`

**Ligne expandable** (clic sur la ligne → expand-row) :
- Part Cible (avec 🔒 si cap atteint)
- Prime Actuelle (MAD)
- Prime Cible (MAD)
- Potentiel Additionnel (MAD) — vert si positif, rouge si négatif

**Tooltip ajustement** : survol cellule Ajust. → `ULR < X% : +N | LOB ≥ Y : +N | Part < Z% : +N | ULR > W% : -N → brut: N → net: N`

### 10.7 Recherche et pagination

- SearchBar : debounce 300ms, recherche par cédante/branche/pays
- Pagination serveur : 25 lignes/page, boutons Précédent/Suivant
- Reset page automatique si filtre/recherche/pill change

### 10.8 Graphiques

- **Top 15** : BarChart horizontal – top 15 par potentiel additionnel (filtré par pill)
- **Scatter** : X=Part actuelle, Y=Part cible, ligne de référence Y=X (points au-dessus = hausse)

### 10.9 Export Excel

```typescript
// Bypass pagination : export complet
GET /retrocession/cibles-tty?export=true&pill=XX&...
// Fichier : cibles_tty_{pill}.xlsx
```

### 10.10 API Endpoint

```
GET /retrocession/cibles-tty
Params: page, page_size, pill, search, sort_by, sort_desc,
        ulr_low_threshold, ulr_low_bonus, lob_threshold, lob_bonus,
        low_share_threshold, low_share_bonus, ulr_high_threshold,
        ulr_high_malus, max_increase_per_renewal, max_multiple, cap_mdh
```

---

## 11. Page : FAC-à-FAC (`/retrocession/fac-to-fac`)

### 11.1 Description fonctionnelle

`FacToFac.tsx` — Analyse de la **rétrocession facultative (FAC to FAC)**. Analyse les partenaires FAC : réassureurs qui participent aux affaires facultatives.

### 11.2 Architecture : Double vue en onglets

```
[Tab "Vue Globale"]       → Analyse agrégée par branche
[Tab "Vue Par Partenaire"] → Analyse individuelle par partenaire
```

### 11.3 Filtres spécifiques (panel interne, non-global)

- **UY** : multi-select par boutons pilules (inclut "Toutes")
- **LOB** : select (réinitialise Branche à null)
- **Branche** : select (réinitialise LOB à null) — exclusion mutuelle avec LOB
- **Type contrat** : select
- Bouton Réinitialiser

**Logique de construction de paramètres** :
```typescript
buildQuery()            // Tous les filtres
buildQueryNoUY()        // Sans UY (pour évolution temporelle)
buildQueryNoBrancheLob() // Sans branche/LOB (pour détail branches)
```

**Mise en évidence visuelle** : `LOB_BRANCHES` mapping → les barres/lignes de branches non-concernées par le filtre LOB actif sont opacifiées.

### 11.4 KPI Cards (communes aux deux vues)

| KPI | Couleur | Description |
|---|---|---|
| Engagement Partenaire Total | Rouge | Exposition max en capital (MAD) |
| Prime Partenaire Totale | Olive | Prime nette revenant aux partenaires |
| Moyenne Part Partenaire | Orange | Quote-part effective moyenne (%) |
| Prime Atlantic Re Totale | Bleu | Prime brute souscrite |
| Nombre de Partenaires | Navy | Partenaires preneurs distincts |

### 11.5 Vue Globale

**Graphique 1 : Évolution des Primes Partenaire par Année**
- LineChart : `prime_partenaire` (olive, trait plein) + `engagement_partenaire` (rouge, pointillés)

**Graphique 2 : Primes Partenaire par Branche**
- BarChart horizontal
- Highlight visuel : barres des branches non-LOB à opacity 0.25

**Tableau : Détail par Branche**
- Colonnes triables : `Branche | Nb Contrats | Prime Atlantic Re | Prime Partenaire | Engagement Partenaire | Part Moy (%)`
- Lignes highlights si branche filtrée (fond ambre)
- Export Excel : `fac_to_fac_detail_branches.xlsx`

### 11.6 Vue Par Partenaire

**Graphique 1 : Scatter — Croisement Donneurs × Preneurs**
- Entreprises à **double rôle** : cèdent des affaires à AtlanticRe ET prennent de la rétrocession
- X=Prime Donnée à Atlantic Re (MAD), Y=Prime Reçue d'Atlantic Re (MAD)
- Taille bulle = Engagement Total (normalisé 8-40px, `ZAxis range [64, 1600]`)

**Graphiques 2-3 : Top 10 Partenaires**
- Top Primes : BarChart horizontal, olive
- Top Engagement : BarChart horizontal, rouge

**Tableau : Tableau des Partenaires**
- Filtre de rôle en pills : `Tous | Double Rôle | Donneur | Preneur`
- Colonnes triables : `Partenaire | Contrats | Prime Part. | Engagement Part. | Part Moy | Rôle | Prime Donnée`
- Badges de rôle : Double Rôle (olive) / Donneur (amber) / Preneur (bleu)
- Export Excel : `fac_to_fac_partenaires.xlsx`

### 11.7 API Endpoints FAC-to-FAC

```
GET /fac-to-fac/options
GET /fac-to-fac/kpis
GET /fac-to-fac/evolution-primes
GET /fac-to-fac/primes-par-branche
GET /fac-to-fac/detail-branches
GET /fac-to-fac/top-partenaires-primes
GET /fac-to-fac/top-partenaires-engagement
GET /fac-to-fac/taux-part-moyen
GET /fac-to-fac/tableau-partenaires
GET /fac-to-fac/crossing   (sans filtre, chargé une fois)
```

---

## 12. Page : Sécurités (`/retrocession/securites`)

### 12.1 Description fonctionnelle

`PanelSecurites.tsx` — Vue exhaustive des réassureurs preneurs avec leur rating et exposition.

### 12.2 Fonctionnalités

- Tableau de toutes les sécurités
- Colonnes : `Nom | Rating | Type | Share moyen | PMD | Nb traités`
- Filtre **Rating ≥ A** : inclut A-, A, A+, A++ ; exclut B et inférieur
- Export Excel

---

## 13. Pages analytiques spécifiques

### 13.1 Exposition Risques (`/exposition`)

`ExpositionRisques.tsx` — Analyse de l'exposition globale aux risques du portefeuille.

### 13.2 FAC Saturation (`/fac-saturation`)

`FacSaturation.tsx` — Analyse de la saturation FAC par marché.

### 13.3 Top Brokers (`/top-brokers`)

`TopBrokers.tsx` — Vue consolidée des meilleurs courtiers (alias de `/analyse-courtiers`).

---

## 14. Composants réutilisables (Axe 1)

### 14.1 KPICards

Carte de KPI standardisée :
- `label` : titre
- `value` : valeur principale (large, bold) — toujours en **MAD**
- `sub` / `sublabel` : texte secondaire
- `icon` : icône lucide-react (`Banknote` pour les montants)
- `accent` : couleur (`navy | green | olive | amber | red`)
- Glow effect (ombre colorée via `background` CSS)
- Animation `animate-fade-in` avec `index * 50ms` de délai

### 14.2 ExportButton

```typescript
interface ExportButtonProps {
  markets?: MarketScore[]
  topN?: number
  variant: 'scoring' | 'recommendations' | 'analysis'
}
```

Génère un fichier Excel via `xlsx.writeFile()`.

### 14.3 SortHeader — Tri de tableaux

```typescript
const SortHeader = ({ col, label, align, currentSort, currentDir, onSort }) => (
  <th onClick={() => onSort(col)} className="cursor-pointer group">
    {/* ArrowUp | ArrowDown | ArrowUpDown selon état */}
  </th>
)
// Couleur active : hsl(83,52%,36%) — olive AtlanticRe
```

### 14.4 DataTable

Composant de tableau de données générique avec tri, pagination et export.

### 14.5 DashboardAlerts

Composant d'alertes et signaux de risque affiché dans le Dashboard.

### 14.6 PipelineView

Vue pipeline des affaires en cours, intégrée dans le Dashboard.

---

## 15. Hooks personnalisés (Axe 1)

### 15.1 `useFetch<T>`

```typescript
const { data, loading, error } = useFetch<T>(url, params)
// Refetch automatique quand params change
```

### 15.2 `useData`

```typescript
const { filters, setFilters, filterOptions, scoringCriteria, setScoringCriteria } = useData()
```

### 15.3 `useAuth`

```typescript
const { user, can } = useAuth()
// can('modify_scoring') → boolean
// Rôles : 'admin', 'souscripteur'
```

### 15.4 `useLocalFilters`

```typescript
const lf = useLocalFilters()
// lf.buildParams → Record<string, string> pour l'API
// lf.filters     → état courant des filtres locaux
```

---

## 16. Utilitaires — `formatters.ts`

```typescript
// Formatter MAD (Dirham Marocain) — utilisé dans tout l'Axe 1
export function formatMAD(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} Md MAD`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M MAD`
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)} K MAD`
  return `${value.toLocaleString('fr-FR')} MAD`
}

// Formatter compact (sans unité explicite) 
export function formatCompact(value: number): string { ... }
```

> **Règle** : Utiliser `formatMAD` (ou `fmtMAD` local) **systématiquement** pour tous les montants monétaires de l'Axe 1. L'icône `Banknote` de lucide-react remplace `DollarSign` partout.

---

## 17. Design System (Axe 1)

### 17.1 Palette de couleurs (thème Navy)

```css
--color-navy:       hsl(209, 35%, 16%)     /* Bleu marine principal */
--color-navy-muted: hsla(209,35%,16%,0.08) /* Navy transparent */
--color-off-white:  hsl(210, 20%, 98%)     /* Fond principal */
--color-gray-100:   hsl(218, 22%, 94%)
--color-gray-200:   hsl(218, 22%, 90%)
--color-gray-500:   hsl(218, 14%, 55%)
--color-red:        hsl(358, 66%, 54%)     /* Alertes / ULR élevé */
--color-emerald:    hsl(152, 56%, 39%)     /* Positif / Hausse */

/* Accents scoring */
--olive:            hsl(83, 52%, 36%)      /* Attractif / Succès */
--olive-light:      hsl(83, 50%, 55%)
--orange:           hsl(30, 88%, 56%)      /* Neutre / Attention */
```

### 17.2 Classes utilitaires CSS

```css
.btn-secondary     /* Boutons secondaires gris */
.btn-primary       /* Boutons primaires Navy gradient */
.input-dark        /* Inputs avec focus olive */
.data-table        /* Tables de données standardisées */
.glass-card        /* Cartes avec effet glassmorphism */
.animate-fade-in   /* Apparition progressive */
.animate-slide-up  /* Slide + fade depuis le bas */
```

### 17.3 Scoring badges — color-coding

| Badge | Fond | Texte | Condition |
|---|---|---|---|
| ATTRACTIF | `hsla(83,52%,36%,0.1)` | `hsl(83,52%,36%)` | score ≥ 70 |
| NEUTRE | `hsla(30,88%,56%,0.1)` | `hsl(30,88%,56%)` | 40 ≤ score < 70 |
| A_EVITER | `hsla(358,66%,54%,0.1)` | `hsl(358,66%,54%)` | score < 40 |

---

## 18. Sécurité et authentification

### 18.1 AuthProvider

- JWT stocké en localStorage
- Toutes les routes Axe 1 protégées par `<PrivateRoute>`
- Rôles : `admin` (accès complet) / `souscripteur` (lecture + certaines actions)

### 18.2 Permissions spécifiques

```typescript
can('modify_scoring')      // Modifier critères et seuils du scoring
can('export_data')         // Exporter en Excel
can('view_retrocession')   // Accès pages rétrocession
```

### 18.3 API sécurisée

- `api.ts` : instance Axios avec interceptor JWT automatique
- Header : `Authorization: Bearer <token>`
- 401 → redirect automatique vers `/login`

---

## 19. Points d'attention et contraintes techniques

> **Filtres mixtes** : Le mélange filtres globaux + filtres locaux est critique. Toujours composer `{ ...filtersToParams(filters), ...lf.buildParams }` avant l'appel API.

> **Monnaie MAD** : TOUTES les valeurs monétaires de l'Axe 1 sont en MAD. Utiliser `formatMAD` ou `fmtMAD` local. L'icône `Banknote` (lucide-react) est la norme — ne jamais utiliser `DollarSign`.

> **Scoring** : Les poids doivent sommer à 100% (±1%). Validation côté frontend via `Math.abs(totalWeight - 100) <= 1`. Le backend rejette les requêtes hors-tolérance.

> **Export FAC-to-FAC** : Exporte l'état courant du tri (`sortedDetailBranches` / `sortedPartenaires`), pas les données brutes de l'API.

> **Cibles TTY — Double cap** : `cap_applied` (prime > 10 MDH) ET `triple_cap_applied` (part > 3× actuelle). Les deux sont signalés par 🔒.

> **Code Splitting** : Toutes les pages sont en `React.lazy()`. Ne jamais importer directement dans `App.tsx`.

> **sessionStorage pour comparaison** : `sessionStorage.setItem('compare_market_a', JSON.stringify({ pays, branche }))` — passage de données entre Scoring et Comparaison.

> **Scatter FAC-to-FAC (Crossing)** : Données chargées **une seule fois** au mount, indépendantes des filtres. Endpoint `/fac-to-fac/crossing` sans paramètres.

> **AffairesTraites — Rôles courtiers** : Le filtre de rôle `(Tous | Double Rôle | Apporteur | Placeur)` filtre `courtiersCroise` via `useMemo`. Les apporteurs purs et placeurs purs sont dans des accordions collapsibles séparés du scatter principal.

> **ScrollToTop** : `<ScrollToTop />` dans `App.tsx` effectue `window.scrollTo({ top: 0, behavior: 'instant' })` à chaque changement de route.
