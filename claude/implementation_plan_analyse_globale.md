# Plan d'Implémentation : Refonte Analyse Globale

## 1. Philosophie Générale
La logique clé est d'implémenter un filtrage **non destructif**. L'utilisateur conservera le contexte de ses données :
- **KPIs** : stricts et locaux à la sélection.
- **Top 10 (Bar Chart)** : hybride (sélection prioritaire + complémentaire jusqu'à 10).
- **Distribution (Pie Chart)** : fixe (100% du portefeuille), où la sélection conserve une couleur vive et le reste devient transparent.
- **Tableaux** : toutes entités affichées, lignes sélectionnées surlignées.
- **Cartes** : mise en surbrillance des pays filtrés, reste atténué.

## 2. Fusion des Onglets
**Fichier affecté** : `frontend/src/pages/Analysis.tsx` (ex GlobalAnalysis)
- **Action** : 
  - Retrait du mode binaire `('country' | 'market')`. 
  - Remplacement par un mode unifié "Par pays".
  - Les KPIs s'adapteront dynamiquement selon qu'une (ou des) branche(s) est sélectionnée ou non.

## 3. Ajout du Panneau de Filtre Local
**Fichier affecté** : `frontend/src/pages/Analysis.tsx` & `frontend/src/constants/pageFilterScopes.ts`
-  Ajouter `'/analyse-globale'` dans `pageFilterScopes.ts` avec les clés : `['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'sous_branche', 'type_of_contract', 'type_contrat_spc', 'pays_cedante']`.
- **UI du Filtre Local** : 
  - *Année de souscription* : Select.
  - *Branche* : Multi-select (couleurs dynamiques selon l'ordre : Rouge, Vert, Bleu, Orange, Violet, Gris).
  - *Type Contrat (INT_SPC_TYPE)* : Multi-select (FAC, TTY, TTE).
  - *Vie / Non-Vie* : Toggle ou Selector (Tous, Vie, Non-Vie).
  - *Bouton "Réinitialiser"* aligné à droite.

## 4. Logiques des Requêtes et "Params Immunisés"
Création de sous-contextes de params dans `Analysis.tsx` pour gérer le cache local :
- `params` : Pour les KPIs, Data Table, Top Branches et Carte (quand un pays est cliqué/sélectionné).
- `paramsNoBranch` : Retrait de `branche`. Utilisé pour Pie Chart (Mix branche).
- `paramsNoCountry` : Retrait de `pays_cedante`. Utilisé pour garder le visuel global de la carte `WorldMap.tsx`.
- `paramsNoYear` : Retrait de `uw_years`, `min`, `max`. Utilisé pour le Chart d'Évolution Historique.

## 5. Composants Graphiques Adaptés
**Top Bar Chart (Branches)** :
- Calcul : Filtrer les branches par sélection (assigner is_selected = true). Compléter par les branches non sélectionnées au meilleur KPI jusqu'à avoir 10 barres.
- UI : Barres de la sélection selon "palette dynamique", badge "Hors Top 10" injecté dans les tooltips/composants si une branche choyée s'y trouve par forçage. Autres barres en Gris (`#94A3B8`).

**Pie Chart (Mix branches)** :
- Données : Propulsées par `paramsNoBranch`.
- UI : Si filtre actif, les slices sélectionnées ont `fill="{couleur_dynamique}"` et les non-sélectionnées ont `fill="{baseColor}44"`.

**Tableaux** :
- UI conditionnel : Ajout d'une property CSS ou style in-line `background: isSelected ? 'hsla(83, 52%, 36%, 0.06)' : 'transparent'` sur chaque `<tr/>`.

**WorldMap** :
- **Fichier affecté** : `frontend/src/components/Charts/WorldMap.tsx`
- Si pays sélectionné (Global filter ou Local filter) -> Ajout des Badges Code Pays.
- Couleurs et Tooltip sur la `data` immunisée (`paramsNoCountry`), mais les "selected" reçoivent l'opacité 100% et couleur vive, et non-selected passent à opacité réduite (`0.3` par ex).

## 6. Prochaines Étapes
1. Définition des Scopes de Filtrage `pageFilterScopes.ts`.
2. Création du layout Filtre Local + Refonte du State unifié dans `Analysis.tsx`.
3. Distribution des Paramètres Immunisés dans les hooks Fetch.
4. Refactoring graphique `DistributionCharts.tsx` / Tableaux `Analysis.tsx` / `WorldMap.tsx`.
