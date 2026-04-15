# Atlantic Re — Contexte Complet et Détaillé de l'Application (Avril 2026)

Ce document fournit le contexte exhaustif de l'application **Atlantic Re**, un portail interactif d'analyse de données de réassurance. Il est destiné à donner une compréhension approfondie de chaque fonctionnalité, de l'architecture et des spécificités métier pour guider le développement de futures évolutions.

---

## 1. Vision Métier et Objectifs

**Atlantic Re** est une plateforme d'intelligence d'affaires conçue pour les équipes de souscription, d'administration et de direction d'une société de réassurance.  
Elle remplace les tableaux Excel statiques par une vue à 360° du portefeuille :
- Analyser la performance (Primes, Résultat, ULR — Ultimate Loss Ratio).
- Évaluer le positionnement et le profil de partenaires (Cédantes, Courtiers).
- Mesurer l'exposition métier (Saturation des contrats facultatifs, Exposition au risque géographique).
- Gérer la structuration et la performance de la **Rétrocession**.
- Aider à la décision par un système de scoring des marchés, et détecter les opportunités d'affaires (Cibles TTY, clients inactifs).

---

## 2. Architecture Technique et Flux de Données

Le projet est basé sur un couplage **Backend Python (FastAPI)** et **Frontend React (Vite+TypeScript)**.

### a) Backend (FastAPI + Pandas)
- **Source de vérité** : Les données ingérées proviennent de fichiers Excel (`AtlanticRe_Reassurance.xlsx` et `AtlanticRe_Retrocession_AffairesTraites.xlsx`).
- **Traitement in-memory** : `pandas` charge les Excel dans la RAM du serveur côté backend pour du filtrage très rapide.
- **Organisation** :
  - `routers/` : Endpoints sectorisés (`kpis`, `comparison`, `retro`, `clients`, `scoring`, etc.).
  - `services/` : Contient la logique. `data_service.py` pour la lecture/nettoyage des données, `retro_service.py` pour la rétrocession, `scoring_service.py` pour évaluer les marchés.
  - `core/` & `models/` : Base de données MySQL pour stocker les profils utilisateurs (RBAC) et les logs métier (`activity_logs`).
  - Configuration globale dynamique : Les chemins d'accès aux fichiers Excel sont persistés en base de données ou dans `config.py` et modifiables via UI par l'admin.

### b) Frontend (React 18 + TailwindCSS + Recharts)
- Contextes globaux :
  - `AuthContext` : Accès et autorisations.
  - `DataContext` : Gère l'intégralité du système de filtres globaux (debounce, application, données du fichier).
- Design premium : Glassmorphism, charts interactifs (`Recharts`), animations fluides.
- UI/UX unifiée à travers des composants stratégiques commes les tableaux paginés (`DataTable`) ou les barres de filtres repliables (`FilterPanel`, `PageFilterPanel`).

---

## 3. Le Moteur de Filtres (Le Cœur du Système)

La puissance de l'application réside dans son filtrage à trois niveaux, opéré côté backend mais contrôlé dynamiquement par le frontend :
1. **Filtres Identitaires** : Isolent "qui" on regarde (Année de souscription, Cédante, Courtier, Type de Cédante, Statut).
2. **Filtres d'Analyse** : Définissent "quoi" on regarde (Branche (Vie/Non-Vie), Pays, Type de Contrat (FAC/TTY/TTE)).
3. **Filtres Financiers (mis en retrait récemment)** : Les seuils de Primes/ULR étaient historiquement présents mais beaucoup ont été retirés pour simplifier l'UX.

> **Règle fondamentale** : Les KPIs "structurels" d'une Cédante ou d'un Courtier (par ex. son indice de diversification) se font **uniquement** sur les filtres identitaires afin qu'une recherche sur la "Branche Incendie" ne modifie pas artificiellement le profil intrinsèque de la cédante.

---

## 4. Détail Exhaustif des Pages et Fonctionnalités

Voici le fonctionnement de toutes les pages accessibles dans l'interface, mappées par leur route.

### 4.1. Dashboard `/`
C'est le centre de contrôle global.
- **KPIs d'en-tête** : Primes écrites, Résultat, ULR pondéré, Nb de contrats.
- **Évolution temporelle** : Graphes de tendance montrant l'historique macro. _Remarque UX : ce graphique s'émancipe parfois du filtre "Année" global pour montrer un historique continu._
- **Alertes** : Affiche les pays ou cédantes avec un ULR critique.
- **Répartition** : Graphiques Donut pour séparer par branches, par origine (FAC vs Traités).

### 4.2. Analyse Globale `/analyse`
Analyse descendante dédiée à la performance géographique et sectorielle.
- Cartographie d'exposition choroplèthe (pays colorisés selon la donnée).
- Top 15 des pays générant le plus de prime.
- Cascade (Waterfall) financière de l'ensemble du portefeuille.
- **UI Spécifique** : Les filtres locaux de cette page sont collants (sticky) au-dessus de la vue, optimisant l'espace analytique.

### 4.3. Analyse Cédante `/analyse-cedante` 
Zoom profond sur le profil d'assurance d'un client.
- **Indice de Diversification** : Jauge avec codes couleurs indiquant si le client possède de multiples lignes d'affaires.
- **Performance Globale — Top 15 Cédantes** : Intégrée récemment pour une consistance avec l'Analyse Globale.
- Diagramme en tarte vertical pour la répartition par branche (LOB).
- Section isolée à l'abri des filtres globaux de base pour observer le partenaire dans son entièreté avant de forer les données ("drill-down").

### 4.4. Analyse Courtiers `/analyse-courtiers` & Détail `/analyse-courtiers/:brokerName`
Miroir de l'analyse cédante, mais côté intermédiaire.
- **Vue Macro** : Classement et "Top Brokers" par ULR, prime et contrats.
- **Détail Courtier** : Profil spécifique avec une Évolution Historique et une Répartition par Branche, avec des couleurs dynamiques respectant le filtre global (branches sélectionnées colorisées, non-sélectionnées en gris/noir). Conditionnement avancé des Hooks React pour assurer un rendu asynchrone parfait.

### 4.5. Comparaison `/comparaison`
Outil de benchmarking extrêmement puissant doté de multiples modes :
- Marché vs Marché (Pays A + Branche X contre Pays B + Branche Y).
- Pays vs Pays ou Cédante vs Cédante.
- Les résultats se matérialisent sous forme d'un **Radar Chart** comparant 5 axes normalisés (Primes, Résultat, ULR inversé, Diversité, Somme assurée). Un graphe temporel complète l'évaluation.

### 4.6. Cibles TTY (Opportunités Traités) `/cibles-tty`
L'une des pages commerciales critiques pour inciter à la transformation de contrats.
- **But** : Repérer les Cédantes pour lesquelles des parts de Traités Additionnels pourraient être souscrites.
- Interface épurée : Tableau "Détail des traités TTY" en partie haute, et graphique "Top 15 - Potentiel additionnel" en bas.
- **Filtres interactifs rapides** : Boutons ` Stable `, ` Baisse `, ` Hausse ` qui filtrent dynamiquement la table ET mettent à jour le graphique (affichant le "potentiel" pour Hausse/Stable et la "diminution" pour Baisse).
- Export Excel très ciblé pour extraire la "Part Cible", "Prime Cible", etc.

### 4.7. Rétrocession : Affaires Traitées & Sécurités `/retrocession/traites` et `/retrocession/securites`
Module indépendant mis en place au-dessus d'un autre fichier Excel de données (`AtlanticRe_Retrocession_AffairesTraites.xlsx`).
- **Affaires Traitées** : Visualisation du portefeuille cédé par Atlantic Re en rétrocession.
  - Calcul de l'EPI (Estimated Premium Income), PMD (Prime Minimum de Dépôt).
  - Nettoyage à la volée des en-têtes (ex: tolérance de typographie sur la colonne `Sécurité` / `Sécuritré`).
  - Formules métier précises (Taux de placement = `(PMD / EPI 100%) / EPI`, affiché dans le tableau "Taux de Plac.%").
- **Sécurités** : Analyse de qui porte la couverture pour Atlantic.

### 4.8. Saturation FAC `/fac-saturation`
Identifie automatiquement les Cédantes abusant des polices ponctuelles facultatives (FAC) plutôt que d'opter pour un traité (TTY).
- Algorithme OR (`TYPE_OF_CONTRACT == "FAC" || INT_SPC_TYPE == "FAC"`).
- Met en surbrillance rouge une branche chez un souscripteur s'il dépasse les seuils métiers d'alertes.

### 4.9. Scoring `/scoring` & Recommandations `/recommandations`
Machine permettant d'appliquer des poids (en % : Primes (25%), ULR (40%), Résultat (20%), etc.) pour générer un **Score (0 à 100)** sur des marchés géographiques par branche.
- Assigne les badges : `ATTRACTIF`, `NEUTRE`, `À ÉVITER`.
- Export de cette vue pour présenter un rapport PDF stratégique.

### 4.10. Exposition et Risques `/exposition`
S'intéresse à l'agrégation de la "Somme Assurée" (Sum Insured / PMCI).
- Permet de mesurer le pire scénario (PML) via une cartographie indiquant la concentration de l'exposition globale assumée par le réassureur.

### 4.11. Administration `/admin`
- CRUD des accès Utilisateurs (`admin`, `souscripteur`, `lecteur`).
- Moteur d'audit (Logs métier historiques de qui a fait quoi).
- Gestionnaire de paths Excel (modifications persistées et dynamiques des sources de données locales sans reload du backend).

---

## 5. Spécificités UX et Techniques Récentes

1. **Unification des layouts (UX)** : L'application a subi un important refactoring pour harmoniser les comportements des filtres (`FilterPanel` rétractable et fermé par défaut, unification du comportement du select `Branche` qui exclut les LOB Non-Vie si "Vie" est choisi, panels locaux stickys).
2. **Gestion asynchrone des composants** : Utilisation stricte de l'ordre d'appel des hooks React pour consolider la vitesse de lecture et de navigation entre les Cédantes et Courtiers.
3. **Exports** : Capacités approfondies d'exportation de données contextuelles (seulement les colonnes pertinentes) sous `.xlsx`.
4. **GitFlow** : Gestion fine par branches de fonctionnalité (ex: `feature/feature-cible-tty`).

## 6. À prendre en compte par l'IA (Claude)

Si vous lisez ce document en vue d'intervenir sur la base de code, prêtez une attention particulière à :
- **Séparation des logiques (Filtres)** : Ne mélangez jamais les filtres "identitaires" au calcul des attributs invariants dans `data_service.py` ou `retro_service.py`.
- **Typographie des données (Excel)** : Les chargements `Pandas` utilisent du `.rename(columns={...})` avec tolérance pour palier aux erreurs humaines dans l'Excel source (`Sécuritré` -> `Sécurité`).
- **Conventions UI** : Toutes les nouvelles implémentations de DataTables ou de Charts doivent respecter la charte de couleurs stricte d'Atlantic Re (Dark mode navy/olive, animations par transition douces) et utiliser les containers existants dans `frontend/src/components/ui/` ou `Charts/`.
