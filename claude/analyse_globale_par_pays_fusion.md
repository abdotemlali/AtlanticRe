# TÂCHE : Fusion des onglets "Par pays global" + "Par marché" → "Par pays"
## Page : Analyse Globale (`frontend/src/pages/Analysis.tsx`)

---

## CONTEXTE TECHNIQUE ACTUEL

### Structure de `Analysis.tsx` (815 lignes)

La page `Analysis.tsx` gère **deux modes** via l'état local `mode: 'country' | 'market'` :

- **`mode === 'country'`** : onglet "Par pays global" → sélecteur de pays → profil + graphes pour ce pays (toutes branches)
- **`mode === 'market'`** : onglet "Par marché (Pays + Branche)" → 2 sélecteurs (pays + branche) → profil de marché

En plus de ces deux modes, la page comporte en état vide (aucune sélection) un widget `<CrossMarketWidget>` qui affiche un graphe FAC vs Traité par pays.

Il y a également un **filtre local existant** dans `Analysis.tsx` : deux toggles A1 (FAC/Traité) et A2 (Vie/Non-Vie) qui s'appliquent uniquement sur le profil de pays/marché sélectionné. Ces toggles utilisent des types locaux :
```ts
type ContractTypeView = 'ALL' | 'FAC' | 'TREATY'
type VieNonVieViewA = 'ALL' | 'VIE' | 'NON_VIE'
```
Les paramètres envoyés sont `contract_type_view` et `vie_non_vie_view` (attention : pas les mêmes clés que `type_contrat_spc` ou `type_of_contract` du contexte global).

### Endpoints API utilisés par la section "Par pays"

```ts
// constants/api.ts
API_ROUTES.KPIS.BY_COUNTRY      = '/kpis/by-country'      // liste tous les pays avec KPIs
API_ROUTES.COUNTRY.PROFILE      = '/kpis/country/profile'  // profil détaillé d'un pays
API_ROUTES.COUNTRY.BY_YEAR      = '/kpis/country/by-year'  // évolution historique
API_ROUTES.COUNTRY.BY_BRANCH    = '/kpis/country/by-branch' // mix par branche
API_ROUTES.DATA.FILTER_OPTIONS  = '/data/filters/options'   // pour lister les branches disponibles
```

**Query params envoyés par `filtersToParams(filters)`** (depuis `DataContext.tsx`) :
- `uw_year_min`, `uw_year_max`, `uw_years_raw` (années)
- `branche` (si filtre global branche actif)
- `type_of_contract`, `type_contrat_spc`, `pays_risque`, `pays_cedante`, etc.

### Composants visuels existants dans l'onglet "Par pays global" (mode `country`)

1. **WorldMap** (`components/Charts/WorldMap.tsx`) — rendu dans `Dashboard.tsx`, PAS dans `Analysis.tsx` ⚠️
2. **KPI Cards** : 6 cartes (Prime Écrite, Résultat Net, Loss Ratio, Nb Contrats, Part Souscrite, Commission) — inline dans `Analysis.tsx` lignes 584–618
3. **Évolution Historique** : `ComposedChart` (Bar + Line) — lignes 620–668
4. **Mix par Branche** : `PieChart` — lignes 671–705 (masqué en mode `market`)
5. **Top Branches (Loss Ratio)** : `BarChart` horizontal — lignes 707–748 (masqué en mode `market`)
6. **Tableau Commissions et Taux par Branche** — lignes 752–809 (masqué en mode `market`)

> ⚠️ IMPORTANT : Dans `Analysis.tsx`, il n'y a PAS de WorldMap ! La WorldMap est dans `Dashboard.tsx`. La section "Par pays" dans Analysis.tsx est un **profil détaillé** (après sélection d'un pays/marché), pas une carte.

### Pattern filtre local dans `CedanteAnalysis.tsx`

```tsx
// Composant inline dédié au filtre local
function CedantePageFilters({ brancheScope, onBrancheScopeChange, brancheOptions }) {
  const { draftFilters: filters, setDraftFilters: setFilters, filterOptions } = useData()
  // ...
  return (
    <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Filtres de la vue</span>
        {activeCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--color-navy)' }}>{activeCount}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* champs du filtre */}
      </div>
    </div>
  )
}
```

Le filtre local de `CedanteAnalysis` utilise le **contexte global** (`draftFilters`), mais pour "Par pays" nous devons utiliser un **état local** (ne pas polluer le contexte global). Voir section "Filtre local" ci-dessous.

### `filtersToParams()` dans `DataContext.tsx`

```ts
export function filtersToParams(filters: FilterState): Record<string, string> {
  // Construit les query params à partir du FilterState global
  // ...
}
```

La fonction est exportée et utilisable partout. Elle sert de base pour le merge avec les filtres locaux.

---

## MODIFICATIONS À APPORTER

### 1. Supprimer les deux onglets existants, créer un seul onglet "Par pays"

Dans `Analysis.tsx`, supprimer le toggle mode (`country` / `market`) :
```tsx
// À SUPPRIMER — boutons de basculement de mode
<button onClick={() => { setMode('country'); ... }}>Par pays global</button>
<button onClick={() => { setMode('market'); ... }}>Par marché (Pays + Branche)</button>
```

**Remplacer** par un seul mode unifié : le comportement de l'ancien `mode === 'country'`.

- Garder : `selectedPays` (sélecteur de pays)
- Supprimer : `selectedBranche` (ce sera géré par le filtre local)
- Supprimer : `mode` et `setMode`
- Garder : les 6 composants visuels du mode `country` (KPI Cards, Évolution, Mix, Top Branches, Tableau)
- Supprimer : le `CrossMarketWidget` (lié à l'ancien mode market)
- Dans `renderSelectors()`, garder uniquement le sélecteur pays simple (supprimer les 2 selects)

---

### 2. Ajouter un filtre local "Par pays" (état local, ne touche PAS au contexte global)

Créer un état local dans `Analysis.tsx` :

```tsx
// === FILTRE LOCAL "Par pays" ===
// NE PAS mettre ces états dans le DataContext — ils sont locaux à cette section uniquement

// Branches sélectionnées (multi-select local)
const [localBranches, setLocalBranches] = useState<string[]>([])

// FAC / TTY / TTE (type_contrat_spc local)
// Valeurs possibles : [] (tous) | ['FAC'] | ['TTY'] | ['TTE'] | combinaisons
const [localTypeSpc, setLocalTypeSpc] = useState<string[]>([])

// Vie / Non-vie (local)
// Valeurs possibles : 'ALL' | 'VIE' | 'NON_VIE'
const [localVieNonVie, setLocalVieNonVie] = useState<'ALL' | 'VIE' | 'NON_VIE'>('ALL')

// Liste dynamique des branches (peuplée via API selon les filtres globaux)
const [localBrancheOptions, setLocalBrancheOptions] = useState<{ value: string; label: string }[]>([])
```

---

### 3. Composant `AnalyseGlobaleParPaysFilter` (filtre local inline)

Créer un composant **inline dans `Analysis.tsx`** (avant le `export default function Analysis()`), appelé `AnalyseGlobaleParPaysFilter` :

```tsx
interface AnalyseGlobaleParPaysFilterProps {
  localBranches: string[]
  setLocalBranches: (v: string[]) => void
  localTypeSpc: string[]
  setLocalTypeSpc: (v: string[]) => void
  localVieNonVie: 'ALL' | 'VIE' | 'NON_VIE'
  setLocalVieNonVie: (v: 'ALL' | 'VIE' | 'NON_VIE') => void
  brancheOptions: { value: string; label: string }[]
  typeSpcOptions: { value: string; label: string }[]
  onReset: () => void
}
```

**Structure visuelle du filtre** (même style que `CedantePageFilters`) :

```tsx
function AnalyseGlobaleParPaysFilter({ ... }) {
  const activeCount = (localBranches.length > 0 ? 1 : 0) 
    + (localTypeSpc.length > 0 ? 1 : 0) 
    + (localVieNonVie !== 'ALL' ? 1 : 0)

  return (
    <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm px-4 py-3">
      {/* Header avec titre + badge count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
            Filtres — Par pays
          </span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" 
                  style={{ background: 'var(--color-navy)' }}>
              {activeCount}
            </span>
          )}
        </div>
        {/* Bouton reset aligné à droite */}
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs font-bold text-[var(--color-gray-500)] hover:text-[var(--color-navy)] transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Grille de filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Branche (multi-select) */}
        <div>
          <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
            Branche
          </label>
          <Select
            isMulti
            options={brancheOptions}
            {...selectStyles}
            placeholder="Toutes les branches..."
            value={brancheOptions.filter(o => localBranches.includes(o.value))}
            onChange={(v: any) => setLocalBranches(v.map((x: any) => x.value))}
          />
        </div>

        {/* FAC / TTY / TTE (multi-select ou toggle) */}
        <div>
          <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
            FAC / TTY / TTE
          </label>
          <Select
            isMulti
            options={typeSpcOptions}
            {...selectStyles}
            placeholder="Tous..."
            value={typeSpcOptions.filter(o => localTypeSpc.includes(o.value))}
            onChange={(v: any) => setLocalTypeSpc(v.map((x: any) => x.value))}
          />
        </div>

        {/* Vie / Non-vie (toggle buttons) */}
        <div>
          <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
            Vie / Non-vie
          </label>
          <div className="flex items-center gap-2">
            {(['ALL', 'VIE', 'NON_VIE'] as const).map(v => (
              <button
                key={v}
                onClick={() => setLocalVieNonVie(v)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: localVieNonVie === v ? '1.5px solid var(--color-navy)' : '1.5px solid var(--color-gray-200)',
                  background: localVieNonVie === v ? 'var(--color-navy)' : 'white',
                  color: localVieNonVie === v ? 'white' : 'var(--color-gray-500)',
                }}
              >
                {v === 'ALL' ? 'Tous' : v === 'VIE' ? 'Vie' : 'Non-vie'}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
```

---

### 4. Alimentation dynamique de la liste de branches

Dans le composant principal `Analysis()`, ajouter un `useEffect` pour charger les branches dynamiquement depuis l'API selon les filtres globaux actifs :

```tsx
// Charger les options de branches dynamiquement selon les filtres globaux
useEffect(() => {
  api.get(API_ROUTES.DATA.FILTER_OPTIONS, { params: filtersToParams(filters) })
    .then(res => {
      const branches: string[] = res.data?.branc ?? []
      setLocalBrancheOptions(branches.map(b => ({ value: b, label: b })))
    })
    .catch(console.error)
}, [filters])  // se met à jour à chaque changement de filtre global
```

Pour les options FAC/TTY/TTE, utiliser `filterOptions` du contexte :
```tsx
const localTypeSpcOptions = useMemo(() => {
  return (filterOptions?.type_contrat_spc ?? []).map(v => ({ value: v, label: v }))
}, [filterOptions?.type_contrat_spc])
```

---

### 5. Construction des query params finaux (merge filtres globaux + locaux)

```tsx
// Params pour l'onglet "Par pays" : merge filtres globaux + filtres locaux
const countryParams = useMemo(() => {
  const base = filtersToParams(filters)  // filtres globaux (inclut l'année)
  
  // Override/complement avec les filtres locaux — uniquement si valeur non-vide
  if (localBranches.length > 0) {
    base['branche'] = localBranches.join(',')
  }
  if (localTypeSpc.length > 0) {
    base['type_contrat_spc'] = localTypeSpc.join(',')
  }
  if (localVieNonVie !== 'ALL') {
    base['vie_non_vie_view'] = localVieNonVie
  }
  
  return base
}, [filters, localBranches, localTypeSpc, localVieNonVie])
```

**Utiliser `countryParams`** (et non `filtersToParams(filters)` seul) pour tous les appels API de la section "Par pays" :
- `API_ROUTES.KPIS.BY_COUNTRY` (pour charger la liste selectable de pays)
- `API_ROUTES.COUNTRY.PROFILE` (profil du pays)
- `API_ROUTES.COUNTRY.BY_YEAR` (évolution historique)
- `API_ROUTES.COUNTRY.BY_BRANCH` (mix par branche)

---

### 6. Règles d'application des filtres locaux par section

> ⚠️ Les filtres locaux (`localBranches`, `localTypeSpc`, `localVieNonVie`) ne s'appliquent QUE sur la section "Par pays".  
> Ils ne doivent PAS impacter `EvolutionChart`, `DistributionCharts`, ni aucun autre composant du `Dashboard.tsx`.

Dans `Analysis.tsx`, les filtres locaux sont intégrés dans l'état local uniquement (pas dans `DataContext`). Ils sont passés comme paramètres supplémentaires dans les appels API spécifiques à la section "Par pays".

---

### 7. Bouton Réinitialiser

```tsx
const handleResetLocalFilters = () => {
  setLocalBranches([])
  setLocalTypeSpc([])
  setLocalVieNonVie('ALL')
}
```
Le bouton **ne touche pas** au contexte global (`filters` ou `appliedFilters`).

---

### 8. Comportement par défaut vs filtre actif

| Condition | Comportement |
|---|---|
| `localBranches.length === 0` | Affichage toutes branches confondues (comportement identique à l'ancien "Par pays global") |
| `localBranches.length > 0` | Données filtrées sur les branches sélectionnées. Même composants visuels, données différentes |
| `localTypeSpc.length === 0` | Tous types de contrat (FAC + TTY + TTE) |
| `localVieNonVie === 'ALL'` | Vie + Non-vie |

---

### 9. Placement du filtre local dans la page

Le filtre local `<AnalyseGlobaleParPaysFilter>` doit apparaître :
1. **Dans l'état vide** (aucun pays sélectionné) : juste avant le header, sous le sélecteur de pays
2. **Dans l'état avec sélection** (profil affiché) : en haut de page, sticky (si possible), au-dessus des KPI cards

```tsx
// Exemple de placement — état avec sélection
return (
  <div className="space-y-6 animate-fade-in p-2 pb-12">
    {/* Header (sélecteur de pays + boutons) */}
    <div className="... sticky top-0 z-40 ...">
      {/* header du pays sélectionné */}
    </div>
    
    {/* Filtre local — juste après le header */}
    <AnalyseGlobaleParPaysFilter
      localBranches={localBranches}
      setLocalBranches={setLocalBranches}
      localTypeSpc={localTypeSpc}
      setLocalTypeSpc={setLocalTypeSpc}
      localVieNonVie={localVieNonVie}
      setLocalVieNonVie={setLocalVieNonVie}
      brancheOptions={localBrancheOptions}
      typeSpcOptions={localTypeSpcOptions}
      onReset={handleResetLocalFilters}
    />
    
    {/* loading / KPI Cards / Graphes... */}
  </div>
)
```

---

### 10. Mise à jour du `fetchParams` dans `Analysis.tsx`

Remplacer l'actuel `fetchParams` (lignes 262–271) pour qu'il utilise `countryParams` :

```tsx
// AVANT (à remplacer)
const fetchParams = useMemo(() => {
  const p = filtersToParams(filters)
  const extra: Record<string, string> = {}
  if (contractTypeView !== 'ALL') extra.contract_type_view = contractTypeView
  if (vieView !== 'ALL') extra.vie_non_vie_view = vieView

  if (mode === 'country') return { ...p, pays: selectedPays, ...extra }
  if (mode === 'market') return { ...p, pays: selectedPays, branche: selectedBranche, ...extra }
  return undefined
}, [mode, filters, selectedPays, selectedBranche, contractTypeView, vieView])

// APRÈS (nouveau)
const fetchParams = useMemo(() => {
  if (!selectedPays) return undefined
  return { ...countryParams, pays: selectedPays }
}, [countryParams, selectedPays])
```

Supprimer les états `contractTypeView`, `vieView` (remplacés par `localTypeSpc` et `localVieNonVie`).

---

### 11. Mise à jour du chargement de la liste de pays

```tsx
// AVANT
useEffect(() => {
  if (mode === 'country' || mode === 'market') {
    const extraParams: Record<string, string> = {}
    if (contractTypeView !== 'ALL') extraParams.contract_type_view = contractTypeView
    if (vieView !== 'ALL') extraParams.vie_non_vie_view = vieView
    api.get(API_ROUTES.KPIS.BY_COUNTRY, { params: { ...filtersToParams(filters), ...extraParams } }).then(...)
  }
}, [mode, filters, contractTypeView, vieView])

// APRÈS — plus de mode, plus de contractTypeView/vieView
useEffect(() => {
  api.get(API_ROUTES.KPIS.BY_COUNTRY, { params: countryParams }).then(res => {
    if (res.data) {
      setCountryOptions(res.data.map((c: any) => ({ value: c.pays, label: c.pays })))
    }
  }).catch(console.error)
}, [countryParams])
```

---

### 12. Ce qu'il faut supprimer de `Analysis.tsx`

- [ ] L'état `mode: 'country' | 'market'` et `setMode`
- [ ] L'état `selectedBranche` et `setSelectedBranche`
- [ ] L'état `contractTypeView` et `vieView` (remplacés par `localTypeSpc` et `localVieNonVie`)
- [ ] Les types `ContractTypeView` et `VieNonVieViewA` (les remplacer par des types inline si nécessaire)
- [ ] Le composant `<CrossMarketWidget>` (et sa définition)
- [ ] Les imports liés : `MapPin` (plus nécessaire), `GitCompare` (vérifier si encore utilisé)
- [ ] L'état `marketOptions` et `setMarketOptions`
- [ ] Le `useEffect` de chargement des `marketOptions`
- [ ] La logique `mode === 'market'` dans `fetchUrl`, `fetchParams`, `handleVoirContrats`, `handleComparer`
- [ ] Le `renderSelectors()` pour le mode market (garder uniquement le select pays simple)
- [ ] Les boutons de toggle mode dans l'UI (les deux `<button>` "Par pays global" et "Par marché")
- [ ] Les toggles A1/A2 inline (remplacés par le composant filtre local)

---

### 13. Ce qu'il ne faut PAS toucher

- `WorldMap.tsx` : elle est dans `Dashboard.tsx`, pas dans `Analysis.tsx` — aucune modification nécessaire
- `DataContext.tsx` : ne pas modifier le contexte global
- `FilterPanel.tsx` : ne pas modifier le filtre global
- `pageFilterScopes.ts` : pas de scope `/analyse` défini actuellement, ne pas en créer un
- `Dashboard.tsx` : ne pas modifier
- Les autres pages (`CedanteAnalysis.tsx`, `Comparison.tsx`, etc.)

---

### 14. États restants après refactoring

```tsx
// États conservés / nouveaux
const [selectedPays, setSelectedPays] = useState<string | null>(null)
const [profile, setProfile] = useState<AnalysisProfile | null>(null)
const [yearData, setYearData] = useState<any[]>([])
const [branchData, setBranchData] = useState<any[]>([])
const [loading, setLoading] = useState(false)
const [sortCol, setSortCol] = useState<string>('total_written_premium')
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([])

// Nouveaux états locaux pour le filtre
const [localBranches, setLocalBranches] = useState<string[]>([])
const [localTypeSpc, setLocalTypeSpc] = useState<string[]>([])
const [localVieNonVie, setLocalVieNonVie] = useState<'ALL' | 'VIE' | 'NON_VIE'>('ALL')
const [localBrancheOptions, setLocalBrancheOptions] = useState<{ value: string; label: string }[]>([])
```

---

### 15. Imports à ajouter dans `Analysis.tsx`

```tsx
import { SlidersHorizontal } from 'lucide-react'  // pour le filtre panel
// (Select est déjà importé depuis react-select)
```

---

### 16. Résumé des fichiers impactés

| Fichier | Modifications |
|---|---|
| `frontend/src/pages/Analysis.tsx` | ✅ Refactoring complet selon spécifications ci-dessus |
| `frontend/src/components/Charts/WorldMap.tsx` | ❌ Aucune modification |
| `frontend/src/context/DataContext.tsx` | ❌ Aucune modification |
| `frontend/src/constants/api.ts` | ❌ Aucune modification (tous les endpoints nécessaires existent déjà) |
| `frontend/src/utils/pageFilterScopes.ts` | ❌ Aucune modification |
| `frontend/src/pages/Dashboard.tsx` | ❌ Aucune modification |

---

### 17. Exemple de flux complet

1. Utilisateur arrive sur `/analyse` (anciennement Analyse Globale)
2. La page affiche : **sélecteur de pays** + **filtre local "Par pays"** (vide) + état vide
3. Utilisateur sélectionne "MAROC" → profil pays chargé avec `countryParams` (filtres globaux + filtres locaux vides = toutes branches)
4. Utilisateur sélectionne "INCENDIE" dans le filtre local Branche → re-fetch avec `{ ...filtersGlobaux, branche: 'INCENDIE', pays: 'MAROC' }` → les KPIs, mix, Top Branches se mettent à jour
5. Utilisateur clique Réinitialiser → `localBranches = []`, re-fetch avec filtres globaux seuls
6. Les sections **EvolutionChart** et **DistributionCharts** du `Dashboard.tsx` ne sont PAS affectées

---

### 18. Notes sur le `getTitle()` et `getSubtitle()` après refactoring

```tsx
// APRÈS (simplifiés, plus de mode market)
const getTitle = () => selectedPays || ''
const getSubtitle = () => {
  const parts = []
  if (localBranches.length === 1) parts.push(localBranches[0])
  else if (localBranches.length > 1) parts.push(`${localBranches.length} branches`)
  if (localTypeSpc.length > 0) parts.push(localTypeSpc.join(', '))
  if (localVieNonVie !== 'ALL') parts.push(localVieNonVie === 'VIE' ? 'Vie' : 'Non-vie')
  return parts.length > 0 ? parts.join(' · ') : 'Analyse globale du pays'
}

const getEmptyMessage = () => 'Sélectionnez un pays pour afficher son analyse'
const getEmptyIcon = () => <Globe size={64} className="mb-4 text-[var(--color-gray-400)]" />
```

---

### 19. Point d'attention — `handleVoirContrats` et `handleComparer`

Ces deux handlers naviguent vers d'autres pages. Après refactoring :

```tsx
const handleVoirContrats = () => {
  if (selectedPays) {
    const newFilters: Partial<FilterState> = { pays_risque: [selectedPays] }
    if (localBranches.length > 0) newFilters.branche = localBranches
    setFilters((f: any) => ({ ...f, ...newFilters }))
  }
  sessionStorage.setItem('dashboard_tab', 'contrats')
  navigate('/')
}

const handleComparer = () => {
  if (selectedPays) {
    sessionStorage.setItem('compare_country_a', JSON.stringify({ pays: selectedPays }))
    navigate('/comparaison')
  }
}
```

---

### 20. Vérification finale

Après implémentation, vérifier :

1. ✅ Onglet "Par pays global" et "Par marché" supprimés
2. ✅ Un seul onglet (ou page) "Par pays" avec sélecteur de pays
3. ✅ Filtre local visible avec 3 champs : Branche, FAC/TTY/TTE, Vie/Non-vie
4. ✅ Bouton Réinitialiser visible uniquement si au moins 1 filtre local actif, aligné à droite
5. ✅ Sans filtre local → comportement identique à l'ancien "Par pays global"
6. ✅ Avec branche sélectionnée → données filtrées, mêmes composants visuels
7. ✅ La liste de branches se met à jour dynamiquement à chaque changement de filtre global
8. ✅ Le filtre global (année, etc.) s'applique normalement sur cette section
9. ✅ Les autres sections (Dashboard, Évolution, Mix) ne sont PAS impactées par les filtres locaux
10. ✅ La page fonctionne sans erreur TypeScript
