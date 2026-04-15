# Description Complète du Projet Atlantic Re

## 1. Contexte et Objectif
Le projet "Atlantic Re" est un portail de tableaux de bord et d'analyse de données de réassurance. Il vise à fournir aux équipes (souscripteurs, administrateurs, lecteurs) une interface interactive pour analyser les contrats, les primes, le loss ratio, et les risques. L'application permet une analyse segmentée par marché, par pays, par cédante, et par courtier pour une meilleure gestion du portefeuille de réassurance.

## 2. Stack Technique Intégrée
- **Backend (API)** : Python avec le framework FastAPI. Les données sont manipulées et filtrées en mémoire via Pandas après chargement d'un fichier Excel.
- **Frontend (Interface)** : React et TypeScript, propulsé par Vite. Le style est géré par TailwindCSS pour un design moderne, avec `Recharts` pour des graphiques dynamiques et fluides.
- **Architecture de sécurité** : L'accès est sécurisé via JWT (JSON Web Tokens), avec un contrôle d'accès basé sur les rôles (RBAC).

## 3. Découpage de l'Architecture

### Backend (`backend/`)
- **`services/` (Cœur métier)** :
  - `data_service.py` : Pilier du traitement de la donnée. Il se charge du nettoyage initial des données Excel, et expose de multiples méthodes pour appliquer des couches de filtrage (identitaires, d'analyse, et financiers).
  - `classification_rules.py` : Fichier de règles métiers. Il permet de classifier les cédantes (Assureur ou Réassureur) et le type de branche d'assurance (Vie / Non-Vie).
  - `scoring_service.py` : Contient la logique d'évaluation et de scoring pour le marché mondial.
- **`routers/` (Couche de Transport / API)** :
  - Les contrôleurs sont segmentés fonctionnellement. `kpis.py` (+ de 800 lignes) gère tous les endpoints analytiques globaux. D'autres routeurs s'occupent de la comparaison (`comparison.py`), de la liste des contrats (`contracts.py`), et des fonctionnalités d'import/export (`export.py`).
- **`models/` (Schémas)** : Basé sur Pydantic, définit l'ensemble des typages d'entrée/sortie API, tel que le `FilterParams`.

### Frontend (`frontend/src/`)
- **`pages/` (Vues Principales)** :
  - `Dashboard.tsx` : Le centre de l'application. On y trouve des cartes interactives (via différents onglets : carte, évolution, répartition, etc.).
  - `Analysis.tsx` : La page d'analyse de marché qui gère habilement la combinaison "Pays × FAC/Traité" via un composant `CrossMarketWidget`.
  - `CedanteAnalysis.tsx` : Profil d'une cédante spécifique, mettant en exergue son score de diversification.
  - `Comparison.tsx` : Outil interactif pour comparer métriques (Primes, LR, etc.) entre différentes entités (pays, marché, cédantes).
  - `ExpositionRisques.tsx` / `FacSaturation.tsx` : Vue géographique et tableaux de gestion du risque et saturation des affaires facultatives.
- **`components/` (Interface Commune)** : Modules tels que le `FilterPanel` global (barre latérale de filtrage). Les composants de charts (`EvolutionChart.tsx`, `DistributionCharts.tsx`, `WorldMap.tsx`) sont modularisés sous `Charts/`.

## 4. Aperçu des Fonctionnalités Implémentées (Phase 1)
- **Normalisation & Classification (On-the-fly)** : L'application détecte automatiquement au chargement des données si un contrat relève de la branche *Vie* ou *Non-Vie*, et qualifie les cédantes (*Assureur* ou *Réassureur*).
- **Navigation et Dashboard Dynamique** : Les statistiques (Prime Écrite, Loss Ratio, Résultat) se mettent à jour d'après une barre de filtre global (incluant l'année de souscription, filtrée par défaut sur la plus récente). Affichage avec pourcentages et visualisations au survol.
- **Gestion des Alertes (Saturation FAC)** : Capacité intelligente à faire "clignoter" les alertes (saturation de type FAC : Faculte) quand un seuil spécifique de prime / nombre de contrats facultatifs est dépassé.
- **Indice de Diversification** : Évaluation granulaire du degré d'éparpillement du portefeuille sur plusieurs branches (avec jauge de couleur).
- **Moteur de Carte et Tooltips** : Représentation mondiale avec tooltips "glassmorphism" très esthétiques lors du survol de chaque pays pour les métriques de base.
