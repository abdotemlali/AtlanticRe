# Plan d'implémentation — Analyse Cédante : Améliorations complètes

> Rédigé le 07/04/2026 · Basé sur l'analyse complète de `CedanteAnalysis.tsx`, `kpis.py` et `pageFilterScopes.ts`

---

## Résumé des modifications demandées

| # | Modification | Déclencheur | Impact |
|---|---|---|---|
| **A** | Badges branches dans l'en-tête | N branches sélectionnées | Frontend uniquement |
| **B** | KPI cards filtrés par branches sélectionnées | N branches sélectionnées | Frontend (déjà filtrés backend si filtre branche actif) |
| **C** | Mix par Branche : % + highlight branches sélectionnées | N branches sélectionnées | Frontend uniquement |
| **D** | Top Branches (Loss Ratio) : logique N sélectionnés + (8-N) complément | N branches sélectionnées | Backend + Frontend |
| **E** | Table Commissions : afficher branches sélectionnées | N branches sélectionnées | Frontend (déjà filtrées backend) |
| **F** | Type SPC : propager le filtre à tous les graphes et KPIs | `type_contrat_spc` actif | `pageFilterScopes.ts` + Backend |

---

## Diagnostic de l'état actuel

### Pourquoi Type SPC ne filtre pas

Dans `pageFilterScopes.ts` ligne 63, le scope `/analyse-cedante` ne liste **pas** `type_contrat_spc` dans ses `keys` :

```typescript
'/analyse-cedante': {
  keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'sous_branche', 'type_of_contract', 'pays_cedante'],
  // ↑ type_contrat_spc est ABSENT → jamais transmis au backend
}
```

Résultat : `getScopedParams` ne génère jamais le paramètre `type_contrat_spc` pour les appels API de cette page. **Correction : ajouter `type_contrat_spc` au scope.**

### Pourquoi les branches sélectionnées ne sont pas "mises en avant"

Quand `filters.branche = ['INCENDIE', 'TRANSPORT']` est actif, `apply_analysis_filters` côté backend n'inclut que ces branches — donc `branchData` (retourné par `cedante/by-branch`) ne contient que ces branches. Il n'y a pas de logique de "highlight" ou "complément top N". Tout est filtré.

### Situation des endpoints backend

- `/kpis/cedante/profile` : **déjà filtré** par `branche`, `type_of_contract`, etc. via `apply_analysis_filters`. Les KPIs reflètent déjà les filtres actifs. **Problème** : `type_contrat_spc` n'est pas transmis (scope manquant) → pas filtré par SPC.
- `/kpis/cedante/by-year` : filtre tous les filtres SAUF l'année (immunisé). Ne filtre pas par `type_contrat_spc` si non transmis.
- `/kpis/cedante/by-branch` : filtré normalement. Si `branche = ['INC', 'TRANS']`, ne retourne que ces 2 branches.

---

## Modification A — Badges branches dans l'en-tête

### Fichier : `frontend/src/pages/CedanteAnalysis.tsx`

### Localisation
En-tête de la fiche cédante, après le badge `type_cedante` (ligne 441) et avant le badge `vieNonVieLabel`.

### Implémentation

Ajouter un bloc conditionnel qui affiche un badge par branche sélectionnée :

```tsx
{/* A — Badges branches sélectionnées */}
{filters.branche.length > 0 && (
  <div className="flex flex-wrap gap-1.5">
    {filters.branche.map((b, i) => (
      <span
        key={b}
        style={{
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          background: `hsla(${(i * 47) % 360},70%,45%,0.15)`,
          border: `1px solid hsla(${(i * 47) % 360},70%,45%,0.4)`,
          color: `hsl(${(i * 47) % 360},60%,40%)`,
        }}
      >
        {b}
      </span>
    ))}
  </div>
)}
```

> **Positionnement** : après le badge `type_cedante` et avant le badge `vieNonVieLabel`, dans le `flex items-center gap-3 flex-wrap` de l'en-tête.

### Points d'attention
- Les badges doivent apparaître **uniquement si `filters.branche.length > 0`**.
- Les couleurs des badges branches doivent être distinctes et cohérentes avec la palette de couleurs du graphe Mix par Branche (voir modification C).
- Utiliser les mêmes 10 couleurs que la constante `COLORS` (lignes 200-211 de `CedanteAnalysis.tsx`) avec `COLORS[i % COLORS.length]` pour la cohérence.

---

## Modification B — KPI cards filtrés par branches sélectionnées

### Diagnostic
Les KPI cards utilisent `profile` (depuis `/kpis/cedante/profile`). Ce profil est déjà calculé sur `df_analysis` qui inclut `apply_analysis_filters` — donc si `filters.branche` contient des branches, le backend les filtre déjà.

**Le problème** : quand `type_contrat_spc` est sélectionné, ce filtre n'est pas transmis (bug scope — couvert par modification F). Une fois la modification F appliquée, les KPIs seront automatiquement corrects pour le filtre Type SPC.

### Implémentation
**Aucune modification backend nécessaire**. La correction est entièrement couverte par la modification F (ajout de `type_contrat_spc` dans le scope de la page).

### Indicateur visuel "vue filtrée"

Le backend retourne déjà `filtered_view: bool` dans le profil. Utiliser ce champ pour afficher un indicateur dans les KPI cards quand une vue partielle est active :

```tsx
{/* Indicateur vue filtrée */}
{profile?.filtered_view && (
  <div className="col-span-full flex items-center gap-1.5 text-[11px] text-amber-600 font-bold py-1">
    <span>🔍</span>
    <span>Vue filtrée — KPIs calculés sur la sélection actuelle</span>
  </div>
)}
```

---

## Modification C — Mix par Branche : pourcentages + highlight branches sélectionnées

### Fichier : `frontend/src/pages/CedanteAnalysis.tsx`

### Localisation
Graphe "Mix par Branche (Primes)" — `RechartsPieChart` (lignes 667-693).

### Changements à apporter

#### C.1 — Ajouter les % dans les segments du Pie Chart

Ajouter la prop `label` au composant `<Pie>` pour afficher les pourcentages, avec la même fonction `renderCustomLabel` que dans `DistributionCharts.tsx` :

```tsx
// Ajouter cette fonction pour les labels %
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700} style={{ pointerEvents: 'none' }}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}
```

Puis modifier le `<Pie>` :
```tsx
<Pie
  data={pieData}
  cx="50%" cy="50%"
  innerRadius={60} outerRadius={90}
  paddingAngle={2}
  dataKey="value"
  labelLine={false}
  label={renderCustomLabel}         // AJOUTÉ
  stroke="none"                     // AJOUTÉ — évite les bordures blanches
>
```

#### C.2 — Logique "figée" : afficher toutes les branches + highlight les sélectionnées

Quand `filters.branche.length > 0`, le graphe doit afficher **toutes les branches de la cédante** (pas seulement les filtrées), avec les branches sélectionnées mises en avant.

**Nouveau fetch nécessaire** : ajouter un fetch `byBranchAllData` sans le filtre `branche` (données immunisées) :

```tsx
// Ajouter un état pour les données ALL branches (immunisées)
const [branchDataAll, setBranchDataAll] = useState<any[]>([])

// Dans useFetch / useEffect, ajouter un fetch immunisé contre le filtre branche
const paramsNoBranch = useMemo(() => {
  if (!selectedCedante) return undefined
  return {
    ...getScopedParams(location.pathname, { ...filters, branche: [], sous_branche: [] }),
    cedante: selectedCedante
  }
}, [selectedCedante, filters, location.pathname])

const { data: branchAllRes } = useFetch<any>(
  selectedCedante ? API_ROUTES.CEDANTE.BY_BRANCH : null,
  paramsNoBranch
)

useEffect(() => {
  if (branchAllRes) setBranchDataAll(branchAllRes)
}, [branchAllRes])
```

**Logique de gel** :

```tsx
const isBranchFilterActive = filters.branche.length > 0

// Source de données pour le Pie : toutes les branches si filtre actif, sinon données filtrées
const pieSourceData = isBranchFilterActive ? branchDataAll : branchData

// Top 8 + Autres pour le Pie
const topBranches = pieSourceData.slice(0, 8)
const otherBranches = pieSourceData.slice(8)
const otherPremium = otherBranches.reduce((sum, b) => sum + (b.total_written_premium || 0), 0)

const pieData = [
  ...topBranches.map(b => ({ name: b.branche, value: b.total_written_premium })),
  ...(otherPremium > 0 ? [{ name: 'Autres', value: otherPremium }] : [])
]
```

**Coloration conditionnelle des cellules** :

```tsx
{pieData.map((entry, index) => {
  const baseColor = COLORS[index % COLORS.length]
  const isSelected = isBranchFilterActive && filters.branche.includes(entry.name)
  const isOthers = entry.name === 'Autres'
  // Si filtre actif : sélectionnées = couleur vive, autres = atténuées
  const fill = isBranchFilterActive
    ? (isSelected || isOthers ? baseColor : `${baseColor}44`)
    : baseColor
  return <PieCell key={`cell-${index}`} fill={fill} />
})}
```

**Badge "Graphe figé"** — ajouter un indicateur dans le titre du graphe :

```tsx
<div className="flex items-center gap-2 mb-4">
  <PieChart size={18} className="text-[var(--color-navy)]" />
  <h3 className="text-sm font-bold text-[var(--color-navy)]">Mix par Branche (Primes)</h3>
  {isBranchFilterActive && (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
      background: 'hsla(43,96%,56%,0.15)', color: 'hsl(43,96%,56%)',
      border: '1px solid hsla(43,96%,56%,0.3)', borderRadius: 99,
    }}>
      🔒 Vue 100% · {filters.branche.length} sélectionnée(s)
    </span>
  )}
</div>
```

---

## Modification D — Top Branches (Loss Ratio) : logique N sélectionnées + (8-N) complément

### Fichier : `frontend/src/pages/CedanteAnalysis.tsx`

### Localisation
Graphe "Top Branches (Loss Ratio)" — `BarChart` (lignes 695-735).

### Architecture de la solution

Même logique que le Top 10 cédantes/courtiers du dashboard :
- Si `filters.branche = ['INC', 'TRANS']` (N=2 sélectionnées) :
  - Afficher les 2 branches sélectionnées (toujours présentes même si pas dans le top 8)
  - Afficher les 8-2=6 meilleures branches **non sélectionnées** (complément)
  - Branches sélectionnées : couleur d'accent (vert `hsl(83,50%,45%)`)
  - Branches complément : couleur ULR conditionnelle (rouge si ULR > 100, orange si > 70, vert sinon)

**Source de données** : utiliser `branchDataAll` (fetch immunisé créé en C.2) qui contient **toutes** les branches.

**Calcul côté frontend** (pas de modification backend nécessaire) :

```tsx
const topBranchesForBar = useMemo(() => {
  if (!isBranchFilterActive || branchDataAll.length === 0) {
    // Comportement original : top 8 des données filtrées colorées par ULR
    return branchData.slice(0, 8).map(b => ({ ...b, is_selected: false }))
  }

  const selectedSet = new Set(filters.branche)
  const selectedBranches = branchDataAll
    .filter(b => selectedSet.has(b.branche))
    .map(b => ({ ...b, is_selected: true }))

  const complementBranches = branchDataAll
    .filter(b => !selectedSet.has(b.branche))
    .slice(0, Math.max(0, 8 - selectedBranches.length))
    .map(b => ({ ...b, is_selected: false }))

  return [...selectedBranches, ...complementBranches]
    .sort((a, b) => b.total_written_premium - a.total_written_premium)
}, [branchData, branchDataAll, filters.branche, isBranchFilterActive])
```

**Coloration des barres** :

```tsx
<Bar dataKey="total_written_premium" radius={[0, 4, 4, 0]}>
  {topBranchesForBar.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={entry.is_selected
        ? 'hsl(83,50%,45%)'        // vert accent pour sélectionnées
        : ulrColor(entry.avg_ulr)  // couleur ULR pour le complément
      }
    />
  ))}
</Bar>
```

**Badge dans le titre** :

```tsx
<h3 className="text-sm font-bold text-[var(--color-navy)]">Top Branches (Loss Ratio)</h3>
{isBranchFilterActive && (
  <span style={{
    fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
    background: 'hsla(83,50%,45%,0.15)', color: 'hsl(83,50%,45%)',
    border: '1px solid hsla(83,50%,45%,0.3)', borderRadius: 99,
  }}>
    {filters.branche.length} mise(s) en avant
  </span>
)}
```

### Points d'attention
- **Ne pas modifier le backend** : toutes les données nécessaires sont disponibles dans `branchDataAll`. La logique est purement frontend.
- Si `filters.branche` contient une branche qui n'existe pas dans `branchDataAll` (branche sans contrats pour cette cédante), elle sera simplement absente — comportement normal.

---

## Modification E — Table Commissions : afficher toutes les branches sélectionnées

### Fichier : `frontend/src/pages/CedanteAnalysis.tsx`

### Diagnostic
La table "Commissions et Taux par Branche" utilise `sortedBranchData` qui vient de `branchData`. Quand N branches sont sélectionnées dans le filtre, `branchData` ne contient que ces N branches (filtré par le backend via `apply_analysis_filters`). Ainsi, la table **affiche déjà uniquement les branches sélectionnées**.

**Il n'y a donc pas de bug ici** — la table est correcte dans ce cas.

**Cependant**, pour être cohérent avec la logique "figée" des graphes, on peut envisager d'afficher dans la table toutes les branches avec les sélectionnées mises en avant visuellement :

```tsx
// Données de la table selon le mode
const tableSourceData = isBranchFilterActive ? branchDataAll : branchData

const sortedBranchData = useMemo(() => {
  return [...tableSourceData].sort((a, b) => {
    const valA = a[sortCol] ?? 0
    const valB = b[sortCol] ?? 0
    if (typeof valA === 'string' && typeof valB === 'string') {
       return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }
    return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
  })
}, [tableSourceData, sortCol, sortDir])
```

**Mise en avant des lignes sélectionnées** dans le rendu `<tbody>` :

```tsx
<tr
  key={i}
  className={`border-b border-[var(--color-gray-100)] last:border-0 transition-colors`}
  style={{
    background: isBranchFilterActive && filters.branche.includes(b.branche)
      ? 'hsla(83,52%,36%,0.06)'   // fond vert léger pour les sélectionnées
      : undefined,
  }}
>
  <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">
    <div className="flex items-center gap-2">
      {isBranchFilterActive && filters.branche.includes(b.branche) && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'hsl(83,52%,36%)' }} />
      )}
      {b.branche}
      {/* Badge FAC saturation existant */}
      {profile?.fac_saturation_alerts?.includes(b.branche) && (
        <span title="Saturation FAC"><AlertTriangle size={14} color="hsl(358,66%,54%)" /></span>
      )}
    </div>
  </td>
  ...
```

---

## Modification F — Type SPC : propager le filtre à tous les graphes et KPIs

### Diagnostic complet

**Problème racine** : `pageFilterScopes.ts` — le scope `/analyse-cedante` ne liste pas `type_contrat_spc` dans ses clés (ligne 63). Donc `getScopedParams` ne génère jamais ce paramètre dans les appels API.

**Conséquence** : tous les appels depuis `CedanteAnalysis.tsx` (`CEDANTE.PROFILE`, `CEDANTE.BY_YEAR`, `CEDANTE.BY_BRANCH`) ne transmettent pas `type_contrat_spc` au backend → `apply_analysis_filters` ne filtre pas par `INT_SPC_TYPE` → aucune donnée ne change quand le filtre Type SPC est actif.

### Étapes d'implémentation

#### F.1 — Ajouter `type_contrat_spc` au scope dans `pageFilterScopes.ts`

```typescript
// AVANT (ligne 60-65)
'/analyse-cedante': {
  label: 'Analyse Cédante',
  keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'sous_branche', 'type_of_contract', 'pays_cedante'],
  excluded: ['cedante'],
},

// APRÈS
'/analyse-cedante': {
  label: 'Analyse Cédante',
  keys: [
    'uw_year_min', 'uw_year_max', 'uw_years',
    'branche', 'sous_branche',
    'type_of_contract',
    'type_contrat_spc',    // AJOUTÉ — FAC / TTY / TTE
    'pays_cedante',
    'perimetre',           // AJOUTÉ — cohérence
  ],
  excluded: ['cedante'],
},
```

**Impact immédiat** : une fois ce changement appliqué, tous les appels API de la page `/analyse-cedante` transmettront `type_contrat_spc` → `apply_analysis_filters` filtrera `df["INT_SPC_TYPE"].isin(params.type_contrat_spc)` → toutes les données (KPIs, évolution historique, branches) refléteront le type SPC sélectionné.

#### F.2 — Vérification backend : `cedante_by_year` et `type_contrat_spc`

Dans `kpis.py`, `cedante_by_year` (ligne 615-643) applique `apply_filters(df, filters)` après avoir **remis l'année à null** (immunisé). `apply_filters` inclut `apply_analysis_filters` qui filtre `type_contrat_spc`. Donc une fois transmis, le filtre sera respecté.

**Cependant** : `cedante_by_year` immunise l'année mais **pas** le type SPC — ce qui est le comportement attendu pour changer la courbe d'évolution selon le type SPC.

#### F.3 — Vérification backend : `cedante/profile` et `type_contrat_spc`

Dans `kpis.py`, `cedante_profile` (lignes 556-612) distingue :
- `df_identity` : filtres identitaires uniquement (immunisé contre type_contrat_spc, branche...)
- `df_analysis` : tous les filtres (ligne 579) — `apply_analysis_filters` filtre bien `type_contrat_spc`

Les KPIs de la fiche sont calculés sur `df_analysis` (lignes 584-590) → correctement filtrés par type_contrat_spc dès que le paramètre est transmis.

**Important** : le badge `fac_saturation_alerts` et le score `branches_actives` sont calculés sur `identity_group_full` (immunisé) → ces indicateurs ne changeront **pas** avec le filtre Type SPC, ce qui est le comportement correct (diversification globale, pas spécifique à un type de contrat).

#### F.4 — Vérification du filtre `params` dans `CedanteAnalysis.tsx`

Les `params` sont construits via :
```tsx
const params = useMemo(() => {
  if (!selectedCedante) return undefined
  return { ...getScopedParams(location.pathname, filters), cedante: selectedCedante }
}, [selectedCedante, filters, location.pathname])
```

Après la modification F.1, `getScopedParams` générera automatiquement `type_contrat_spc=FAC` (par exemple) si ce filtre est actif.

#### F.5 — Gestion du fetch immunisé `paramsNoBranch` (créé en C.2)

Ce fetch doit aussi transmettre `type_contrat_spc` (pour que les données "toutes branches" respectent quand même le type SPC sélectionné) :

```tsx
const paramsNoBranch = useMemo(() => {
  if (!selectedCedante) return undefined
  return {
    // Exclure branche mais garder type_contrat_spc
    ...getScopedParams(location.pathname, { ...filters, branche: [], sous_branche: [] }),
    cedante: selectedCedante
  }
}, [selectedCedante, filters, location.pathname])
```

> Grâce à F.1, `getScopedParams` inclura désormais `type_contrat_spc` dans les params → le fetch immunisé respectera le type SPC.

---

## Récapitulatif des fichiers à modifier

| Fichier | Modifications |
|---|---|
| `frontend/src/utils/pageFilterScopes.ts` | F.1 — Ajouter `type_contrat_spc` et `perimetre` au scope `/analyse-cedante` |
| `frontend/src/pages/CedanteAnalysis.tsx` | A (badges), C (Mix Pie frozen + %  + highlight), D (Top bar logique complément), E (table mise en avant) |
| `backend/routers/kpis.py` | Aucune modification nécessaire |
| `backend/services/data_service.py` | Aucune modification nécessaire |

---

## Ordre d'implémentation recommandé

```
1. F.1 — pageFilterScopes.ts (1 ligne, impact immédiat sur Type SPC)
   → Suffit à corriger tout le comportement Type SPC (KPIs, graphes, évolution, commissions)
   → Tester : sélectionner FAC dans le filtre Type SPC et vérifier que tout change

2. C.2 — Ajouter le fetch immunisé branchDataAll dans CedanteAnalysis.tsx
   → Prérequis pour D et E (et pour le Pie figé de C)

3. C.1 — Ajouter les % dans le Pie Chart Mix par Branche
   → Simple ajout du renderCustomLabel

4. C.2 (suite) — Logique figée dans le Pie Chart
   → Utiliser branchDataAll + coloration conditionnelle + badge frozen

5. D — Top Branches : logique N sélectionnées + (8-N) complément
   → Utiliser branchDataAll + useMemo topBranchesForBar

6. A — Badges branches dans l'en-tête
   → Simple render conditionnel

7. E — Table Commissions mise en avant
   → Utiliser branchDataAll + fond vert pour les sélectionnées

8. B — Vérification visuelle des KPI cards (ajouter indicateur "vue filtrée")
   → Utiliser profile.filtered_view existant
```

---

## Vérification post-implémentation

### Scénarios de test

**Test 1 — Type SPC FAC actif**
- Attendu : KPI cards, évolution historique, Mix Branche, Top Branches, table commissions → tous calculés sur les contrats FAC uniquement
- Avant fix : rien ne change
- Après fix F.1 : tout change

**Test 2 — 2 branches sélectionnées (INCENDIE + TRANSPORT)**
- Attendu :
  - Header : badges "INCENDIE" et "TRANSPORT" visibles
  - Mix Branche : toutes les branches affichées, INCENDIE et TRANSPORT en couleur vive, autres atténuées, % affichés
  - Top Branches : INCENDIE et TRANSPORT en vert, + 6 meilleures autres branches en couleur ULR
  - Table Commissions : toutes les branches, INCENDIE et TRANSPORT sur fond vert léger
  - KPI cards : reflète INCENDIE + TRANSPORT uniquement (déjà filtré par backend)

**Test 3 — FAC + 1 branche sélectionnée**
- Attendu : cumul des deux filtres → données FAC de la branche sélectionnée uniquement

**Test 4 — Aucun filtre actif**
- Attendu : comportement original inchangé (pas de badge frozen, pas de highlight, couleurs ULR normales)
