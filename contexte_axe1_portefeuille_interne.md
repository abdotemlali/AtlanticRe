# Contexte Axe 1 — Portefeuille Interne (AtlanticRe)

> **Document de référence exhaustif — Axe 1**  
> Version : Avril 2026 | Généré à partir du code source  
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

─── Axe 1 (Dashboard opérationnel) ───────────────────────
/dashboard                → Dashboard.tsx
/analyse                  → Analysis.tsx (Analyse Cédantes)
/analyse-courtiers        → BrokerAnalysis.tsx
/selection                → MarketSelection.tsx (Scoring marché)
/comparaison              → Comparaison.tsx

─── Axe 1 — Rétrocession ──────────────────────────────────
/retrocession/traites     → AffairesTraites.tsx
/retrocession/cibles-tty  → TargetShare.tsx
/retrocession/fac-to-fac  → FacToFac.tsx
/retrocession/securites   → Securities.tsx
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

---

## 3. Page : Dashboard (`/dashboard`)

### 3.1 Description fonctionnelle

Page d'accueil opérationnelle de l'Axe 1. Donne une vue panoramique du portefeuille AtlanticRe avec indicateurs de performance clés.

### 3.2 Composants inclus

| Composant | Rôle |
|---|---|
| `FilterPanel` | Filtres globaux persistants |
| `KPICards` | 4 cartes de KPI haut de page |
| `WorldMap` | Carte mondiale choroplèthe |
| `EvolutionChart` | Courbe d'évolution temporelle des primes |
| `DistributionChart` | Répartition par branche |
| `PerformanceChart` | S/P par pays ou branche |

### 3.3 KPIs affichés

1. **Prime totale souscrite** — Somme des `written_premium` filtrés
2. **Résultat net** — Somme des `resultat` filtrés
3. **ULR moyen** — Ratio sinistres/primes pondéré
4. **Nombre de contrats** — Count des affaires filtrées

### 3.4 Graphiques

- **WorldMap** : Choroplèthe mondiale, couleur = volume de primes par pays, hover = tooltip détaillé
- **EvolutionChart** : Stacked area ou line par année de souscription
- **DistributionChart** : BarChart horizontal – répartition % par branche
- **PerformanceChart** : Scatter ou BarChart – ULR par pays (top 20)

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

### 4.3 Sections de la page

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

### 4.4 API Endpoints

```
GET /analyse/pays-profil?pays=XX&...
GET /analyse/branche-detail?branche=XX&...
GET /analyse/cedante-profil?cedante=XX&...
```

### 4.5 Composants spécifiques

- `FilterPanel` global + `LocalFilterPanel`
- `ExportButton` — export Excel du tableau courant
- Tableaux triables avec `SortHeader` (ASC/DESC par colonne)

---

## 5. Page : Analyse Courtiers (`/analyse-courtiers`)

### 5.1 Description fonctionnelle

`BrokerAnalysis.tsx` — Analyse dédiée aux courtiers (intermédiaires entre AtlanticRe et les cédantes).

### 5.2 Métriques affichées

| Métrique | Description |
|---|---|
| Volume de primes | Somme des primes via ce courtier |
| ULR moyen | Performance technique du portefeuille apporté |
| Nombre de cédantes | Diversification |
| Résultat net contribué | Impact sur le bottom-line |
| Répartition géographique | Pays couverts |

### 5.3 Visualisations

- **Top 10 courtiers par primes** : BarChart horizontal
- **Scatter courtiers** : X=Volume, Y=ULR → identification attractifs vs à risque
- **Timeline** : Évolution temporelle par courtier sélectionné
- **Tableau détail** : Tri sur toutes colonnes, export Excel

### 5.4 Filtres disponibles

- Année de souscription (multi)
- Branche (multi)
- Pays (multi)
- Toggle Vie/Non-Vie

---

## 6. Page : Scoring Marché (`/selection`)

### 6.1 Description fonctionnelle

`MarketSelection.tsx` — Module de **scoring multicritère dynamique** des marchés (Pays × Branche). Permet à l'équipe de souscription d'identifier les marchés attractifs.

### 6.2 Architecture de la page

Deux zones :
1. **Sidebar gauche (360px)** — sticky, configuration des critères
2. **Zone droite** — résultats du scoring

### 6.3 Critères de scoring par défaut

```typescript
const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'ulr',             label: 'Loss Ratio (ULR)',       weight: 40, threshold: 70,     direction: 'lower_is_better'  },
  { key: 'written_premium', label: 'Prime écrite (volume)',  weight: 25, threshold: 100000, direction: 'higher_is_better' },
  { key: 'resultat',        label: 'Résultat net',           weight: 20, threshold: 0,      direction: 'higher_is_better' },
  { key: 'commi',           label: 'Taux de commission',     weight: 10, threshold: 35,     direction: 'lower_is_better'  },
  { key: 'share_written',   label: 'Part souscrite (Share)', weight: 5,  threshold: 5,      direction: 'higher_is_better' },
]
```

### 6.4 Interface de configuration

Pour chaque critère :
- **Poids (%)** — input numérique, somme doit = 100%
- **Seuil cible** — valeur de référence
- **Direction** — `↓ Min` ou `↑ Max`

**Jauge de validation** : barre rouge/verte selon `Σ poids = 100%` (tolérance ±1%).

### 6.5 Calcul du scoring

Envoyé au backend :
```typescript
POST /scoring/compute
Body: { filters: params, criteria: Criterion[] }
Response: { markets: MarketScore[] }
```

### 6.6 Données retournées par marché

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

### 6.7 Score badges

| Badge | Condition | Couleur |
|---|---|---|
| ATTRACTIF | score ≥ 70 | `hsl(83,52%,36%)` — vert olive |
| NEUTRE | 40 ≤ score < 70 | `hsl(30,88%,56%)` — orange |
| À ÉVITER | score < 40 | `hsl(358,66%,54%)` — rouge |

### 6.8 Tableau de résultats

Colonnes triables : `# | Pays | Branche | Score Global | Recommandation | Prime écrite | LR% | Résultat | Commission | Share% | Contrats | Comparer`

- Colonne Score : badge coloré + barre de progression de fond
- Colonne ULR : coloration conditionnelle (vert < 70%, orange 70-100%, rouge > 100%)
- Colonne Résultat : vert si ≥ 0, rouge si < 0
- Bouton **Comparer** : navigate vers `/comparaison` avec `sessionStorage.setItem('compare_market_a', JSON.stringify({pays, branche}))`

### 6.9 Filtres de résultats

- Filtre badge : `Tous | Attractifs | Neutres | À éviter`
- Top N : input numérique (5-50)
- `ExportButton` : export Excel avec `variant="recommendations"`

### 6.10 Sauvegarde des seuils

```typescript
PUT /scoring/defaults   → Body: { criteria }
GET /scoring/defaults   → Lecture des seuils enregistrés
```

Accès conditionné par `can('modify_scoring')`.

---

## 7. Page : Comparaison Marchés (`/comparaison`)

### 7.1 Description fonctionnelle

`Comparaison.tsx` — Outil de comparaison côte-à-côte de deux marchés (Pays × Branche). Pré-rempli depuis le scoring (via `sessionStorage`).

### 7.2 Fonctionnalités

- Sélection de deux marchés A et B
- Comparaison des métriques : primes, ULR, résultat, commission, share, nb contrats
- Graphique radar ou bar grouped
- Historique temporel des deux marchés en superposition

---

## 8. Page : Affaires Traitées (`/retrocession/traites`)

### 8.1 Description fonctionnelle

`AffairesTraites.tsx` — Module de **pilotage de la rétrocession en traité (TTY)**. Analyse les placements des traités auprès des sécurités (réassureurs preneurs).

### 8.2 Sections de la page

**Section 1 : Vue d'ensemble**
- KPIs : EPI 100% total, PMD total, Taux de placement global, Nb traités actifs
- BarChart empilé Placé vs Non-placé par branche

**Section 2 : Tableau des traités**
Colonnes : `N° traité | Cédante | Branche | EPI 100% | PMD | Taux de Plac.% | Statut placement`
- Tri multi-colonnes, export Excel

**Section 3 : Courtiers de rétrocession**
- `Courtier | Volume PMD | Nb traités | Taux moyen placement`

**Section 4 : Sécurités (réassureurs preneurs)**
- `Nom | Rating | Quote-part | PMD total | Nb traités`

### 8.3 Taux de placement

**Formule** : `Taux de Plac.% = PMD / EPI 100%`

### 8.4 Filtres disponibles

`LocalFilterPanel` avec : années, branches, type contrat, vie/non-vie, cédante, courtier, pays.

### 8.5 API Endpoints

```
GET /retrocession/traites/overview
GET /retrocession/traites/detail
GET /retrocession/courtiers
GET /retrocession/securites
```

---

## 9. Page : Cibles TTY (`/retrocession/cibles-tty`)

### 9.1 Description fonctionnelle

`TargetShare.tsx` — Module de **calcul des parts cibles** sur les traités TTY. Calcule pour chaque traité une part-cible optimale basée sur des règles d'ajustement paramétrables.

### 9.2 Structure de la page

```
[FilterPanel Local]
[Panneau Ajustements — collapsible]
[Header + KPI Cards]
[Pills de filtre : Stable | Baisse | Hausse | Tous]
[Tableau détail avec expand-row — pagination 25/page]
[Charts : Top 15 + Scatter part actuelle vs cible]
```

### 9.3 Système d'ajustements paramétrables

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

**Barre collapsible** : `Settings2` icon → expand/collapse. Badge "Personnalisés" si les valeurs diffèrent des défauts.

### 9.4 KPI Cards

| KPI | Couleur | Description |
|---|---|---|
| Traités TTY | Navy | Nombre de contrats analysés |
| Potentiel Additionnel | Emerald | Gain potentiel total (MAD) |
| Traités en Hausse | Olive | Count badge = HAUSSE |
| Au Cap 10 MDH | Orange | Plafonds atteints |

### 9.5 Classification des traités

| Badge | Icône | Condition |
|---|---|---|
| HAUSSE | 📈 | Part cible > Part actuelle |
| STABLE | ⏸ | Part cible ≈ Part actuelle |
| BAISSE | 📉 | Part cible < Part actuelle |

### 9.6 Tableau détail — colonnes

`Cédante | Pays | Branche | Part actuelle | ULR | LOB | Ajust. | [expand]`

**Ligne expandable** (clic sur la ligne → expand-row) :
- Part Cible (avec 🔒 si cap atteint)
- Prime Actuelle (MAD)
- Prime Cible (MAD)
- Potentiel Additionnel (MAD) — vert si positif, rouge si négatif

**Tooltip ajustement** : survol cellule Ajust. → `ULR < X% : +N | LOB ≥ Y : +N | Part < Z% : +N | ULR > W% : -N → brut: N → net: N`

### 9.7 Recherche et pagination

- SearchBar : debounce 300ms, recherche par cédante/branche/pays
- Pagination serveur : 25 lignes/page, boutons Précédent/Suivant
- Reset page automatique si filtre/recherche/pill change

### 9.8 Graphiques

- **Top 15** : BarChart horizontal – top 15 par potentiel additionnel (filtré par pill)
- **Scatter** : X=Part actuelle, Y=Part cible, ligne de référence Y=X (points au-dessus = hausse)

### 9.9 Export Excel

```typescript
// Bypass pagination : export complet
GET /retrocession/cibles-tty?export=true&pill=XX&...
// Fichier : cibles_tty_{pill}.xlsx
// Colonnes : Cédante, Pays, Branche, Tendance, Part Actuelle (%),
//            ULR (%), LOB, Ajustement, Part Cible (%), Prime Actuelle,
//            Prime Cible, Potentiel Additionnel
```

### 9.10 API Endpoint

```
GET /retrocession/cibles-tty
Params: page, page_size, pill, search, sort_by, sort_desc,
        ulr_low_threshold, ulr_low_bonus, lob_threshold, lob_bonus,
        low_share_threshold, low_share_bonus, ulr_high_threshold,
        ulr_high_malus, max_increase_per_renewal, max_multiple, cap_mdh
Response: {
  data: TargetShareRow[],
  summary: TargetShareSummary,
  scatter: any[],
  top15: any[],
  total_items: number
}
```

---

## 10. Page : FAC-à-FAC (`/retrocession/fac-to-fac`)

### 10.1 Description fonctionnelle

`FacToFac.tsx` — Analyse de la **rétrocession facultative (FAC to FAC)**. Analyse les partenaires FAC : réassureurs qui participent aux affaires facultatives.

### 10.2 Architecture : Double vue en onglets

```
[Tab "Vue Globale"]       → Analyse agrégée par branche
[Tab "Vue Par Partenaire"] → Analyse individuelle par partenaire
```

### 10.3 Filtres spécifiques (panel interne, non-global)

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

### 10.4 KPI Cards (communes aux deux vues)

| KPI | Couleur | Description |
|---|---|---|
| Engagement Partenaire Total | Rouge | Exposition max en capital (MAD) |
| Prime Partenaire Totale | Olive | Prime nette revenant aux partenaires |
| Moyenne Part Partenaire | Orange | Quote-part effective moyenne (%) |
| Prime Atlantic Re Totale | Bleu | Prime brute souscrite |
| Nombre de Partenaires | Navy | Partenaires preneurs distincts |

### 10.5 Vue Globale

**Graphique 1 : Évolution des Primes Partenaire par Année**
- LineChart : `prime_partenaire` (olive, trait plein) + `engagement_partenaire` (rouge, pointillés)
- Filtré sans UY pour montrer toute la série temporelle

**Graphique 2 : Primes Partenaire par Branche**
- BarChart horizontal
- Highlight visuel : barres des branches non-LOB à opacity 0.25

**Tableau : Détail par Branche**
- Colonnes triables : `Branche | Nb Contrats | Prime Atlantic Re | Prime Partenaire | Engagement Partenaire | Part Moy (%)`
- Lignes highlights si branche filtrée (fond ambre)
- Export Excel : `fac_to_fac_detail_branches.xlsx`

### 10.6 Vue Par Partenaire

**Graphique 1 : Scatter — Croisement Donneurs × Preneurs**
- Entreprises à **double rôle** : cèdent des affaires à AtlanticRe ET prennent de la rétrocession
- X=Prime Donnée à Atlantic Re (MAD), Y=Prime Reçue d'Atlantic Re (MAD)
- Taille bulle = Engagement Total (normalisé 8-40px, `ZAxis range [64, 1600]`)
- Tooltip personnalisé : Prime Donnée, Prime Reçue, Engagement Total, Contrats donnés/reçus
- Chargé **une seule fois** au mount (endpoint sans filtres)

**Graphiques 2-3 : Top 10 Partenaires**
- Top Primes : BarChart horizontal, olive
- Top Engagement : BarChart horizontal, rouge

**Graphique 4 : Taux de Part Moyen par Partenaire**
- BarChart horizontal, orange

**Tableau : Tableau des Partenaires**
- Filtre de rôle en pills : `Tous | Double Rôle | Donneur | Preneur`
- Colonnes triables : `Partenaire | Contrats | Prime Part. | Engagement Part. | Part Moy | Rôle | Prime Donnée`
- Badges de rôle : Double Rôle (olive) / Donneur (amber) / Preneur (bleu)
- Export Excel : `fac_to_fac_partenaires.xlsx`

### 10.7 API Endpoints FAC-to-FAC

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

## 11. Page : Sécurités (`/retrocession/securites`)

### 11.1 Description fonctionnelle

`Securities.tsx` — Vue exhaustive des réassureurs preneurs avec leur rating et exposition.

### 11.2 Fonctionnalités

- Tableau de toutes les sécurités
- Colonnes : `Nom | Rating | Type | Share moyen | PMD | Nb traités`
- Filtre **Rating ≥ A** : inclut A-, A, A+, A++ ; exclut B et inférieur
- Export Excel

---

## 12. Composants réutilisables (Axe 1)

### 12.1 KPICard / KpiCard

Carte de KPI standardisée :
- `label` : titre
- `value` : valeur principale (large, bold)
- `sub` / `sublabel` : texte secondaire
- `icon` : icône lucide-react
- `accent` : couleur (`navy | green | olive | amber | red`)
- Glow effect (ombre colorée via `background` CSS)
- Animation `animate-fade-in` avec `index * 50ms` de délai

### 12.2 ExportButton

```typescript
interface ExportButtonProps {
  markets?: MarketScore[]
  topN?: number
  variant: 'scoring' | 'recommendations' | 'analysis'
}
```

Génère un fichier Excel via `xlsx.writeFile()`.

### 12.3 SortHeader — Tri de tableaux

```typescript
const SortHeader = ({ col, label, align, currentSort, currentDir, onSort }) => (
  <th onClick={() => onSort(col)} className="cursor-pointer group">
    {/* ArrowUp | ArrowDown | ArrowUpDown selon état */}
  </th>
)
// Couleur active : hsl(83,52%,36%) — olive AtlanticRe
```

### 12.4 ChartSkeleton

Skeleton de chargement des graphiques affiché pendant `loading = true`.

---

## 13. Hooks personnalisés (Axe 1)

### 13.1 `useFetch<T>`

```typescript
const { data, loading, error } = useFetch<T>(url, params)
// Refetch automatique quand params change
```

### 13.2 `useData`

```typescript
const { filters, setFilters, filterOptions, scoringCriteria, setScoringCriteria } = useData()
```

### 13.3 `useAuth`

```typescript
const { user, can } = useAuth()
// can('modify_scoring') → boolean
// Rôles : 'admin', 'souscripteur'
```

### 13.4 `useLocalFilters`

```typescript
const lf = useLocalFilters()
// lf.buildParams → Record<string, string> pour l'API
// lf.filters     → état courant des filtres locaux
```

---

## 14. Design System (Axe 1)

### 14.1 Palette de couleurs (thème Navy)

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

### 14.2 Classes utilitaires CSS

```css
.btn-secondary     /* Boutons secondaires gris */
.btn-primary       /* Boutons primaires Navy gradient */
.input-dark        /* Inputs avec focus olive */
.data-table        /* Tables de données standardisées */
.glass-card        /* Cartes avec effet glassmorphism */
.animate-fade-in   /* Apparition progressive */
.animate-slide-up  /* Slide + fade depuis le bas */
```

### 14.3 Scoring badges — color-coding

| Badge | Fond | Texte | Condition |
|---|---|---|---|
| ATTRACTIF | `hsla(83,52%,36%,0.1)` | `hsl(83,52%,36%)` | score ≥ 70 |
| NEUTRE | `hsla(30,88%,56%,0.1)` | `hsl(30,88%,56%)` | 40 ≤ score < 70 |
| A_EVITER | `hsla(358,66%,54%,0.1)` | `hsl(358,66%,54%)` | score < 40 |

---

## 15. Sécurité et authentification

### 15.1 AuthProvider

- JWT stocké en localStorage
- Toutes les routes Axe 1 protégées par `<PrivateRoute>`
- Rôles : `admin` (accès complet) / `souscripteur` (lecture + certaines actions)

### 15.2 Permissions spécifiques

```typescript
can('modify_scoring')      // Modifier critères et seuils du scoring
can('export_data')         // Exporter en Excel
can('view_retrocession')   // Accès pages rétrocession
```

### 15.3 API sécurisée

- `api.ts` : instance Axios avec interceptor JWT automatique
- Header : `Authorization: Bearer <token>`
- 401 → redirect automatique vers `/login`

---

## 16. Points d'attention et contraintes techniques

> **Filtres mixtes** : Le mélange filtres globaux + filtres locaux est critique. Toujours composer `{ ...filtersToParams(filters), ...lf.buildParams }` avant l'appel API.

> **Scoring** : Les poids doivent sommer à 100% (±1%). Validation côté frontend via `Math.abs(totalWeight - 100) <= 1`. Le backend rejette les requêtes hors-tolérance.

> **Export FAC-to-FAC** : Exporte l'état courant du tri (`sortedDetailBranches` / `sortedPartenaires`), pas les données brutes de l'API.

> **Cibles TTY — Double cap** : `cap_applied` (prime > 10 MDH) ET `triple_cap_applied` (part > 3× actuelle). Les deux sont signalés par 🔒.

> **Code Splitting** : Toutes les pages sont en `React.lazy()`. Ne jamais importer directement dans `App.tsx`.

> **sessionStorage pour comparaison** : `sessionStorage.setItem('compare_market_a', JSON.stringify({ pays, branche }))` — passage de données entre Scoring et Comparaison.

> **Scatter FAC-to-FAC (Crossing)** : Données chargées **une seule fois** au mount, indépendantes des filtres. Endpoint `/fac-to-fac/crossing` sans paramètres.
