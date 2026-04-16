# État de la Phase 1 et Tâches Restantes (À FAIRE)

Voici le bilan condensé de la Phase 1 et la roadmap des ultimes modifications à effectuer pour valider entièrement cette étape selon le cahier des charges défini.

---

## 🔴 Priorité Haute
Ces ajustements ciblent les fonctionnalités primordiales ou les interfaces directement visibles par les utilisateurs.

- **[T3.1] Correction du format de date dans la liste des contrats**
  - **Où** : `frontend/src/components/DataTable.tsx` (ou équivalent formatteur)
  - **Objectif** : Actuellement, les dates (INCEPTION_DATE, EXPIRY_DATE, etc.) remontées depuis le backend via pandas ne sont pas correctement rendues visuellement côté React. Il faut appliquer un vrai parseur vers `dd/mm/yyyy`.

- **[T1.1] Mappage pour la Normalisation des Brokers (Courtiers)**
  - **Où** : `backend/services/data_service.py`
  - **Objectif** : Compléter la normalisation basique déjà codée (nettoyage d'espaces) sous forme d'une fonction de conversion `MotCle → Broker_Canonique` (en attente potentielle du dictionnaire ou CSV par l'encadrant).

## 🟠 Priorité Moyenne (Consolidation Portabilité & Interface)
Le comportement de certains filtres spécifiques n'est pas encore harmonisé pour la zone de `Comparaison`.

- **[T6.3 & T6.4] Propagation "FAC / Traité" et "Vie / Non-Vie" dans la Comparaison**
  - **Où** : `frontend/src/pages/Comparison.tsx` / `backend/routers/comparison.py`
  - **Objectif** : Les pages de comparaison n'intègrent et ne passent pas encore les filtres de vue `contract_type_view` (FAC/Traité) et `vie_non_vie_view`. Il convient d'ajouter ces éléments localement ou de les faire provenir du `FilterPanel` afin que l'information de comparaison soit à 100% corrélée.

- **[T6.2] Indicateur de "Diversification" manquant dans Comparaison**
  - **Où** : Endpoint `/comparison/by-cedante` et UI de `Comparison.tsx`
  - **Objectif** : Permettre d'afficher le ratio des branches actives pour une comparaison directe entre deux ou plusieurs cédantes (à l'instar de la section dédiée dans la page cédante).

- **[T6.1] Ajout de badge "Type Cédante"**
  - **Où** : `frontend/src/pages/Comparison.tsx`
  - **Objectif** : Au-delà d'afficher les cédantes côte à côte, le composant devra afficher avec sa pastille couleur si l'entité concerne un "Assureur direct" ou "Réassureur" (déjà fait au niveau single-view de cédante).

- **[T1.5] Remaniement Toggle Global "Vie/Non-Vie"**
  - **Où** : `frontend/src/components/FilterPanel.tsx` et `DataContext`
  - **Objectif** : Supprimer l'état local éparpillé (`vieView`) présent dans `Analysis.tsx` et `CedanteAnalysis.tsx` au profit d'un composant de tri intégré uniformément à la sidebar globale côté React.

## 🟡 Priorité Basse / Bonus Interface

- **[T2.5] Labels Textes Permanents Pays sur la Map mondiale**
  - **Où** : `frontend/src/components/Charts/WorldMap.tsx`
  - **Objectif** : Fixer ou dessiner les labels des pays majeurs continuellement sur l'IHM Map (sans attendre le déclencheur on-hover activant le simple popup tool-tip).
  
- **[T7.1] Panneau de filtrage spécialisé (Local) de la page Risques**
  - **Où** : `frontend/src/pages/ExpositionRisques.tsx`
  - **Objectif** : Indépendantiser l'action du filtrage pour n'obéir qu'à de simples choix locaux prédominants (Année / Pays, Branche) si exigé, par opposition au filtre global persistant globalement.

---

### ⚠️ Points de Blocage / En attente des règles métier 

Ces deux points restent totalement dépendants de la transmission de formules métiers réelles, et aucun code ne peut être initié sans l'aval :
- **[T1.2] Normalisation des noms de cédantes :** Nécessite le fichier de référence de mapping synonymes de l'encadreur.
- **Section Part cible (Traités) :** Algorithme mathématique métier n'a pas encore été statué.

> **Prochaine étape conseillée :** Transmettre le document de contexte `DESCRIPTION_PROJET.md` à la nouvelle instance IA, et l'attaquer d'emblée à la résolution de la **Priorité Haute** en manipulant `DataTable.tsx` côté Client, et en préparant les ajouts endpoints pour `Comparison`.
