# Logique d'Application des Filtres — Analyse Globale

> Ce document détaille l'architecture et le comportement des filtres pour la page **Analyse Globale**. Il reprend la logique "figée" et de "mise en avant" implémentée dans l'Analyse Cédante, garantissant une expérience utilisateur cohérente et professionnelle.

---

## 1. Philosophie visuelle et de filtrage

Contrairement à un filtrage destructif standard (où les données non sélectionnées disparaissent), la nouvelle logique métier conserve le **contexte global** tout en **mettant en valeur** les sélections de l'utilisateur.

**Règles d'or applicables à l'Analyse Globale :**
1. **Badges contextuels** : Afficher clairement ce qui est filtré.
2. **KPIs dynamiques** : Les chiffres globaux s'adaptent strictement à la sélection.
3. **Graphes de distribution (Pie Charts) figés** : Ils affichent 100% de la distribution, mais les segments non sélectionnés sont visuellement atténués (opacité réduite).
4. **Classements (Top Bar Charts) hybrides** : Ils affichent toujours un Top N (ex: Top 10), composé des `S` éléments sélectionnés + les `(10 - S)` meilleurs éléments restants.
5. **Tableaux analytiques** : Affichent toutes les lignes pertinentes (ou le top global) tout en surlignant visuellement les lignes sélectionnées par les filtres.

---

## 2. Scénarios d'Application des Filtres

L'Analyse Globale possède souvent plusieurs dimensions de filtre : **Branche**, **Pays**, et **Type de contrat (SPC)**.

### Scénario A : Filtrage croisé général (ex: `type_contrat_spc` = FAC)
- **Impact sur API** : Le filtre doit être inclus dans le `pageFilterScopes.ts` pour la route `/analyse-globale` afin d'être transmis à tous les endpoints backend.
- **KPIs** : Se recalculent basés uniquement sur les contrats FAC.
- **Tous les graphes / tableaux** : Les données sources ne concernent que les contrats FAC.

### Scénario B : Sélection de Branches (ex: `branche` = ['INCENDIE'])
- **En-tête** : Affichage d'un badge "INCENDIE" dans un conteneur (badges textuels clairs avec couleurs différenciées).
- **KPIs** : Recalculés pour n'inclure que l'incendie. Indicateur `🔍 Vue filtrée` affiché.
- **Mix par Branche (Pie Chart) :**
  - Le frontend utilise un fetch **immunisé** contre le filtre `branche`.
  - Toutes les branches apparaissent. "INCENDIE" reste opaque et affiche son %, les autres branches deviennent semi-transparentes.
  - Ajout d'un tag visuel 🔒 "Vue 100%".
- **Top Secteurs/Branches (Bar Chart) :**
  - "INCENDIE" est affiché en vert (couleur de sélection) prioritairement.
  - S'il s'agit d'un Top 10, le graphe montre INCENDIE + les 9 meilleures branches non sélectionnées (colorées selon leur ULR).
- **Tableau des Performances par branche :**
  - Affiche de préférence les données immunisées.
  - La ligne "INCENDIE" a un fond vert ou accentué pour la différencier.

### Scénario C : Sélection de Pays (ex: `pays_cedante` = ['MAR', 'SEN'])
- **En-tête** : Affichage de badges "MAR" et "SEN".
- **KPIs** : Recalculés pour ces deux pays.
- **Mix par Pays (Pie Chart) :**
  - Nécessite un fetch **immunisé** contre le filtre `pays_cedante`.
  - MAR et SEN au couleur vive, reste de l'Afrique ou du monde en atténué.
- **Top Pays (Bar Chart) :**
  - MAR et SEN forcés dans l'affichage (couleur accent).
  - Complément avec le `Top 8` des autres pays (colorés par ULR).
- **Carte du monde (WorldMap) :**
  - La carte se concentre et colore MAR et SEN en priorité, ou applique une opacité aux pays non sélectionnés si on souhaite maintenir la carte globale visible.

---

## 3. Plan d'Action Technique (Modèle)

Si vous devez coder cette page, voici le squelette technique à respecter :

### 1. Scope des filtres (`pageFilterScopes.ts`)
S'assurer que toutes les clés sont actives pour récupérer les bons `params`.
```typescript
'/analyse-globale': {
  keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'sous_branche', 'type_of_contract', 'type_contrat_spc', 'pays_cedante'],
}
```

### 2. Gestion des Requêtes Immunisées (Frontend)
Dans le composant principal (ex: `GlobalAnalysis.tsx`), créer des jeux de paramètres ignorant volontairement certains filtres pour alimenter les graphes "figés".
```tsx
// Params normaux pour KPIs
const params = useMemo(() => getScopedParams(location.pathname, filters), [filters]);

// Params immunisés contre la branche pour graphes de branche
const paramsNoBranch = useMemo(() => getScopedParams(location.pathname, { ...filters, branche: [] }), [filters]);

// Params immunisés contre les pays pour graphes pays
const paramsNoCountry = useMemo(() => getScopedParams(location.pathname, { ...filters, pays_cedante: [] }), [filters]);
```

### 3. Logique de rendu "Pie Chart" (Mix)
```tsx
const isBranchFilterActive = filters.branche.length > 0;
const pieData = isBranchFilterActive ? dataAllBranches : dataFiltered;

// Au niveau des pie cells
<PieCell 
  fill={isBranchFilterActive && !filters.branche.includes(entry.name) ? `${baseColor}44` : baseColor} 
/>
```

### 4. Logique de rendu "Top N Bar Chart"
```tsx
const topChartData = useMemo(() => {
  if (!isFilterActive) return dataFiltered.slice(0, 10).map(i => ({...i, is_selected: false}));
  
  const selected = dataAll.filter(item => filters.keys.includes(item.id)).map(i => ({...i, is_selected: true}));
  const unselected = dataAll.filter(item => !filters.keys.includes(item.id)).slice(0, Math.max(0, 10 - selected.length)).map(i => ({...i, is_selected: false}));
  
  return [...selected, ...unselected].sort((a,b) => b.value - a.value);
}, [dataAll, dataFiltered, filters]);
```

### 5. Conception des Tableaux
Les tableaux qui lient ces données doivent inclure de la coloration conditionnelle sur le `<tr>` :
```tsx
<tr style={{ background: isSelected ? 'hsla(83,52%,36%,0.06)' : 'transparent' }}>
  {/* Cellules */}
</tr>
```

---

## Résumé
En appliquant ce modèle à l'Analyse Globale, on transforme une simple page en **outil d'exploration interactif**. L'utilisateur comprend immédiatement l'impact de ses filtres (KPIs filtrés) par rapport à la macro-économie de son portefeuille (graphes figés partiels).
