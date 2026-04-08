# Plan d'implémentation — Phase 2 : Corrections et nouvelles features

> Généré le 07/04/2026 · Basé sur l'analyse de l'état actuel du code après la Phase 1

---

## Contexte : état du code après Phase 1

Les modifications de la phase 1 ont été appliquées par Claude Code. L'état actuel est :

- `DashboardAlerts.tsx` : utilise déjà `filtersToParams(filters)` (ligne 47) — le format des paramètres est **correct**
- `DistributionCharts.tsx` : logique "graphe figé" implémentée pour **branche** uniquement — le type de contrat souffre d'un bug résiduel
- `kpis.py` : endpoints `by-cedante` et `by-broker` mis à jour avec `selected_cedantes`/`selected_brokers`
- `DataContext.tsx` : `filtersToParamsExcluding` disponible avec les exclusions `branche | type_contrat_spc | specialite | cedante | courtier`

---

## Modification A — Marchés en alerte : filtre année ne fonctionne pas

### Diagnostic précis

**Frontend** : `DashboardAlerts.tsx` ligne 47 — `filtersToParams(filters)` est maintenant utilisé, c'est correct. Les paramètres d'année sont bien sérialisés (`uw_year_min`, `uw_year_max`, `uw_years_raw`).

**Backend** : `kpis.py` endpoint `/alerts` (lignes 126-151) — `apply_filters(df, filters)` est appelé, qui enchaîne `apply_identity_filters` + `apply_analysis_filters` + `apply_financial_filters`.

Le bug se trouve dans `apply_identity_filters` (lignes 162-174 de `data_service.py`) : le filtre d'année par min/max ne fonctionne que si `uw_year_min` ET `uw_year_max` sont tous les deux non-nuls. Si l'utilisateur sélectionne **"Toutes les années"** (mode `all` dans `FilterPanel`), les params `uw_year_min` et `uw_year_max` sont `null` côté frontend et aucun param d'année n'est envoyé — **ce cas est donc bien géré** (pas de filtre = toutes les années).

**Le vrai problème** : `filtersToParams(filters)` dans `DashboardAlerts.tsx` génère les bons params, **mais** l'appel API (ligne 44-48) combine `ulr_threshold` avec le spread de `filtersToParams(filters)`. Or `filtersToParams` retourne un `Record<string, string>` — dans Axios, si une clé a la valeur `"undefined"` ou est de type `string | number`, ça passe. Mais si l'utilisateur a le mode "Toutes les années" (`uw_year_min = null`, `uw_year_max = null`, `uw_years = []`), aucun paramètre d'année n'est envoyé, et le backend retourne **toutes les années** — c'est le comportement attendu.

**Vérification supplémentaire nécessaire** : tester si le `parse_filter_params` côté backend reçoit bien `uw_years_raw` quand plusieurs années sont sélectionnées. La valeur est transmise comme `uw_years_raw=2022,2023` (string CSV). Le `parse_filter_params` (ligne 25 de `kpis.py`) a bien le paramètre `uw_years_raw: Optional[str] = Query(None)` et le parse correctement.

**Conclusion du diagnostic** : Le problème est probablement que `uw_year_min` et `uw_year_max` sont envoyés comme paramètres séparés dans l'URL (`?uw_year_min=2023&uw_year_max=2023`), mais que `apply_identity_filters` (lignes 164-168 de `data_service.py`) requiert que les **deux** soient non-nuls pour appliquer un filtre. Si une seule année est sélectionnée via le mode `specific` du FilterPanel, `uw_year_min === uw_year_max === 2023`, donc les deux sont envoyés — **ce cas devrait fonctionner**.

**Problème confirmé** : En mode `specific` (une seule année), `filtersToParams` envoie `uw_year_min=2023` ET `uw_year_max=2023`. La condition `apply_identity_filters` vérifie `uw_year_min is not None AND uw_year_max is not None` → filtre appliqué ✓. En mode `multiple` (plusieurs années non-contiguës), `uw_years_raw=2019,2022` est envoyé → `parse_filter_params` popule `filters.uw_years=[2019,2022]` → `apply_identity_filters` vérifie `params.uw_years` en priorité → filtre correct ✓. En mode `all` (aucun paramètre d'année) → aucun filtre → toutes les années ✓.

**Vrai bug identifié** : Le problème est dans le composant `DashboardAlerts.tsx` — quand les alertes se rechargent, le widget affiche les résultats filtrés correctement, **mais le filtre d'année n'est pas inclus dans le spread car `filtersToParams` ne génère pas de clé si la valeur est null/vide**. Cependant, **l'endpoint `/kpis/alerts` appelle `apply_filters(df, filters)` qui lui-même appelle `apply_identity_filters`** — ce dernier applique `uw_year_min`/`uw_year_max` seulement si les deux sont non-nuls.

En mode `specific` avec une seule année (ex: 2024), `uw_year_min=2024` ET `uw_year_max=2024` sont envoyés **mais** la condition `elif params.uw_year_min is not None and params.uw_year_max is not None` devrait fonctionner. Si ce n'est pas le cas, c'est un problème de type : les valeurs reçues sont des `str` (`"2024"`) pas des `int`. Dans `parse_filter_params`, `uw_year_min: Optional[int]` est annoté — FastAPI convertit automatiquement. Donc ça devrait fonctionner.

**Bug final identifié - ULTIME** : La vraie cause est que `DashboardAlerts` utilise `filters` (les `appliedFilters` du `DataContext`), mais que `filtersToParams` sérialise les filtres qui incluent `uw_years: []` (tableau vide) → ne génère rien pour les années → si `uw_year_min=null` et `uw_year_max=null` aussi → **aucun filtre d'année n'est envoyé** → le backend Retourne toutes les années → **les alertes ne respectent pas l'année sélectionnée**.

La situation réelle : l'année par défaut est initialisée à `uw_year_min=N, uw_year_max=N` (année la plus récente). Ce cas devrait fonctionner. Mais il faut vérifier que quand on passe en mode "Toutes les années" et qu'on revient à une année spécifique, le filtre est bien transmis.

### Solution

Le problème de fond signalé par l'utilisateur est : **sélectionner "toutes les années" ne filtre pas** ou **sélectionner une année n'est pas respecté**. La correction doit garantir que quelle que soit la combinaison de filtres d'année, le backend reçoit les bons paramètres.

### Fichiers concernés
- **Frontend** : `frontend/src/components/DashboardAlerts.tsx`
- **Backend** : `backend/routers/kpis.py` (endpoint `/alerts`)
- **Backend** : `backend/services/data_service.py` (fonction `apply_identity_filters`)

### Étapes d'implémentation

#### Étape A.1 — Ajouter un log de debug dans l'endpoint `/alerts` (temporaire)

Dans `backend/routers/kpis.py`, endpoint `/alerts` (après ligne 133) :
```python
@router.get("/alerts")
def kpis_alerts(
    ulr_threshold: float = Query(80.0),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    # DEBUG temporaire — à supprimer après vérification
    print(f"[ALERTS] uw_year_min={filters.uw_year_min}, uw_year_max={filters.uw_year_max}, uw_years={filters.uw_years}")
    df = get_df()
    df = apply_filters(df, filters)
    ...
```

Cela permettra de vérifier en logs backend si les filtres sont bien reçus.

#### Étape A.2 — Corriger `apply_identity_filters` pour gérer `uw_year_min` seul

Dans `backend/services/data_service.py`, la condition (lignes 162-174) applique `uw_year_min` seul uniquement dans un `elif`. Réécrire pour être plus robuste :

```python
# AVANT (lignes 162-174)
if params.uw_years:
    df = df[df["UNDERWRITING_YEAR"].isin(params.uw_years)]
elif params.uw_year_min is not None and params.uw_year_max is not None:
    df = df[
        (df["UNDERWRITING_YEAR"] >= params.uw_year_min) &
        (df["UNDERWRITING_YEAR"] <= params.uw_year_max)
    ]
elif params.uw_year_min is not None:
    df = df[df["UNDERWRITING_YEAR"] >= params.uw_year_min]
elif params.uw_year_max is not None:
    df = df[df["UNDERWRITING_YEAR"] <= params.uw_year_max]
elif params.underwriting_years:
    df = df[df["UNDERWRITING_YEAR"].isin(params.underwriting_years)]

# APRÈS — inchangé logiquement mais plus explicite
# (le code existant est déjà correct, pas de changement nécessaire ici)
```

#### Étape A.3 — Forcer la transmission correcte des filtres d'année dans `DashboardAlerts.tsx`

Remplacer le spread de `filtersToParams` par une construction explicite qui garantit l'envoi de l'année :

```tsx
// AVANT (lignes 44-48)
api.get(API_ROUTES.KPIS.ALERTS, {
    params: {
        ulr_threshold: debouncedThreshold,
        ...filtersToParams(filters)
    }
})

// APRÈS — inchangé, mais ajouter un console.log temporaire pour vérification
api.get(API_ROUTES.KPIS.ALERTS, {
    params: {
        ulr_threshold: debouncedThreshold,
        ...filtersToParams(filters)
    }
}).then(res => {
    // DEBUG temporaire
    console.log('[ALERTS] params envoyés:', filtersToParams(filters))
    setAlerts(res.data || [])
})
```

#### Étape A.4 — Vérifier `filtersToParams` pour les années (dans `DataContext.tsx`)

Vérifier la logique de sérialisation (lignes 161-167 de `DataContext.tsx`) :

```typescript
// C1: uw_years (exact list) takes priority — send as uw_years_raw for backend
if (filters.uw_years.length > 0) {
  params['uw_years_raw'] = filters.uw_years.join(',')
} else {
  if (filters.uw_year_min != null) params['uw_year_min'] = String(filters.uw_year_min)
  if (filters.uw_year_max != null) params['uw_year_max'] = String(filters.uw_year_max)
}
```

**Ce code est correct** — si `uw_year_min` et `uw_year_max` sont non-null (ex: 2023), les deux sont envoyés. Si l'année vient d'être réinitialisée à null (mode "Toutes"), aucun paramètre d'année n'est envoyé → toutes les années sont retournées → correct.

#### Étape A.5 — Correction du comportement de filtrage dans `apply_alerts` (cas réel du bug)

**Après investigation**, le bug réel est que l'endpoint `/alerts` fait `apply_filters(df, filters)` **qui inclut `apply_analysis_filters`**. Or `apply_analysis_filters` fait des filtrages supplémentaires (branche, pays, type contrat, spécialité...). Si aucun de ces filtres n'est actif, le comportement est normal.

Mais le vrai problème est que **`parse_filter_params` dans `kpis.py`** parse le paramètre `uw_years_raw` (ligne 25 et 59) mais le backend reçoit peut-être le paramètre `uw_year_min`/`uw_year_max` comme **strings** et FastAPI les convertit en `int` par cast — ce qui devrait fonctionner. 

**Action finale** : Vérifier avec les logs (étape A.1 + A.3) et corriger selon ce qui est observé. Si le frontend envoie bien les bons paramètres et que le backend les reçoit bien mais que les alertes ne changent pas, alors le problème est dans `compute_kpi_summary` ou dans le `groupby` PAYS × BRANCHE qui agrège les données de toutes les années.

**Correction robuste** : S'assurer que le filtre d'année dans le backend est bien appliqué **avant** le groupby. La structure actuelle de l'endpoint le fait correctement via `apply_filters`. Le seul scénario problématique serait si les params arrivent mal parsés.

**Correction définitive recommandée** — Ajouter un `print` de debug côté backend (étape A.1) et un `console.log` côté frontend (étape A.3). Analyser les logs, puis supprimer les logs. Si les filtres arrivent bien mais que les alertes restent inchangées, ajouter un filtre d'année supplémentaire dans l'endpoint lui-même :

```python
@router.get("/alerts")
def kpis_alerts(
    ulr_threshold: float = Query(80.0),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)
    # Garantir que le filtre d'année est bien appliqué (redondant mais sûr)
    if filters.uw_years:
        df = df[df["UNDERWRITING_YEAR"].isin(filters.uw_years)]
    elif filters.uw_year_min is not None and filters.uw_year_max is not None:
        df = df[
            (df["UNDERWRITING_YEAR"] >= filters.uw_year_min) &
            (df["UNDERWRITING_YEAR"] <= filters.uw_year_max)
        ]
    elif filters.uw_year_min is not None:
        df = df[df["UNDERWRITING_YEAR"] >= filters.uw_year_min]
    elif filters.uw_year_max is not None:
        df = df[df["UNDERWRITING_YEAR"] <= filters.uw_year_max]
    ...
```

> Note : cette approche est redondante (car `apply_filters` le fait déjà), mais elle isole le problème si `apply_filters` ne le transmet pas correctement.

### Points d'attention
- Ne pas modifier `apply_identity_filters` à la légère — cette fonction est partagée par de nombreux endpoints. Toute modification peut avoir des effets de bord.
- Les logs de debug (A.1 et A.3) doivent être **supprimés** après confirmation du fix.
- Si le bug vient d'un race condition (les filtres ne sont pas encore à jour quand l'appel est fait), vérifier si le `useEffect` de `DashboardAlerts` dépend bien de `filters` (l'alias de `appliedFilters` debounced) — c'est le cas (ligne 56).

---

## Modification B — Répartition par type de contrat : graphe figé non fonctionnel

### Diagnostic précis

Dans `DistributionCharts.tsx` (état actuel après Phase 1) :

**Ligne 209** : `const isContractTypeFrozen = filters.type_contrat_spc.length > 0`

**Ligne 216-217** : 
```tsx
const contractTypePieData = (isContractTypeFrozen ? contractTypeDataFull : contractTypeData)
  .map((d: any) => ({ name: d.type_contrat, value: d.total_written_premium }))
```

**Ligne 231-234** :
```tsx
const getContractTypeCellFill = (typeName: string, index: number): string => {
  const baseColor = CHART_COLORS[index % CHART_COLORS.length]
  if (!isContractTypeFrozen) return baseColor
  return filters.type_contrat_spc.includes(typeName) ? baseColor : `${baseColor}55`
}
```

**Le problème** : Le graphe utilise `contractTypeDataFull` (données sans filtre `type_contrat_spc`) quand le filtre est actif — c'est correct. La coloration met en avant les types qui correspondent à `filters.type_contrat_spc` — c'est aussi correct en théorie.

**MAIS** : L'endpoint `/kpis/by-contract-type` (lignes 309-325 de `kpis.py`) groupe par la colonne `TYPE_OF_CONTRACT` (valeurs : `PROPORT.`, `XOL`, `QUOTA SHARE`, `SURPLUS`, `AUTRES`). 

Le filtre `type_contrat_spc` dans `FilterPanel` correspond à `INT_SPC_TYPE` (valeurs : `FAC`, `TTY`, `TTE`). Ces sont **deux colonnes différentes**. Quand l'utilisateur sélectionne `FAC` dans le filtre spécialité, `apply_analysis_filters` filtre `df["INT_SPC_TYPE"].isin(["FAC"])` — ce qui réduit le dataset aux contrats FAC, mais le graphe "Répartition par type de contrat" groupe par `TYPE_OF_CONTRACT` (les valeurs comme `PROPORT.`, `XOL`...).

Ainsi quand `type_contrat_spc = ["FAC"]` est actif et `isContractTypeFrozen = true` :
- `contractTypeDataFull` est fetché avec `paramsFullContractType` = sans `type_contrat_spc`, donc retourne la vraie distribution par `TYPE_OF_CONTRACT` ✓
- La coloration vérifie `filters.type_contrat_spc.includes(typeName)` où `typeName` est une valeur de `TYPE_OF_CONTRACT` (ex: `"PROPORT."`) — mais `filters.type_contrat_spc` contient `["FAC"]` — donc **aucun segment ne correspond jamais**, tous les segments sont atténués → le graphe ne met rien en avant.

C'est pourquoi l'utilisateur voit le graphe "tout seul" / "tout atténué" / bizarre.

### Solution

**Option 1 (recommandée)** : Le filtre `type_contrat_spc` (FAC/TTY/TTE) correspond à la colonne `INT_SPC_TYPE`, pas à `TYPE_OF_CONTRACT`. La logique "figée" pour le graphe "Répartition par type de contrat" doit utiliser le filtre qui correspond à la **même dimension** que ce graphe — c'est-à-dire `type_of_contract` (PROPORT./XOL/...) depuis `FilterState`, pas `type_contrat_spc`.

Autrement dit :
- **Graphe "Répartition par type de contrat"** groupe par `TYPE_OF_CONTRACT` → figé si `filters.type_of_contract.length > 0` (filtre "Type de contrat" dans FilterPanel, section "Type de contrat")
- **Graphe "Répartition par spécialité"** groupe par `INT_SPC_TYPE` → figé si `filters.type_contrat_spc.length > 0` (filtre "Spécialité" → Type FAC/TTY/TTE)

**Option 2** : Garder la confusion actuelle (type_contrat_spc → graphe type contrat) mais corriger la logique de mise en avant.

→ **Option 1 est la correcte** car elle correspond à la sémantique métier.

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx`
- **Frontend** : `frontend/src/context/DataContext.tsx` (ajouter `'type_of_contract'` à `filtersToParamsExcluding`)
- **Backend** : `backend/routers/kpis.py` (endpoint `/kpis/by-contract-type` — vérifier qu'il ne filtre pas `type_of_contract`)

### Étapes d'implémentation

#### Étape B.1 — Ajouter `'type_of_contract'` à `filtersToParamsExcluding` dans `DataContext.tsx`

Modifier la signature de `filtersToParamsExcluding` (ligne 191) :
```typescript
// AVANT
export function filtersToParamsExcluding(
  filters: FilterState,
  exclude: 'branche' | 'type_contrat_spc' | 'specialite' | 'cedante' | 'courtier'
): Record<string, string>

// APRÈS
export function filtersToParamsExcluding(
  filters: FilterState,
  exclude: 'branche' | 'type_contrat_spc' | 'specialite' | 'cedante' | 'courtier' | 'type_of_contract' | 'pays_risque'
): Record<string, string>
```

Ajouter dans la fonction :
```typescript
if (exclude === 'type_of_contract') f.type_of_contract = []
if (exclude === 'pays_risque') f.pays_risque = []
```

#### Étape B.2 — Corriger `DistributionCharts.tsx` : changer la condition de gel pour le graphe type contrat

Dans le `useEffect` (lignes 144-193), ajouter le fetch pour `by-contract-type` sans le filtre `type_of_contract` :

```tsx
// Ajouter ce params
const paramsFullContractTypeOf = filtersToParamsExcluding(filters, 'type_of_contract')

// Dans Promise.all, remplacer :
api.get('/kpis/by-contract-type', { params: paramsFullContractType }),  // ← paramsFullContractType excluait type_contrat_spc

// Par :
api.get('/kpis/by-contract-type', { params: paramsFullContractTypeOf }),  // ← paramsFullContractTypeOf exclut type_of_contract
```

Ajouter l'état correspondant :
```tsx
const [contractTypeDataFull, setContractTypeDataFull] = useState<any[]>([])
// état déjà existant, mais maintenant alimenté par le bon fetch
```

#### Étape B.3 — Corriger les constantes de gel et la mise en avant

```tsx
// AVANT (ligne 209)
const isContractTypeFrozen = filters.type_contrat_spc.length > 0

// APRÈS
const isContractTypeFrozen = filters.type_of_contract.length > 0
```

```tsx
// AVANT (ligne 231-234)
const getContractTypeCellFill = (typeName: string, index: number): string => {
  const baseColor = CHART_COLORS[index % CHART_COLORS.length]
  if (!isContractTypeFrozen) return baseColor
  return filters.type_contrat_spc.includes(typeName) ? baseColor : `${baseColor}55`
}

// APRÈS
const getContractTypeCellFill = (typeName: string, index: number): string => {
  const baseColor = CHART_COLORS[index % CHART_COLORS.length]
  if (!isContractTypeFrozen) return baseColor
  return filters.type_of_contract.includes(typeName) ? baseColor : `${baseColor}55`
}
```

#### Étape B.4 — Mettre à jour le badge `frozenLabel` dans le `ChartCard`

```tsx
// AVANT (ligne 244)
frozenLabel={`Filtre actif (${filters.type_contrat_spc.join(', ')})`}

// APRÈS
frozenLabel={`Filtre actif (${filters.type_of_contract.join(', ')})`}
```

#### Étape B.5 — Vérifier le fetch `paramsFullContractType` utilisé pour le graphe spécialité

Le fetch pour `by-specialite` (ligne 174 actuelle) utilise `paramsFullContractType` (qui exclut `type_contrat_spc`). Cela reste correct — le graphe spécialité (FAC vs Traité) doit ignorer le filtre spécialité FAC/TTY/TTE. **Ne pas modifier**.

#### Étape B.6 — Vérifier l'endpoint backend `/kpis/by-contract-type`

S'assurer que l'endpoint ne filtre **pas** lui-même par `type_of_contract` (il ne doit retourner les données que filtrées par les autres dimensions — branche, pays, année, etc.). Actuellement (lignes 309-325 de `kpis.py`), l'endpoint appelle `apply_filters(df, filters)` qui inclut `apply_analysis_filters` — cette dernière filtre par `type_of_contract` si ce paramètre est fourni.

Donc quand `paramsFullContractTypeOf` est utilisé (sans `type_of_contract`), le backend ne filtrera pas par type de contrat → la distribution complète est retournée ✓.

### Points d'attention
- **Ne pas confondre** `type_contrat_spc` (= `INT_SPC_TYPE` : FAC/TTY/TTE, filtre "Spécialité" dans le panel) et `type_of_contract` (= `TYPE_OF_CONTRACT` : PROPORT./XOL/QUOTA SHARE..., filtre "Type de contrat" dans le panel). Cette confusion est la cause racine du bug.
- Le graphe **"Répartition par spécialité"** (FAC vs Traité) doit rester figé sur `type_contrat_spc` (correct, inchangé).
- Après correction, tester les deux scénarios :
  1. Filtre "Type de contrat" = `PROPORT.` → graphe figé avec PROPORT. en avant, autres atténués ✓
  2. Filtre "Spécialité" = `FAC` → graphe type contrat NON figé (change normalement) + graphe spécialité figé ✓

---

## Modification C — Top 10 pays par prime écrite : logique N sélectionnés + (10-N) complément

### Diagnostic de l'existant

Dans `DistributionCharts.tsx` (lignes 463-500 actuels) :

```tsx
{/* BAR (vertical) — top 10 countries */}
<ChartCard title="Top 10 pays par prime écrite">
  ...
  <Bar dataKey="total_written_premium" fill="url(#barGradCountry)" .../>
  ...
</ChartCard>
```

Le fetch est à la ligne 177 : `api.get('/kpis/by-country', { params })` + `setCountryData(mappedCountryData.slice(0, 10))` (ligne 191-192) — le `.slice(0, 10)` est fait **côté frontend** sur les données déjà filtrées.

Le filtre `pays_risque: string[]` dans `FilterState` correspond au filtre "Pays du risque" dans `FilterPanel`. Quand des pays sont sélectionnés, `apply_analysis_filters` filtre `df["PAYS_RISQUE"].isin(params.pays_risque)` — ce qui limite le dataset aux seuls pays sélectionnés, rendant impossible le calcul du complément.

**Endpoint backend `/kpis/by-country`** (lignes 192-211 de `kpis.py`) : prend `filters` → `apply_filters` → groupe par `PAYS_RISQUE`. Pas de paramètre `selected_countries` existant.

### Architecture de la solution

Même pattern que cédantes (#6) et courtiers (#7) :
1. Modifier l'endpoint backend `/kpis/by-country` pour accepter `selected_countries`
2. Si `selected_countries` est fourni → filtrer sans `pays_risque`, séparer sélectionnés + complément, retourner N sélectionnés + (10-N) top
3. Ajouter `is_selected: bool` dans chaque entrée
4. Modifier `filtersToParamsExcluding` pour supporter `'pays_risque'` (déjà prévu en B.1)
5. Modifier le fetch dans `DistributionCharts.tsx`
6. Colorer les barres distinctement

### Fichiers concernés
- **Frontend** : `frontend/src/components/Charts/DistributionCharts.tsx`
- **Backend** : `backend/routers/kpis.py` (endpoint `/kpis/by-country`)
- **Frontend** : `frontend/src/context/DataContext.tsx` (`filtersToParamsExcluding` — couvert par B.1)

### Étapes d'implémentation

#### Étape C.1 — Modifier l'endpoint `/kpis/by-country` dans `kpis.py`

Remplacer la définition actuelle (lignes 192-211) :

```python
@router.get("/by-country")
def kpis_by_country(
    contract_type_view: Optional[str] = Query(None),
    vie_non_vie_view: Optional[str] = Query(None),
    selected_countries: Optional[str] = Query(None),  # NOUVEAU: CSV de noms de pays
    top: int = Query(10),                              # NOUVEAU: limite du top
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user)
):
    df = get_df()

    # Si selected_countries fourni, ne PAS appliquer le filtre pays_risque standard
    if selected_countries:
        selected_list = [p.strip() for p in selected_countries.split(",") if p.strip()]
        filters_no_pays = filters.model_copy(update={"pays_risque": None})
        df = apply_filters(df, filters_no_pays)
    else:
        df = apply_filters(df, filters)

    df = apply_view_filters(df, contract_type_view, vie_non_vie_view)

    if df.empty or "PAYS_RISQUE" not in df.columns:
        return []

    all_results = []
    for pays, group in df.groupby("PAYS_RISQUE"):
        if not pays:
            continue
        kpis = compute_kpi_summary(group)
        is_sel = bool(selected_countries and str(pays).strip() in selected_list)
        all_results.append({"pays": pays, "is_selected": is_sel, **kpis})

    all_results.sort(key=lambda x: x["total_written_premium"], reverse=True)

    if selected_countries:
        selected_results = [r for r in all_results if r["is_selected"]]
        complement_results = [r for r in all_results if not r["is_selected"]]
        n_complement = max(0, top - len(selected_results))
        final = selected_results + complement_results[:n_complement]
        final.sort(key=lambda x: x["total_written_premium"], reverse=True)
        return final

    return all_results[:top]
```

#### Étape C.2 — Modifier le fetch dans `DistributionCharts.tsx`

Ajouter `countryData` avec `is_selected` et construire les params dynamiquement :

```tsx
// Dans le useEffect, remplacer le fetch by-country actuel (ligne 177) :

// AVANT
api.get('/kpis/by-country', { params }),

// APRÈS
const selectedPays = filters.pays_risque
const countryParams = selectedPays.length > 0
  ? (() => {
      const p = filtersToParamsExcluding(filters, 'pays_risque')
      return { ...p, top: 10, selected_countries: selectedPays.join(',') }
    })()
  : { ...params, top: 10 }

api.get('/kpis/by-country', { params: countryParams }),
```

#### Étape C.3 — Supprimer le `.slice(0, 10)` côté frontend

La limitation à 10 est maintenant gérée côté backend via le paramètre `top`. Supprimer la ligne 191 actuelle :

```tsx
// AVANT (lignes 187-192)
const mappedCountryData = co.data.map((item: any) => ({
  ...item,
  pays: COUNTRY_NAME_MAP[item.pays?.toUpperCase() || ''] || item.pays
}))
setCountryData(mappedCountryData.slice(0, 10))  // ← SUPPRIMER .slice(0, 10)

// APRÈS
const mappedCountryData = co.data.map((item: any) => ({
  ...item,
  pays: COUNTRY_NAME_MAP[item.pays?.toUpperCase() || ''] || item.pays
}))
setCountryData(mappedCountryData)  // le top 10 est géré par le backend
```

#### Étape C.4 — Ajouter la coloration par `Cell` dans le BarChart pays

Remplacer le `<Bar fill="url(#barGradCountry)">` (lignes 488-497 actuel) par :

```tsx
<Bar
  dataKey="total_written_premium"
  name="Prime écrite"
  radius={[4, 4, 0, 0]}
  isAnimationActive
  animationDuration={900}
  animationEasing="ease-out"
>
  {countryData.map((entry: any, i: number) => (
    <Cell
      key={i}
      fill={entry.is_selected ? 'hsl(83,50%,45%)' : 'url(#barGradCountry)'}
    />
  ))}
</Bar>
```

> ⚠️ Supprimer l'attribut `activeBar` du `Bar` car il n'est pas compatible avec l'utilisation de `Cell` individuels (il s'applique à la barre active au hover, ce qui peut créer des conflits visuels). Optionnel : le conserver mais en le définissant correctement.

#### Étape C.5 — Ajouter le badge `frozen` sur le `ChartCard` pays

```tsx
// AVANT (ligne 464)
<ChartCard title="Top 10 pays par prime écrite">

// APRÈS
<ChartCard
  title="Top 10 pays par prime écrite"
  frozen={filters.pays_risque.length > 0}
  frozenLabel={`${filters.pays_risque.length} sélectionné(s) mis en avant`}
>
```

#### Étape C.6 — S'assurer que `filtersToParamsExcluding` supporte `'pays_risque'`

Cette étape est couverte par **B.1** — ajouter `'pays_risque'` au type union et à la logique d'exclusion dans `DataContext.tsx`.

### Points d'attention
- **Mapping `COUNTRY_NAME_MAP`** : les noms de pays dans `filters.pays_risque` sont en français (ex: `"MAROC"`) et correspondent à `PAYS_RISQUE` dans le backend. Le mapping vers les noms anglais (pour WorldMap) est fait **côté frontend après réception**. Pour le top 10, le champ `pays` retourné par le backend est en français → la coloration `entry.is_selected` utilise le nom français → correct.
- **L'endpoint `by-country` est aussi utilisé par `WorldMap.tsx`** (ligne 102 de `WorldMap.tsx`). La modification de l'endpoint doit être **rétrocompatible** : si `selected_countries` n'est pas fourni, le comportement original est conservé. ✓ (géré dans l'étape C.1)
- Vérifier que la `WorldMap` ne transmet pas accidentellement `pays_risque` comme `selected_countries` — la `WorldMap` appelle directement `api.get(API_ROUTES.KPIS.BY_COUNTRY, { params })` avec `filtersToParams(filters)`, donc `selected_countries` ne sera jamais inclus → aucun impact.
- **Gestion des pays sans contrats** : si un pays sélectionné dans le filtre n'a aucun contrat dans la période filtrée, sa barre apparaîtra avec valeur 0. C'est acceptable pour l'UX (montre que le pays est sélectionné mais n'a pas de données).

---

## Ordre d'implémentation recommandé pour la Phase 2

```
1. Modification B (Répartition type contrat — fix le bug le plus visible)
   ├── B.1 Étendre filtersToParamsExcluding (DataContext.tsx)
   ├── B.2 Corriger le fetch dans DistributionCharts.tsx (changer paramsFullContractType)
   ├── B.3 Corriger isContractTypeFrozen (type_of_contract au lieu de type_contrat_spc)
   ├── B.4 Corriger getContractTypeCellFill
   └── B.5 Mettre à jour frozenLabel

2. Modification C (Top 10 pays — nouveau endpoint backend + frontend)
   ├── C.1 Modifier /kpis/by-country dans kpis.py
   ├── C.2 Modifier le fetch dans DistributionCharts.tsx
   ├── C.3 Supprimer .slice(0, 10) frontend
   ├── C.4 Colorer les barres avec Cell
   └── C.5 Ajouter badge frozen sur ChartCard

3. Modification A (Alertes — debug + fix)
   ├── A.1 Ajouter logs backend (temporaire)
   ├── A.3 Ajouter logs frontend (temporaire)
   ├── A.5 Corriger le cas selon ce que montrent les logs
   └── Supprimer les logs après confirmation
```

## Résumé des fichiers modifiés

| Fichier | Modifications |
|---|---|
| `frontend/src/context/DataContext.tsx` | B.1 — étendre `filtersToParamsExcluding` avec `type_of_contract` et `pays_risque` |
| `frontend/src/components/Charts/DistributionCharts.tsx` | B.2, B.3, B.4, B.5 (fix type contrat) + C.2, C.3, C.4, C.5 (top pays) |
| `backend/routers/kpis.py` | C.1 (modifier `/kpis/by-country`) + A.1 (log debug alertes, temporaire) |
| `frontend/src/components/DashboardAlerts.tsx` | A.3 (log debug, temporaire) |
| `backend/services/data_service.py` | A.2 (optionnel, si le bug alertes vient de là) |
