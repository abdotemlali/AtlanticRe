# Plan d'implémentation — Améliorations du tableau de bord AtlanticRe

> Généré le 07/04/2026 · Basé sur l'analyse complète du frontend (React/TypeScript) et du backend (FastAPI/Python)

---

## Table des matières

1. [Zoom +/- sur la carte mondiale](#1-zoom--sur-la-carte-mondiale)
2. [Bug "Autres" dans Répartition par branche](#2-bug-autres-dans-répartition-par-branche)
3. [Logique "graphe figé + indication visuelle"](#3-logique-graphe-figé--indication-visuelle-pour-les-graphes-de-répartition)
4. [Ajout graphe "Répartition par spécialité"](#4-ajout-graphe-répartition-par-spécialité)
5. [Supprimer les tabs Tous/Facultatif/Traité dans Top 10 cédantes](#5-supprimer-les-tabs-tousfacultatiftraité-dans-top-10-cédantes)
6. [Feature(s) vs Top 10 cédantes](#6-features-vs-top-10-cédantes)
7. [Feature(s) vs Top 10 courtiers](#7-features-vs-top-10-courtiers)
8. [Marchés en alerte dépendant de l'année filtrée](#8-marchés-en-alerte-dépendant-de-lannée-filtrée)
9. [Ordre d'implémentation recommandé](#ordre-dimplémentation-recommandé)

---

## 1. Zoom +/- sur la carte mondiale

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/WorldMap.tsx`

### Analyse de l'existant
- La carte utilise **`react-simple-maps`** (import ligne 2 : `ComposableMap`, `Geographies`, `Geography`, `ZoomableGroup`).
- `ZoomableGroup` est déjà importé et utilisé (ligne 172), mais aucun `zoom` ni `center` ne lui est passé en props — il utilise ses valeurs par défaut.
- `ZoomableGroup` accepte nativement les props : `zoom` (nombre), `center` ([lng, lat]), `minZoom`, `maxZoom`, `onMoveEnd` (callback qui reçoit `{ x, y, zoom, translation }`).
- La légende est positionnée en `bottom-3 left-3` (ligne 249). Le bas à droite (`bottom-3 right-3`) est libre.
- L'état `zoom` à gérer est un `useState<number>` local dans `WorldMap`.

### Étapes d'implémentation

1. **Ajouter l'état de zoom** dans `WorldMap` :
   ```tsx
   const [zoom, setZoom] = useState<number>(1)
   const MIN_ZOOM = 1
   const MAX_ZOOM = 8
   ```

2. **Passer `zoom` à `ZoomableGroup`** :
   ```tsx
   <ZoomableGroup zoom={zoom} center={[20, 15]}>
   ```
   > Attention : le `center` doit être sorti de `projectionConfig` et passé directement à `ZoomableGroup` pour que le zoom soit cohérent.

3. **Ajouter les boutons Zoom+ / Zoom-** positionnés en `absolute bottom-3 right-3` dans le `div` conteneur :
   ```tsx
   <div className="absolute bottom-3 right-3 flex flex-col gap-1">
     <button
       onClick={() => setZoom(z => Math.min(z + 0.5, MAX_ZOOM))}
       style={{ /* style glass cohérent avec le reste */ }}
       title="Zoom +"
     >+</button>
     <button
       onClick={() => setZoom(z => Math.max(z - 0.5, MIN_ZOOM))}
       style={{ /* style glass */ }}
       title="Zoom -"
     >−</button>
   </div>
   ```

4. **(Optionnel) Gérer le callback `onMoveEnd`** pour synchroniser le zoom si l'utilisateur utilise la molette de souris :
   ```tsx
   <ZoomableGroup
     zoom={zoom}
     center={[20, 15]}
     onMoveEnd={({ zoom: newZoom }) => setZoom(newZoom)}
   >
   ```

5. **Style des boutons** : utiliser le même style `glass` que les tooltips existants (`hsla(209,28%,18%,0.92)`, border, backdrop-filter, border-radius 8px, largeur fixe 28px×28px, `font-weight: 700`).

### Points d'attention
- `ZoomableGroup` gère déjà le zoom à la molette/pinch : ne pas écraser ce comportement en ne passant que `zoom` sans `onMoveEnd`.
- Si `center` est laissé dans `projectionConfig` ET dans `ZoomableGroup`, il peut y avoir un conflit — ne le mettre qu'à un seul endroit (`ZoomableGroup`).
- Le zoom élevé peut rendre les tooltips difficiles à positionner (le calcul de `getTooltipPosition` utilise les coordonnées client, ce qui reste correct).
- Aucune modification backend nécessaire.

---

## 2. Bug "Autres" dans Répartition par branche

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx` (lignes 202–208)

### Analyse de l'existant
Le bug se situe aux lignes 202-208 de `DistributionCharts.tsx` :
```tsx
// Ligne 203
const topBranches = branchData.slice(0, 8)
// Ligne 204
const othersWP = branchData.slice(8).reduce((s, d) => s + d.total_written_premium, 0)
// Lignes 205-208
const branchPieData = [
  ...topBranches.map(d => ({ name: d.branche, value: d.total_written_premium })),
  ...(othersWP > 0 ? [{ name: 'Autres', value: othersWP }] : []),
]
```
Le backend `/kpis/by-branch` (ligne 214-227 de `kpis.py`) retourne **toutes** les branches triées par prime. Il n'y a aucune limitation backend. La limitation est **purement frontend** : `.slice(0, 8)` tronque à 8 branches et regroupe tout le reste sous "Autres".

### Étapes d'implémentation

1. **Supprimer la troncature** et utiliser toutes les branches directement :
   ```tsx
   // AVANT
   const topBranches = branchData.slice(0, 8)
   const othersWP = branchData.slice(8).reduce((s, d) => s + d.total_written_premium, 0)
   const branchPieData = [
     ...topBranches.map(d => ({ name: d.branche, value: d.total_written_premium })),
     ...(othersWP > 0 ? [{ name: 'Autres', value: othersWP }] : []),
   ]

   // APRÈS
   const branchPieData = branchData.map(d => ({
     name: d.branche,
     value: d.total_written_premium
   }))
   ```

2. **Même correction pour le graphe "Répartition par type de contrat"** (lignes 210-216), même logique de slice(0, 8) + "Autres" :
   ```tsx
   // AVANT
   const topContractTypes = contractTypeData.slice(0, 8)
   const othersWPContract = contractTypeData.slice(8).reduce(...)
   const contractTypePieData = [...]

   // APRÈS
   const contractTypePieData = contractTypeData.map(d => ({
     name: d.type_contrat,
     value: d.total_written_premium
   }))
   ```

3. **Vérifier la palette `CHART_COLORS`** : elle contient actuellement 9 couleurs. Si le dataset a plus de 9 branches, les couleurs se répéteront via `i % CHART_COLORS.length`. Envisager d'étendre la palette ou de la générer dynamiquement pour éviter la confusion visuelle.

### Points d'attention
- Le label `renderCustomLabel` (ligne 52-64) masque déjà les labels dont `percent < 0.04` (4%), ce qui évite l'encombrement pour les petites tranches.
- Si le nombre de branches est très élevé (>15), la légende du PieChart peut devenir très longue — considérer une hauteur adaptative ou une scrollbar sur la légende.
- Aucune modification backend nécessaire.

---

## 3. Logique "graphe figé + indication visuelle" pour les graphes de répartition

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx` (principal)
- **Frontend** : `frontend/src/context/DataContext.tsx` (lecture des filtres actifs)

### Analyse de l'existant
Dans `DataContext.tsx`, `FilterState` contient :
- `filters.branche: string[]` — filtre Branche actif
- `filters.type_contrat_spc: string[]` — filtre type contrat (FAC, TTY, TTE)
- `filters.specialite: string[]` — filtre spécialité

Dans `DistributionCharts.tsx`, les données sont fetchées avec `filtersToParams(filters)` qui transmet tous les filtres actifs au backend. Il n'y a aucune logique de gel de graphe.

### Architecture de la solution

La logique "graphe figé" requiert de stocker **deux jeux de données** :
- **Données complètes** (`fullData`) : fetchées **sans** le filtre de la même dimension que le graphe
- **Données filtrées** (`filteredData`) : fetchées normalement comme aujourd'hui

Quand le filtre de la même dimension est actif :
- Le graphe affiche `fullData` (100% des données pour cette dimension)
- Les segments correspondants aux valeurs filtrées sont **mis en surbrillance** (opacité réduite sur les non-filtrés, ou badge "%" affiché)

### Étapes d'implémentation

#### Étape 3.1 — Créer `filtersToParamsExcluding` dans `DataContext.tsx`

Ajouter une fonction utilitaire qui génère des params en **excluant** une dimension spécifique :
```typescript
export function filtersToParamsExcluding(
  filters: FilterState,
  exclude: 'branche' | 'type_contrat_spc' | 'specialite'
): Record<string, string> {
  const f = { ...filters }
  if (exclude === 'branche') f.branche = []
  if (exclude === 'type_contrat_spc') f.type_contrat_spc = []
  if (exclude === 'specialite') f.specialite = []
  return filtersToParams(f)
}
```

#### Étape 3.2 — Modifier `DistributionCharts.tsx` pour les fetches duaux

Pour chaque graphe de répartition, ajouter un fetch "sans filtre de la même dimension" :

```tsx
// Dans useEffect, ajouter des fetches parallèles
const paramsFullBranch = filtersToParamsExcluding(filters, 'branche')
const paramsFullContractType = filtersToParamsExcluding(filters, 'type_contrat_spc')

await Promise.all([
  api.get('/kpis/by-branch', { params }),           // vues filtrées (pour highlight)
  api.get('/kpis/by-branch', { params: paramsFullBranch }),  // vue complète (100%)
  api.get('/kpis/by-contract-type', { params }),
  api.get('/kpis/by-contract-type', { params: paramsFullContractType }),
  // ... autres fetches existants
])
```

Ajouter les états correspondants :
```tsx
const [branchDataFull, setBranchDataFull] = useState<any[]>([])
const [contractTypeDataFull, setContractTypeDataFull] = useState<any[]>([])
```

#### Étape 3.3 — Déterminer si un graphe est "figé"

```tsx
const isBranchFrozen = filters.branche.length > 0
const isContractTypeFrozen = filters.type_contrat_spc.length > 0
```

#### Étape 3.4 — Indication visuelle sur les segments

Quand `isBranchFrozen === true`, utiliser `branchDataFull` comme données du PieChart, mais colorier les cellules différemment :

```tsx
// Couleur par segment
const getBranchCellFill = (branchName: string, index: number): string => {
  const baseColor = CHART_COLORS[index % CHART_COLORS.length]
  if (!isBranchFrozen) return baseColor
  // Si le segment fait partie du filtre actif → couleur vive
  // Sinon → atténué
  return filters.branche.includes(branchName)
    ? baseColor                          // couleur normale (mise en avant)
    : `${baseColor}55`                   // version transparente (atténuée)
}
```

Ajouter un badge textuel dans le titre du ChartCard quand le graphe est figé :
```tsx
<ChartCard
  title="Répartition par branche"
  frozen={isBranchFrozen}
  frozenLabel={`Filtre actif (${filters.branche.join(', ')})`}
>
```

Modifier `ChartCard` pour accepter et afficher ces props :
```tsx
const ChartCard = ({
  title, children,
  frozen = false,
  frozenLabel = ''
}: {
  title: string
  children: React.ReactNode
  frozen?: boolean
  frozenLabel?: string
}) => (
  <div className="glass-card p-5 relative overflow-hidden" style={{ height: '100%' }}>
    {/* ... orb décoratif ... */}
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-sm font-bold text-navy relative z-10">{title}</h3>
      {frozen && (
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
          background: 'hsla(43,96%,56%,0.15)', color: 'hsl(43,96%,56%)',
          border: '1px solid hsla(43,96%,56%,0.3)', borderRadius: 99,
        }}>
          🔒 Vue 100% · {frozenLabel}
        </span>
      )}
    </div>
    <div className="relative z-10">{children}</div>
  </div>
)
```

#### Étape 3.5 — S'assurer que le tooltip affiche les vraies valeurs

Quand le graphe est figé, le tooltip doit afficher le `%` réel de chaque branche sur le total complet (pas filtré). Cela est automatique si on utilise `branchDataFull` comme source de données.

### Points d'attention
- **Requêtes supplémentaires** : ce mécanisme double les appels API pour chaque graphe figé. Optimisation possible : ne fetcher les données complètes que si le filtre correspondant est actif (`isBranchFrozen`).
- **Dépendance aux slugs de filtre** : il faut faire attention à la terminologie exacte : le filtre `branche` dans `FilterState` correspond à `INT_BRANCHE` côté backend, le filtre `type_contrat_spc` correspond à `INT_SPC_TYPE` (FAC/TTY/TTE), **différent** de `type_of_contract` (PROPORT./XOL/QUOTA SHARE). Bien identifier quelle colonne backend est impactée par chaque filtre pour le graphe spécialité (#4).
- Cette modification est une dépendance directe de la modification #4 (graphe spécialité), qui devra appliquer la même logique.

---

## 4. Ajout graphe "Répartition par spécialité" (FAC vs Traité)

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx`
- **Backend** : `backend/routers/kpis.py`
- **Frontend** : `frontend/src/constants/api.ts`

### Analyse de l'existant

**Backend** : L'endpoint `/kpis/by-contract-type` (ligne 278 de `kpis.py`) groupe par `TYPE_OF_CONTRACT` qui contient des valeurs comme `PROPORT.`, `XOL`, `QUOTA SHARE`, `SURPLUS`, `AUTRES` — ce n'est **pas** ce qu'on cherche. 

Le filtre `type_contrat_spc` dans `FilterState` correspond à `INT_SPC_TYPE` dans Excel (`FAC`, `TTY`, `TTE`). C'est là qu'on peut agréger.

**Il n'existe pas d'endpoint `/kpis/by-specialite`** — il faut en créer un.

**Frontend** : La section "Spécialité" dans `FilterPanel.tsx` (ligne 448) inclut le Select `type_contrat_spc` (FAC, TTY, TTE). C'est ce filtre qui correspond à la notion "Spécialité" (FAC vs Traité).

### Définition métier de la répartition
- **FAC** = valeurs `INT_SPC_TYPE == 'FAC'`
- **Traité** = valeurs `INT_SPC_TYPE == 'TTY' OR 'TTE'` (regroupés)

### Étapes d'implémentation

#### Étape 4.1 — Créer l'endpoint backend `/kpis/by-specialite`

Dans `backend/routers/kpis.py`, ajouter après l'endpoint `by-contract-type` (après ligne 294) :

```python
@router.get("/by-specialite")
def kpis_by_specialite(
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    """
    Retourne la répartition FAC vs Traité (TTY + TTE) par prime écrite.
    Utilise la colonne INT_SPC_TYPE.
    """
    import pandas as pd
    df = get_df()
    df = apply_filters(df, filters)
    
    if df.empty or "INT_SPC_TYPE" not in df.columns:
        return []
    
    df["INT_SPC_TYPE"] = df["INT_SPC_TYPE"].fillna("").astype(str).str.upper().str.strip()
    df["WRITTEN_PREMIUM"] = pd.to_numeric(df["WRITTEN_PREMIUM"], errors="coerce").fillna(0)
    
    fac_df = df[df["INT_SPC_TYPE"] == "FAC"]
    treaty_df = df[df["INT_SPC_TYPE"].isin(["TTY", "TTE"])]
    
    fac_premium = float(fac_df["WRITTEN_PREMIUM"].sum())
    treaty_premium = float(treaty_df["WRITTEN_PREMIUM"].sum())
    
    result = []
    if fac_premium > 0:
        result.append({
            "specialite": "FAC",
            "total_written_premium": round(fac_premium, 2),
            "contract_count": len(fac_df),
        })
    if treaty_premium > 0:
        result.append({
            "specialite": "Traité",
            "total_written_premium": round(treaty_premium, 2),
            "contract_count": len(treaty_df),
        })
    
    return sorted(result, key=lambda x: x["total_written_premium"], reverse=True)
```

#### Étape 4.2 — Ajouter la route dans `api.ts`

Dans `frontend/src/constants/api.ts`, ajouter dans `KPIS` :
```typescript
BY_SPECIALITE: '/kpis/by-specialite',
```

#### Étape 4.3 — Ajouter le fetch dans `DistributionCharts.tsx`

Ajouter dans le `useState` :
```tsx
const [specialiteData, setSpecialiteData] = useState<any[]>([])
const [specialiteDataFull, setSpecialiteDataFull] = useState<any[]>([])
```

Ajouter dans le `Promise.all` du `useEffect` :
```tsx
api.get('/kpis/by-specialite', { params }),
api.get('/kpis/by-specialite', { params: filtersToParamsExcluding(filters, 'type_contrat_spc') }),
```

#### Étape 4.4 — Déterminer si le graphe est "figé"

```tsx
const isSpecialiteFrozen = filters.type_contrat_spc.length > 0
```

##### Étape 4.5 — Ajouter le PieChart dans le JSX

Ajouter un nouveau `<ChartCard>` dans l'onglet Répartition, après le graphe Répartition par type de contrat :

```tsx
{/* DONUT — Répartition par spécialité (FAC vs Traité) */}
<ChartCard
  title="Répartition par spécialité"
  frozen={isSpecialiteFrozen}
  frozenLabel={`Filtre actif (${filters.type_contrat_spc.join(', ')})`}
>
  <ResponsiveContainer width="100%" height={240}>
    <PieChart>
      <Pie
        data={isSpecialiteFrozen ? specialiteDataFull : specialiteData}
        cx="50%" cy="50%"
        innerRadius={60} outerRadius={100}
        dataKey="value" nameKey="name"
        paddingAngle={4}
        isAnimationActive
        animationDuration={900}
        stroke="none"
        labelLine={false}
        label={renderCustomLabel}
      >
        {(isSpecialiteFrozen ? specialiteDataFull : specialiteData).map((entry, i) => (
          <Cell
            key={i}
            fill={
              isSpecialiteFrozen && !filters.type_contrat_spc.some(f =>
                (f === 'FAC' && entry.specialite === 'FAC') ||
                (['TTY','TTE'].includes(f) && entry.specialite === 'Traité')
              )
                ? `${CHART_COLORS[i % CHART_COLORS.length]}55`
                : CHART_COLORS[i % CHART_COLORS.length]
            }
          />
        ))}
      </Pie>
      <Tooltip content={<GlassTooltip />} cursor={{ fill: 'transparent' }} />
      <Legend
        iconType="circle"
        iconSize={8}
        formatter={(v) => (
          <span style={{ fontSize: 11, color: 'hsl(218,12%,42%)', fontWeight: 500 }}>
            {truncate(v, 20)}
          </span>
        )}
      />
    </PieChart>
  </ResponsiveContainer>
</ChartCard>
```

> **Note** : transformer `specialiteData` pour que chaque entrée ait `name: entry.specialite` et `value: entry.total_written_premium` avant de passer au PieChart.

### Points d'attention
- Vérifier que la colonne `INT_SPC_TYPE` existe bien dans le fichier Excel chargé (le nom exact peut varier selon le fichier source). Si la colonne n'existe pas, l'endpoint renvoie `[]` proprement.
- La logique de gel (modification #3) doit être implémentée **avant** ou **en même temps** que ce graphe.
- Le filtre `type_contrat_spc` dans `FilterPanel` agit sur `INT_SPC_TYPE`. Il s'agit d'un filtre **différent** de `type_of_contract` (qui agit sur `TYPE_OF_CONTRACT` = PROPORT./XOL...). Bien documenter cette distinction dans le code.

---

## 5. Supprimer les tabs Tous/Facultatif/Traité dans Top 10 cédantes

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx` (lignes 159-161, 350-365, 170)

### Analyse de l'existant

Dans `DistributionCharts.tsx` :
- **Ligne 159-161** : état `cedanteView` de type `'ALL' | 'FAC' | 'TREATY'`
- **Ligne 170** : le fetch `/kpis/by-cedante` passe `type_contrat_view: cedanteView === 'ALL' ? undefined : cedanteView`
- **Lignes 350-365** : le rendu des boutons toggle `Tous / Facultatif / Traité` dans la ChartCard

Dans `kpis.py` (ligne 297-320), l'endpoint `/kpis/by-cedante` accepte `type_contrat_view` pour filtrer FAC vs TREATY. Le filtre global `type_contrat_spc` (FAC/TTY/TTE) est déjà appliqué via `apply_filters`.

### Étapes d'implémentation

1. **Supprimer l'état `cedanteView`** (lignes 159-161) :
   ```tsx
   // Supprimer ces lignes :
   type CedanteView = 'ALL' | 'FAC' | 'TREATY'
   const [cedanteView, setCedanteView] = useState<CedanteView>('ALL')
   ```

2. **Simplifier le fetch `/kpis/by-cedante`** en supprimant le paramètre `type_contrat_view` (ligne 170) :
   ```tsx
   // AVANT
   api.get('/kpis/by-cedante', { params: { ...params, top: 10, type_contrat_view: cedanteView === 'ALL' ? undefined : cedanteView } })

   // APRÈS
   api.get('/kpis/by-cedante', { params: { ...params, top: 10 } })
   ```

3. **Supprimer le `useEffect` de rechargement sur `cedanteView`** : modifier la dépendance du `useEffect` (ligne 188) en retirant `cedanteView` de l'array de dépendances.

4. **Supprimer le bloc JSX des boutons toggle** (lignes 351-365) :
   ```tsx
   {/* Supprimer ce bloc entier */}
   <div className="flex gap-1 mb-3 p-0.5 rounded-lg w-fit" style={{ background: 'var(--color-gray-100)' }}>
     {(['ALL', 'FAC', 'TREATY'] as const).map(view => (
       <button ...>{...}</button>
     ))}
   </div>
   ```

5. **(Optionnel) Nettoyer le backend** : le paramètre `type_contrat_view` dans `/kpis/by-cedante` peut être conservé (d'autres pages pourraient l'utiliser), ou marqué comme `@deprecated` dans un commentaire.

### Points d'attention
- S'assurer que la modification #6 (feature cédantes sélectionnées) est planifiée **après** cette suppression, car elle modifie le même endpoint et le même composant — les deux modifications ne doivent pas être faites simultanément.
- Le filtre global `type_contrat_spc` (FAC/TTY/TTE) dans `FilterPanel` suffira à filtrer le type de contrat dans le top cédantes via `apply_filters` côté backend. Les utilisateurs auront donc le même comportement de filtrage mais via le panel global.

---

## 6. Feature(s) vs Top 10 cédantes

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx`
- **Backend** : `backend/routers/kpis.py` (endpoint `/kpis/by-cedante`, lignes 297-320)
- **Frontend** : `frontend/src/context/DataContext.tsx` (lecture de `filters.cedante`)

### Analyse de l'existant

**Dans `DataContext.tsx`** : `filters.cedante: string[]` contient les cédantes sélectionnées dans le filtre global. La fonction `filtersToParams` les envoie comme `cedante=X,Y,Z` au backend.

**Dans `kpis.py`** (`/kpis/by-cedante`, lignes 297-320) : `apply_filters` est appliqué en premier, ce qui **filtre le dataset aux seules cédantes sélectionnées**. Ainsi, si `cedante=['A','B']` est actif, le top 10 ne verra que `A` et `B`. La logique de mise en avant est donc impossible avec l'architecture actuelle — il faut modifier l'endpoint.

**Dans `DistributionCharts.tsx`** : `cedanteData` est utilisé directement dans le `BarChart`. Chaque barre a la même couleur via `fill="url(#barGradCedante)"`.

### Architecture de la logique souhaitée

Quand N cédantes sont filtrées (N ≥ 1) :
- **N barres** : les N cédantes sélectionnées (toujours présentes, même si pas dans le top 10 global)
- **(10-N) barres** : les meilleures cédantes `NOT IN` selectedCedantes, pour compléter jusqu'à 10
- Les N cédantes sélectionnées sont colorées différemment (couleur d'accent : `hsl(83,50%,45%)`)
- Les (10-N) autres barres gardent la couleur habituelle

### Étapes d'implémentation

#### Étape 6.1 — Modifier le backend `/kpis/by-cedante`

Ajouter les paramètres `selected_cedantes` et `highlight_mode` :

```python
@router.get("/by-cedante")
def kpis_by_cedante(
    top: int = Query(10),
    type_contrat_view: Optional[str] = Query(None),
    selected_cedantes: Optional[str] = Query(None),  # NOUVEAU: CSV de noms
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    df = get_df()
    
    # Si selected_cedantes est fourni, ne PAS appliquer le filtre cedante standard
    # (pour pouvoir voir à la fois les sélectionnées ET le top complément)
    if selected_cedantes:
        # Filtrer sans le filtre cedante
        filters_no_cedante = filters.copy()
        filters_no_cedante.cedante = None
        df = apply_filters(df, filters_no_cedante)
    else:
        df = apply_filters(df, filters)
    
    # ... (filtre type_contrat_view existant) ...
    
    if selected_cedantes:
        selected_list = [c.strip() for c in selected_cedantes.split(",") if c.strip()]
        
        # Calcul de tous les KPIs
        all_results = []
        for cedante, group in df.groupby("INT_CEDANTE"):
            if not cedante:
                continue
            kpis = compute_kpi_summary(group)
            all_results.append({
                "cedante": cedante,
                "is_selected": cedante in selected_list,
                **kpis
            })
        all_results.sort(key=lambda x: x["total_written_premium"], reverse=True)
        
        # Séparer sélectionnées et complement
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        
        # Garder toutes les sélectionnées + (top - N) compléments
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        
        # Tri final par prime pour l'affichage
        final.sort(key=lambda x: x["total_written_premium"], reverse=True)
        return final
    else:
        # Comportement original
        result = []
        for cedante, group in df.groupby("INT_CEDANTE"):
            if not cedante:
                continue
            kpis = compute_kpi_summary(group)
            result.append({"cedante": cedante, "is_selected": False, **kpis})
        result.sort(key=lambda x: x["total_written_premium"], reverse=True)
        return result[:top]
```

#### Étape 6.2 — Modifier le fetch dans `DistributionCharts.tsx`

```tsx
const selectedCedantes = filters.cedante  // string[] depuis DataContext

// Dans le fetch
api.get('/kpis/by-cedante', {
  params: {
    ...params,
    top: 10,
    // Si des cédantes sont sélectionnées, passer la liste ET exclure le filtre cedante standard
    ...(selectedCedantes.length > 0 && {
      selected_cedantes: selectedCedantes.join(','),
      cedante: undefined,  // neutraliser le filtre standard
    })
  }
})
```

> **Important** : il faut construire les params manuellement ici (ne pas utiliser directement `filtersToParams`) pour pouvoir neutraliser `cedante` tout en passant `selected_cedantes`.

#### Étape 6.3 — Coloration conditionnelle des barres dans le `BarChart`

Remplacer le `<Bar fill="url(#barGradCedante)">` par une coloration par `Cell` :

```tsx
<Bar dataKey="total_written_premium" name="Prime écrite" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={900}>
  {cedanteData.map((entry, i) => (
    <Cell
      key={i}
      fill={entry.is_selected
        ? 'hsl(83,50%,45%)'          // vert accent pour les sélectionnées
        : 'url(#barGradCedante)'     // couleur habituelle pour le complément
      }
    />
  ))}
</Bar>
```

#### Étape 6.4 — Badge d'indication dans le titre

Quand `selectedCedantes.length > 0`, ajouter un badge dans la ChartCard :
```tsx
<ChartCard
  title="Top 10 cédantes par prime écrite"
  frozen={selectedCedantes.length > 0}
  frozenLabel={`${selectedCedantes.length} sélectionnée(s) mise(s) en avant`}
>
```

### Points d'attention
- **Order of operations** : la modification #5 (suppression des tabs FAC/Traité) doit être faite **avant** cette modification, car les deux touchent le même endpoint et composant.
- **Neutraliser le filtre cedante côté backend** : c'est le point critique — si `apply_filters` est appelé avec `filters.cedante = ['A','B']`, le dataset sera limité à A et B, rendant impossible le calcul du complément. La solution proposée est de cloner `filters` et mettre `cedante = None` quand `selected_cedantes` est fourni.
- **Tooltip** : le `GlassTooltip` existant affichera correctement le nom de la cédante (via `label`) et la prime — pas de modification nécessaire.
- **Compatibilité** : le champ `is_selected` retourné par le backend est nouveau — le frontend doit l'utiliser, mais les autres composants qui utilisent `/kpis/by-cedante` sans ce champ continueront à fonctionner (champ optionnel).

---

## 7. Feature(s) vs Top 10 courtiers

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx`
- **Backend** : `backend/routers/kpis.py` (endpoint `/kpis/by-broker`, lignes 262-275)
- **Frontend** : `frontend/src/context/DataContext.tsx` (lecture de `filters.courtier`)

### Analyse de l'existant

**Dans `kpis.py`** (`/kpis/by-broker`, lignes 262-275) : Même problème qu'avec les cédantes — `apply_filters` est appliqué en premier, ce qui filtrerait le dataset aux seuls courtiers sélectionnés.

**Dans `FilterState`** : `filters.courtier: string[]` contient les courtiers sélectionnés.

**Dans `DistributionCharts.tsx`** : `brokerData` est utilisé dans le BarChart "Top 10 courtiers" avec `dataKey="written_premium"` (ligne 335).

> ⚠️ Attention : le champ retourné par `/kpis/by-broker` est `written_premium` (pas `total_written_premium` comme pour les cédantes). Vérifier la cohérence.

### Étapes d'implémentation

Exactement la même architecture que la modification #6, adaptée au courtier :

#### Étape 7.1 — Modifier le backend `/kpis/by-broker`

Ajouter `selected_brokers: Optional[str]` en paramètre, avec la même logique :
- Si `selected_brokers` est fourni : filtrer sans `courtier`, calculer tous les KPIs, séparer sélectionnés + complément, retourner les N sélectionnés + (10-N) top complément.
- Ajouter `is_selected: bool` dans chaque entrée retournée.
- Harmoniser le nom du champ : retourner `written_premium` (existant) ET/OU `total_written_premium` pour cohérence.

```python
@router.get("/by-broker")
def kpis_by_broker(
    top: int = Query(10),
    selected_brokers: Optional[str] = Query(None),  # NOUVEAU
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    df = get_df()
    
    if selected_brokers:
        selected_list = [b.strip() for b in selected_brokers.split(",") if b.strip()]
        filters_no_broker = filters.copy()
        filters_no_broker.courtier = None
        df = apply_filters(df, filters_no_broker)
    else:
        df = apply_filters(df, filters)
    
    if df.empty or "INT_BROKER" not in df.columns:
        return []
    
    all_results = []
    for broker, group in df.groupby("INT_BROKER"):
        if not broker or str(broker).strip() in ("", "NAN"):
            continue
        wp = float(group["WRITTEN_PREMIUM"].sum() if "WRITTEN_PREMIUM" in group.columns else 0)
        all_results.append({
            "courtier": str(broker).strip(),
            "written_premium": round(wp, 2),
            "contract_count": len(group),
            "is_selected": selected_brokers and str(broker).strip() in (selected_list if selected_brokers else [])
        })
    
    all_results.sort(key=lambda x: x["written_premium"], reverse=True)
    
    if selected_brokers:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["written_premium"], reverse=True)
        return final
    
    return all_results[:top]
```

#### Étape 7.2 — Modifier le fetch dans `DistributionCharts.tsx`

```tsx
const selectedCourtiers = filters.courtier

api.get('/kpis/by-broker', {
  params: {
    ...params,
    top: 10,
    ...(selectedCourtiers.length > 0 && {
      selected_brokers: selectedCourtiers.join(','),
      courtier: undefined,
    })
  }
})
```

#### Étape 7.3 — Coloration conditionnelle des barres (même logique que #6)

```tsx
<Bar dataKey="written_premium" name="Prime écrite" radius={[0, 4, 4, 0]}>
  {brokerData.map((entry, i) => (
    <Cell
      key={i}
      fill={entry.is_selected
        ? 'hsl(83,50%,45%)'
        : 'url(#barGradBroker)'
      }
    />
  ))}
</Bar>
```

#### Étape 7.4 — Badge d'indication dans le titre

```tsx
<ChartCard
  title="Top 10 courtiers par prime écrite"
  frozen={selectedCourtiers.length > 0}
  frozenLabel={`${selectedCourtiers.length} sélectionné(s) mis en avant`}
>
```

### Points d'attention
- **Identique à #6** : même architecture, mêmes risques. Implémenter #6 en premier et réutiliser le même pattern.
- Le champ `courtier` dans l'output du backend vs le champ `dataKey` dans le BarChart : vérifier que le `YAxis dataKey="courtier"` correspond bien au nom de champ retourné.
- **Gestion des courtiers absents** : si une cédante sélectionnée dans le filtre a 0 contrats qui la lient à ce courtier (ex: filtre simultané branche + courtier), la barre apparaîtra avec valeur 0 mais sera quand même mise en avant — décision à valider métier.

---

## 8. Marchés en alerte dépendant de l'année filtrée

### Fichiers concernés
- **Frontend** : `frontend/src/components/DashboardAlerts.tsx` (lignes 37-56)
- **Backend** : `backend/routers/kpis.py` (endpoint `/kpis/alerts`, lignes 126-151)

### Analyse de l'existant

**Dans `DashboardAlerts.tsx`** (lignes 43-55) :
```tsx
api.get(API_ROUTES.KPIS.ALERTS, {
    params: {
        ulr_threshold: debouncedThreshold,
        ...filters  // ← spreading filters directement, pas filtersToParams(filters)
    }
})
```

**Le bug** : `...filters` fait un spread de l'objet `FilterState` complet — mais les clés sont des noms TypeScript (ex: `uw_year_min`, `uw_years`, `cedante`), pas nécessairement au format attendu par le backend. En particulier :
- `uw_years: number[]` → envoyé comme `uw_years=[2022,2023]`, pas comme `uw_years_raw=2022,2023` (format attendu par `parse_filter_params` côté backend, ligne 25 de `kpis.py`)
- Les arrays sont sérialisés différemment selon les navigateurs avec Axios

**Dans `kpis.py`** (endpoint `/alerts`, ligne 127-151) : `apply_filters` est bien appelé avec les `filters` parsés. L'endpoint supporte bien les filtres d'année via `parse_filter_params`. Le problème est uniquement dans la transmission frontend → backend.

**Vérification** : Dans `apply_filters` (backend), les filtres d'année utilisent `uw_years` (list) ou `uw_year_min`/`uw_year_max`. Si le frontend envoie le bon format, le filtre est appliqué.

### Étapes d'implémentation

#### Étape 8.1 — Corriger la transmission des paramètres dans `DashboardAlerts.tsx`

Remplacer le spread direct `...filters` par `filtersToParams(filters)` :

```tsx
// AVANT (lignes 43-55)
api.get(API_ROUTES.KPIS.ALERTS, {
    params: {
        ulr_threshold: debouncedThreshold,
        ...filters   // ← INCORRECT : spread de l'objet FilterState brut
    }
})

// APRÈS
import { filtersToParams } from '../context/DataContext'  // ajouter l'import

api.get(API_ROUTES.KPIS.ALERTS, {
    params: {
        ulr_threshold: debouncedThreshold,
        ...filtersToParams(filters)   // ← CORRECT : params sérialisés proprement
    }
})
```

#### Étape 8.2 — Vérifier le backend

Inspecter `apply_filters` dans `services/data_service.py` pour confirmer que les filtres d'année sont bien appliqués :
- `uw_year_min` / `uw_year_max` → filtre par plage
- `uw_years` → filtre sur liste exacte

Si ces filtres ne sont pas implémentés dans `apply_filters`, les ajouter. (Selon l'analyse du code, ils semblent déjà présents car d'autres endpoints les supportent.)

#### Étape 8.3 — Corriger l'import manquant

Vérifier que `filtersToParams` est bien importé dans `DashboardAlerts.tsx` :
```tsx
import { useData, filtersToParams } from '../context/DataContext'
```
> Actuellement, `DashboardAlerts.tsx` importe uniquement `useData` (ligne 6), il faut ajouter `filtersToParams`.

### Points d'attention
- **Régression potentielle** : la correction du spread `...filters` par `filtersToParams(filters)` peut changer la façon dont les autres filtres (branche, pays, cédante) sont transmis à l'endpoint `/alerts`. Tester avec différentes combinaisons de filtres.
- **Filtre `dataStatus?.loaded`** (ligne 39) : ce guard est correct et doit être conservé.
- **Debounce du seuil** : le debounce de 400ms (lignes 28-35) est correct et doit être conservé. La dépendance du `useEffect` inclut `filters` (ligne 56), ce qui est correct — les alertes se rechargent quand les filtres changent.
- **Volume de données** : l'endpoint `alerts` fait un `groupby` sur PAYS_RISQUE × INT_BRANCHE. Si l'année est incorrectement ignorée, on voit des alertes sur toutes les années confondues, ce qui peut masquer des marchés actuellement sains.

---

## Ordre d'implémentation recommandé

L'ordre suivant minimise les conflits et les réécritures :

```
Priorité 1 — Modifications indépendantes (aucune dépendance)
├── #2  Bug "Autres" branche          (2 lignes à modifier, risque zéro)
├── #8  Alertes + filtre année         (1 ligne à modifier, correctif critique)
└── #1  Zoom carte mondiale            (ajout isolé dans WorldMap.tsx)

Priorité 2 — Infrastructure partagée (à faire en un seul commit)
└── #3  Logique graphe figé            (implique ChartCard, filtersToParamsExcluding)
    └── dépend de : aucune modification précédente

Priorité 3 — Nouveaux graphes (dépendent de #3)
└── #4  Graphe répartition spécialité  (nouveau endpoint backend + composant)
    └── dépend de : #3 (logique figé)

Priorité 4 — Refactoring Top 10 cédantes (modifier le même composant en séquence)
├── #5  Supprimer tabs FAC/Traité cédantes  (supprimer avant d'ajouter de la logique)
└── #6  Feature cédantes sélectionnées       (ajouter la logique highlight)
    └── dépend de : #5 (pour éviter conflit sur cedanteView)

Priorité 5 — Top 10 courtiers (même pattern que cédantes, faire ensuite)
└── #7  Feature courtiers sélectionnés
    └── dépend de : #6 (pattern établi, réutiliser le code)
```

### Résumé des modifications par fichier

| Fichier | Modifications |
|---|---|
| `WorldMap.tsx` | #1 (zoom) |
| `DistributionCharts.tsx` | #2, #3, #4, #5, #6, #7 |
| `DashboardAlerts.tsx` | #8 |
| `DataContext.tsx` | #3 (`filtersToParamsExcluding`) |
| `api.ts` | #4 (`BY_SPECIALITE`) |
| `kpis.py` | #4 (endpoint `by-specialite`), #6 (endpoint `by-cedante`), #7 (endpoint `by-broker`) |

> **Recommandation** : éviter de modifier `DistributionCharts.tsx` en parallèle sur deux branches Git différentes — ce fichier est touché par 6 des 8 modifications. Travailler sur une seule branche séquentielle pour ce fichier.
