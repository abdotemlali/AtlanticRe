# Portail Atlantic Re — État d'avancement Phase 1
**Mis à jour le : 6 avril 2026**
**Auteur : Analyse automatique du code source**

---

## Contexte général

Ce document décrit l'état réel de l'implémentation après le travail du binôme sur la Phase 1. Il fait le bilan tâche par tâche du cahier des charges du 2 avril 2026.

**Stack technique en place :**
- **Backend** : FastAPI (Python) — `backend/`
- **Frontend** : React + TypeScript + Vite + TailwindCSS — `frontend/src/`
- **Données** : Chargement Excel en mémoire via `data_service.py`
- **Authentification** : JWT, rôles admin/souscripteur/lecteur

---

## Résumé global

| Catégorie | Terminé | Partiel | Non démarré |
|-----------|---------|---------|-------------|
| Fondation transverse | 4/5 | 0 | 1 (en attente) |
| Dashboard | 5/7 | 1 | 1 |
| Contrats | 0/1 | 0 | 1 |
| Analyse marché | 5/5 | 0 | 0 |
| Analyse cédante | 3/3 | 0 | 0 |
| Comparaison | 1/4 | 0 | 3 |
| Exposition & Risques | 0/1 | 1 | 0 |

**Total implémenté (pleinement) : ~18/25**
**Partiellement implémenté : ~2/25**
**Non démarré ou bloqué : ~5/25**

---

## 1. Fondation transverse

### ✅ T1.1 — Normalisation des noms de brokers
**Statut : FAIT (partiel — sans fichier de mappage)**

Le backend charge et normalise les brokers via `data_service.py`. La colonne `INT_BROKER` est nettoyée (strip, fillna) à la ligne 101-107 de `data_service.py`. En revanche, **le fichier de mappage `MotCle → Broker_Canonique` n'est pas intégré** : il n'y a pas de dictionnaire de synonymes/canonisation avancée dans le code. La normalisation actuelle est minimaliste (whitespace uniquement).

**Ce qui reste à faire :** intégrer un fichier CSV/dict de mappage broker → nom canonique dans `load_excel()`.

---

### ⏳ T1.2 — Normalisation des noms de cédantes
**Statut : EN ATTENTE (bloqué)**

Tâche explicitement en attente du fichier de mappage fourni par l'encadrant. Aucun code correspondant n'existe. La normalisation des cédantes se limite au strip/fillna identique aux brokers.

---

### ✅ T1.3 — Détection type cédante : Assureur / Réassureur
**Statut : FAIT (complet)**

Entièrement implémenté :
- `backend/services/classification_rules.py` : fonction `classify_cedante()` avec les règles exactes de la formule Excel (suffixes ` re` / ` ré`, mots-clés ` reinsurance` / ` reins` / ` réassurance` / ` reassurance`).
- `data_service.py` ligne 87-91 : colonne `TYPE_CEDANTE` créée au chargement si absente.
- `schemas.py` : `FilterParams` inclut `type_cedante: Optional[List[str]]`.
- `data_service.py` `apply_identity_filters()` ligne 181-183 : filtre actif sur `TYPE_CEDANTE`.
- `get_filter_options()` retourne `type_cedante_options`.

---

### ✅ T1.4 — Classification Vie / Non-vie
**Statut : FAIT (complet)**

Entièrement implémenté :
- `classification_rules.py` : fonction `classify_lob()` — branche contenant `"non"+"vie"` → `NON_VIE`, branche contenant `"vie"` → `VIE`, sinon `NON_VIE`.
- `data_service.py` ligne 94-98 : colonne `VIE_NON_VIE` créée.
- `kpis.py` : fonction `apply_view_filters()` ligne 116-122 applique le filtre `vie_non_vie_view` sur tous les endpoints pertinents (`by-country`, `market/profile`, `market/by-year`, `country/profile`, `country/by-year`).
- Le toggle Vie/Non-vie est propagé correctement via le paramètre de requête `vie_non_vie_view`.

---

### ✅ T1.5 — Toggle Vie / Non-vie global (FilterPanel)
**Statut : FAIT (présent sur plusieurs pages mais via toggles locaux, pas global)**

**Nuance importante :** Le toggle Vie/Non-vie n'est **pas** dans le `FilterPanel` global de la sidebar. Il est implémenté comme **toggle local** (pill buttons) dans :
- `Analysis.tsx` : un toggle local `vieView` (ALL / VIE / NON_VIE)
- `CedanteAnalysis.tsx` : un toggle local `vieView` (ALL / VIE / NON_VIE)

Ces toggles communiquent avec le backend via `vie_non_vie_view` en query param.

**Ce qui manque selon le cahier des charges :** Le toggle n'est pas dans le `FilterPanel.tsx` de la sidebar (qui s'appliquerait à toutes les pages). Il n'est pas non plus présent sur le Dashboard ni la page Comparaison.

---

## 2. Dashboard

### ✅ T2.1 — Filtre "Année de souscription" en première position avec défaut N
**Statut : FAIT (complet)**

- `FilterPanel.tsx` ligne 390 : section "Année de souscription" en première position.
- Composant `YearFilter` avec 3 modes : Spécifique / Plusieurs / Toutes.
- Mode "Spécifique" sélectionne par défaut la dernière année (côté frontend, prend `uwYears[last]`).
- `get_filter_options()` dans `data_service.py` ligne 330 : calcule `uw_year_default = max(UNDERWRITING_YEAR)`.
- `DataContext` initialise avec `uw_year_default` comme valeur par défaut (à vérifier dans `DataContext.tsx`).
- Le filtre s'applique à tous les KPIs via `apply_identity_filters()`.

---

### ✅ T2.2 — Filtre "Type cédante" (Assureur / Réassureur)
**Statut : FAIT (complet)**

- `FilterPanel.tsx` lignes 396-415 : section "Type cédante" en 2e position avec checkboxes ASSUREUR / REASSUREUR.
- `FilterParams` inclut `type_cedante`.
- `apply_identity_filters()` filtre sur `TYPE_CEDANTE`.
- `parse_filter_params()` dans `kpis.py` ligne 38, 62 : parse le paramètre `type_cedante`.

---

### ✅ T2.3 — Valeurs au survol sur le graphique d'évolution
**Statut : FAIT (complet)**

`EvolutionChart.tsx` : tooltips Recharts activés avec un composant `CustomTooltip` personnalisé (glassmorphism navy, formatage compact/%). L'`EvolutionChart` utilise `LineChart` avec `<Tooltip content={<CustomTooltip />} />`.

---

### ✅ T2.4 — Pourcentages dans la répartition
**Statut : FAIT (complet)**

`DistributionCharts.tsx` lignes 52-64 : fonction `renderCustomLabel` affiche le `%` à l'intérieur des tranches de PieChart/Donut. Appliqué aux deux graphiques circulaires (type de contrat et branche).

---

### ⚠️ T2.5 — Afficher le pays avec ses infos sur la carte mondiale
**Statut : PARTIELLEMENT FAIT**

`WorldMap.tsx` : la carte affiche un **tooltip glassmorphism** au survol des pays (lignes 181-216). Ce tooltip affiche : pays (en nom français), prime écrite, loss ratio, résultat, nombre de contrats. 

**Ce qui manque selon le cahier des charges :** Des **labels permanents** sur la carte (nom du pays affiché directement sur la géographie). Actuellement seul le tooltip au hover existe.

---

### ✅ T2.6 — Top cédantes : FAC et Traité séparés
**Statut : FAIT (complet)**

- Backend `kpis.py` `/by-cedante` (ligne 298-320) : paramètre `type_contrat_view` filtrant FAC vs TREATY.
- Frontend `DistributionCharts.tsx` lignes 159-165 + 350-365 : toggle ALL/FAC/TREATY sur le widget "Top 10 cédantes par prime écrite".

---

### ✅ T2.7 — Top brokers (courtiers)
**Statut : FAIT (complet)**

`DistributionCharts.tsx` lignes 303-346 : widget "Top 10 courtiers par prime écrite" fonctionnel. Backend `/kpis/by-broker` (ligne 262-275 de `kpis.py`). Le widget est visible et fonctionnel dans l'onglet "Répartition" du Dashboard.

---

## 3. Contrats

### ❌ T3.1 — Format de date : dd-mm-yy → dd/mm/yyyy
**Statut : NON FAIT**

Les dates (`INCEPTION_DATE`, `EXPIRY_DATE`, `DATE_CLOSED`) sont parsées en datetime par `_safe_date()` dans `data_service.py` mais leur **formatage en `dd/mm/yyyy` dans le tableau des contrats n'est pas encore corrigé** côté frontend. Il n'y a pas de formatter de date centralisé dans `formatters.ts` pour les dates de contrats.

**Fichier à modifier :** `frontend/src/components/DataTable.tsx` ou le helper de formatage.

---

## 4. Analyse marché

### ✅ T4.1 — FAC / Traité dans l'analyse par pays
**Statut : FAIT (complet)**

- Backend `/kpis/by-country` ligne 192-211 : paramètre `contract_type_view` (FAC/TREATY) via `apply_view_filters()`.
- Frontend `Analysis.tsx` ligne 182-184 : state `contractTypeView`, propagé en query param.
- Toggles visuels présents lignes 554-580.

---

### ✅ T4.2 — Vie / Non-vie dans l'analyse par pays
**Statut : FAIT (complet)**

- Backend `/kpis/by-country` et `/country/profile` etc. : paramètre `vie_non_vie_view` via `apply_view_filters()`.
- Frontend `Analysis.tsx` : toggle `vieView` propagé en query param.

---

### ✅ T4.3 — Vie / Non-vie dans l'analyse par cédante
**Statut : FAIT (complet)**

- Backend `/kpis/cedante/profile` ligne 392 : `vie_non_vie_view` appliqué sur `df_identity` et `analysis_group`.
- Backend `/kpis/cedante/by-year` ligne 482 : idem.
- Backend `/kpis/cedante/by-branch` ligne 513 : idem.
- Frontend `CedanteAnalysis.tsx` lignes 60-61 : state `vieView`, toggle ALL/VIE/NON_VIE visible.

---

### ✅ T4.4 — Évolution par an dans l'analyse marché
**Statut : FAIT (complet)**

- Backend `/kpis/market/by-year` (ligne 680), `/kpis/country/by-year` (ligne 734) : endpoints existants, supportent les nouveaux filtres (`contract_type_view`, `vie_non_vie_view`).
- Frontend `Analysis.tsx` ligne 274 : `useFetch` sur `API_ROUTES.COUNTRY.BY_YEAR` ou `API_ROUTES.MARKET.BY_YEAR`.
- Chart d'évolution historique (ComposedChart) affiché lignes 620-668.

---

### ✅ T4.5 — Vue croisée pays × FAC/Traité
**Statut : FAIT (complet)**

- Backend `/kpis/by-country-contract-type` (lignes 825-866 de `kpis.py`) : endpoint retournant prime FAC, prime Traité, nombre contrats FAC/Traité par pays.
- Frontend `Analysis.tsx` : composant `CrossMarketWidget` (lignes 31-146) — BarChart groupé FAC vs Traité pour les 10 premiers pays, + tableau détaillé avec pourcentages.
- Widget visible sur la page Analyse quand aucun pays n'est sélectionné, avec son propre toggle Vie/Non-vie.

---

## 5. Analyse cédante

### ✅ T5.1 — Badge type cédante (Assureur / Réassureur)
**Statut : FAIT (complet)**

`CedanteAnalysis.tsx` lignes 197-212 : badge pill affiché à côté du nom de la cédante. Couleur verte pour "Réassureur", bleue pour "Assureur direct". Données provenant de `profile.type_cedante` (retourné par `/kpis/cedante/profile`).

---

### ✅ T5.2 — Indicateur de diversification par branches
**Statut : FAIT (complet)**

- Backend `/kpis/cedante/profile` : retourne `branches_actives` (nombre de branches avec prime > 0, calculé sur `df_identity` immunisé contre le filtre branche).
- Frontend `CedanteAnalysis.tsx` : 
  - KPI card "Diversification (Branches)" avec jauge colorée (vert ≥ seuil, rouge < seuil).
  - Rapport complet de diversification (lignes 519-628) : score %, gauge avec marqueur de seuil, liste des branches actives/inactives.
  - Paramètres `N` (total branches, défaut 12) et `SeuilVert` (défaut 40%) modifiables localement via rangée de sliders/inputs — **non persistés en base** ✓.
  - Icône d'alerte FAC dans la liste des branches si saturation.

---

### ✅ T5.3 — Affaire facultative saturée par cédante
**Statut : FAIT (complet)**

- Backend `/kpis/cedante/profile` lignes 427-443 : calcul des alertes FAC — branche avec > 5 affaires ET prime > 1M DH → ajoutée à `fac_saturation_alerts`.
- Backend `/kpis/cedante/fac-saturation` (lignes 791-822) : endpoint dédié avec seuils paramétrables (`seuil_prime`, `seuil_affaires`).
- Frontend `CedanteAnalysis.tsx` :
  - Alerte globale animée (pulse rouge) dans le header si des branches sont saturées (lignes 214-220).
  - Icône d'alerte dans la liste des branches et dans le tableau de commissions.
- Page dédiée `FacSaturation.tsx` : page spéciale listant les saturations FAC par cédante.

---

## 6. Comparaison

### ✅ T6.1 — Badge type cédante dans la comparaison
**Statut : NON FAIT (interface présente mais badge absent)**

`Comparison.tsx` : le mode "Par cédante" existe et fonctionne. Cependant, le **badge Assureur/Réassureur** n'est **pas affiché** dans l'interface de comparaison (les composants `KPICol` ne reçoivent pas `type_cedante`).  
Le backend `/comparison/by-cedante` ne retourne pas `type_cedante` dans sa réponse.

---

### ❌ T6.2 — Indicateur de diversification dans la comparaison
**Statut : NON FAIT**

Le score de diversification (branches actives / N) n'est pas affiché dans la page `Comparison.tsx`. Le backend `/comparison/by-cedante` ne retourne pas `branches_actives`.

---

### ❌ T6.3 — FAC / Traité dans la comparaison
**Statut : NON FAIT**

Il n'y a aucun toggle FAC/Traité dans `Comparison.tsx`. Les endpoints de comparaison ne acceptent pas `contract_type_view` ni n'appliquent `apply_view_filters()`.

---

### ❌ T6.4 — Vie / Non-vie dans la comparaison
**Statut : NON FAIT**

Aucun toggle Vie/Non-vie dans `Comparison.tsx`. Les endpoints de comparaison ne supportent pas `vie_non_vie_view`.

---

## 7. Exposition & Risques

### ⚠️ T7.1 — Nouveaux filtres : année, branche, pays, cédante
**Statut : PARTIELLEMENT FAIT**

- Backend : les endpoints `/kpis/exposition/by-country`, `/kpis/exposition/by-branch`, `/kpis/exposition/top-risks` supportent déjà `FilterParams` complet (y compris `uw_year_min/max`, `branche`, `pays_risque`, `cedante`).
- Frontend `ExpositionRisques.tsx` : utilise `getScopedParams(location.pathname, filters)` qui propage les filtres globaux du `FilterPanel`. Un `PageFilterPanel` et un `ActiveFiltersBar` sont affichés.

**Ce qui manque selon le cahier des charges :** Des **filtres dédiés locaux** sur la page ExpositionRisques (sélecteurs spécifiques à la page pour année/branche/pays/cédante, indépendants du panel global). Actuellement seul le panneau global est utilisé.

---

## Points en attente — confirmés toujours bloqués

| Point | Statut |
|-------|--------|
| Normalisation des noms de cédantes | ⏳ En attente du fichier de mappage fourni par l'encadrant |
| Part cible pour les traités | ⏳ En attente de la formule de calcul |

---

## Architecture technique — état actuel

### Backend (`backend/`)

```
backend/
├── services/
│   ├── data_service.py          ← Chargement Excel, filtres (identity/analysis/financial), KPIs
│   ├── classification_rules.py  ← classify_cedante(), classify_lob()
│   └── scoring_service.py       ← Scoring marché
├── routers/
│   ├── kpis.py                  ← Tous les endpoints KPI (38 Ko, 867 lignes)
│   ├── comparison.py            ← Comparaison marché/pays/cédante
│   ├── contracts.py             ← Tableau contrats paginé
│   └── export.py                ← Export CSV/Excel
├── models/
│   └── schemas.py               ← FilterParams, FilterOptions, KPISummary, etc.
```

**Colonnes dérivées créées au chargement :**
- `TYPE_CEDANTE` : REASSUREUR / ASSUREUR DIRECT
- `VIE_NON_VIE` : VIE / NON_VIE
- `INT_SPC_PERIMETRE`, `INT_SPC_TYPE`, `INT_SPC_SPECIALITE` : parsing de `INT_SPC`

**Séparation des filtres :**
- `apply_identity_filters()` : années, cédante, courtier, périmètre, statuts, type_cedante
- `apply_analysis_filters()` : branche, sous-branche, pays, type contrat, spécialité
- `apply_financial_filters()` : seuils numériques
- `apply_view_filters()` : vue locale FAC/TREATY + VIE/NON_VIE (non-persisté dans FilterParams)

### Frontend (`frontend/src/`)

```
frontend/src/
├── pages/
│   ├── Dashboard.tsx           ← Tabs: carte, évolution, répartition, pivot, contrats, finances, rentabilité
│   ├── Analysis.tsx            ← Mode pays/marché, CrossMarketWidget, toggles FAC+Vie
│   ├── CedanteAnalysis.tsx     ← Fiche cédante, diversification, saturation FAC, toggle Vie
│   ├── Comparison.tsx          ← Mode marché/pays/cédante — radiomètre, évolution
│   ├── ExpositionRisques.tsx   ← Carte, barres pays/branche, tableau top risques
│   └── FacSaturation.tsx       ← Page dédiée saturation FAC (non listée dans le cahier)
├── components/
│   ├── FilterPanel.tsx         ← Sidebar globale (année 1ère position, type_cedante, etc.)
│   ├── PageFilterPanel.tsx     ← Panel secondaire par page (scoped)
│   ├── KPICards.tsx            ← 6 KPI cards Dashboard
│   ├── Charts/
│   │   ├── EvolutionChart.tsx  ← LineChart multi-séries, tooltips activés
│   │   ├── DistributionCharts.tsx ← PieChart %, BarChart top courtiers/cédantes avec toggle FAC
│   │   ├── WorldMap.tsx        ← Carte avec tooltips hover, colorBy premium/exposition
│   │   └── ...
```

---

## Tâches restantes — Priorisation suggérée

### Priorité haute (impacte d'autres features)
1. **T3.1** — Correctif format date contrats (dd/mm/yyyy) — impact UX direct
2. **T1.1** — Intégration fichier mappage brokers (quand disponible)

### Priorité moyenne
3. **T6.3** — FAC/Traité dans la comparaison (backend + frontend)
4. **T6.4** — Vie/Non-vie dans la comparaison (backend + frontend)
5. **T6.2** — Diversification dans la comparaison (backend + frontend)
6. **T6.1** — Badge type cédante dans la comparaison (frontend uniquement)
7. **T1.5** — Toggle Vie/Non-vie dans FilterPanel global (pour couverture Dashboard + Comparaison)

### Priorité basse
8. **T2.5** — Labels permanents pays sur WorldMap
9. **T7.1** — Filtres dédiés locaux sur ExpositionRisques

### Bloqué — attente encadrant
10. **T1.2** — Normalisation noms cédantes (en attente fichier)
11. **Part cible traités** — formule à confirmer

---

## Notes importantes pour la session suivante

1. **La colonne `VIE_NON_VIE` utilise les valeurs `"VIE"` et `"NON_VIE"` (sans accents)**. Le filtre `apply_view_filters()` compare avec `== "VIE"` ou `== "NON_VIE"`. La fonction `classify_lob()` retourne ces constantes depuis `classification_rules.py`.

2. **Le toggle Vie/Non-vie n'est pas dans `FilterState`** (pas de champ `vie_non_vie` dans `DataContext`). Il est géré en état local par page. Pour une vraie globalisation, il faudrait ajouter ce champ au `FilterState` et au `FilterPanel`.

3. **`FilterParams.type_cedante` utilise des valeurs MAJUSCULES** (`"REASSUREUR"`, `"ASSUREUR DIRECT"`). Le FilterPanel affiche ces valeurs normalisées (`"REASSUREUR" → "Réassureur"`).

4. **La page `FacSaturation.tsx`** est présente dans `frontend/src/pages/` et dans l'App routing mais n'était pas demandée dans le cahier des charges original — elle est un bonus.

5. **`apply_view_filters()` est distincte de `FilterParams`** — c'est une couche de filtrage local à l'endpoint, non persistée dans le state global. Elle reçoit `contract_type_view` et `vie_non_vie_view` comme query params séparés.

6. **Le calcul `branches_actives` dans `/cedante/profile` est immunisé contre les filtres branche** — il utilise `df_identity` (filtres identitaires uniquement) pour calculer la diversification globale de la cédante, indépendamment des filtres d'analyse actifs.
