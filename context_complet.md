# Atlantic Re — Contexte Complet de la Plateforme de Réassurance

> **Version** : 2.0.0 | **Date** : Avril 2026  
> **Projet** : `reinsurance-platform`  
> **Société** : Atlantic Re

---

## Table des matières

1. [Vision Métier et Objectifs](#1-vision-métier-et-objectifs)
2. [Architecture Générale](#2-architecture-générale)
3. [Source de Données — Le Fichier Excel](#3-source-de-données--le-fichier-excel)
4. [Modèle de Données — Colonnes Clés](#4-modèle-de-données--colonnes-clés)
5. [Système de Filtres](#5-système-de-filtres)
6. [Backend — API FastAPI](#6-backend--api-fastapi)
7. [Modules Métier Principaux](#7-modules-métier-principaux)
8. [Frontend — Interface React](#8-frontend--interface-react)
9. [Pages de l'Application](#9-pages-de-lapplication)
10. [Authentification et Gestion des Utilisateurs](#10-authentification-et-gestion-des-utilisateurs)
11. [Export et Rapports](#11-export-et-rapports)
12. [Règles Métier Spécifiques](#12-règles-métier-spécifiques)
13. [Stack Technique](#13-stack-technique)

---

## 1. Vision Métier et Objectifs

**Atlantic Re** est un réassureur africain. Cette plateforme est un **outil d'aide à la décision** pour les équipes de souscription et de direction. Elle permet d'analyser le **portefeuille de contrats de réassurance** sous tous les angles :

- Comprendre la **performance financière** par pays, branche, cédante, courtier, année
- Identifier les marchés attractifs ou à risque via un **système de scoring**
- **Comparer** deux marchés ou deux cédantes côte à côte
- Détecter les **cédantes inactives** pour relancer la relation commerciale
- Surveiller la **saturation FAC** (trop de contrats facultatifs sur une branche)
- Gérer l'**exposition au risque** (sommes assurées) par pays et branche
- **Exporter** les analyses en Excel, CSV ou PDF

### Terminologie Métier

| Terme | Définition |
|-------|------------|
| **Cédante** | Compagnie d'assurance qui cède une partie de ses risques à Atlantic Re (le réassureur) |
| **Courtier** | Intermédiaire (broker) qui apporte les affaires à Atlantic Re |
| **Périmètre** | Zone géographique de souscription (ex. AE = Afrique de l'Est, AM = Afrique du Maghreb) |
| **FAC** | Facultatif : contrat de réassurance souscrit police par police, risque par risque |
| **TTY** | Treaty Proportionnel : traité où Atlantic Re partage une quote-part de tout le portefeuille de la cédante |
| **TTE** | Treaty Non-Proportionnel : traité par excédent de sinistre (XL) |
| **Branche** | Ligne d'activité (ex. Incendie, Marine, Vie, RC, Engineering...) |
| **Sous-branche** | Subdivision d'une branche |
| **ULR** | Ultimate Loss Ratio — rapport sinistres/primes final (indicateur de rentabilité) |
| **Prime Écrite (Written Premium)** | Prime souscrite par Atlantic Re sur un contrat |
| **Résultat** | Prime - Sinistres - Commissions - Courtage → profit ou perte généré par le contrat |
| **Part souscrite (Share)** | Pourcentage du risque pris par Atlantic Re (entre 0 et 100%) |
| **Commission** | Rémunération versée à la cédante (coût d'acquisition) |
| **Courtage** | Rémunération versée au courtier |
| **Profit Commission** | Commission de bénéfice versée à la cédante si le résultat est positif |
| **Somme Assurée (SUM_INSURED)** | Valeur maximale couverte par le contrat |
| **Exposition** | Part du risque réel supporté par Atlantic Re = SUM_INSURED_100 × SHARE_SIGNED / 100 |
| **Année de souscription (UW Year)** | Année à laquelle le contrat a été souscrit |

---

## 2. Architecture Générale

```
reinsurance-platform/
├── backend/          # API FastAPI (Python)
│   ├── main.py       # Point d'entrée, lifespan, routers
│   ├── core/         # Config, DB, Sécurité
│   ├── models/       # Schémas Pydantic (schemas.py), modèles SQLAlchemy (db_models.py)
│   ├── services/     # Logique métier (data, scoring, clients, auth, email...)
│   ├── repositories/ # Accès base de données (logs, users)
│   ├── routers/      # Endpoints HTTP (auth, kpis, comparison, scoring, export...)
│   └── middlewares/  # CORS, rate limiting, security headers
│
└── frontend/         # React + TypeScript + Vite
    └── src/
        ├── App.tsx           # Routing principal
        ├── context/          # AuthContext, DataContext (état global)
        ├── pages/            # 14 pages de l'application
        ├── components/       # Composants réutilisables (Layout, FilterPanel, Charts...)
        ├── types/            # Types TypeScript
        ├── constants/        # Routes API
        ├── hooks/            # Hooks custom (useDebounce...)
        └── utils/            # Axios instance (api.ts)
```

### Flux de Données

```
Fichier Excel (source de vérité)
        ↓
  data_service.py (chargement, nettoyage, cache mémoire en DataFrame pandas)
        ↓
  apply_filters() → apply_identity_filters() + apply_analysis_filters() + apply_financial_filters()
        ↓
  Routers FastAPI (/api/kpis, /api/comparison, /api/scoring...)
        ↓
  Frontend React (DataContext — filtres globaux, KPIs summary)
        ↓
  Pages / Composants (graphiques, tableaux, cartes)
```

---

## 3. Source de Données — Le Fichier Excel

Toute la donnée provient d'**un unique fichier Excel** chargé au démarrage du serveur. Le chemin est configuré via la variable d'environnement `EXCEL_FILE_PATH`.

### Chargement (`data_service.py` — `load_excel()`)

1. Lecture avec `pandas.read_excel()` — toutes les colonnes en `dtype=str`
2. Conversion des colonnes numériques (`WRITTEN_PREMIUM`, `ULR`, `RESULTAT`, etc.)
3. Conversion des colonnes dates (`INCEPTION_DATE`, `EXPIRY_DATE`, etc.)
4. Parsing de la colonne `INT_SPC` en 3 champs dérivés :
   - `INT_SPC_PERIMETRE` (ex. AE, AM)
   - `INT_SPC_TYPE` (FAC, TTY, TTE)
   - `INT_SPC_SPECIALITE` (spécialité métier)
5. Dérivation automatique de `TYPE_CEDANTE` (si absente) via `classify_cedante()`
6. Dérivation automatique de `VIE_NON_VIE` (si absente) via `classify_lob()`
7. Stockage en cache mémoire global `_df` (DataFrame pandas singleton)

> Le fichier peut être **rechargé à chaud** via l'interface admin sans redémarrage du serveur.

---

## 4. Modèle de Données — Colonnes Clés

| Colonne | Type | Description Métier |
|---------|------|-------------------|
| `POLICY_SEQUENCE_NUMBER` | str | Identifiant unique du contrat |
| `CONTRACT_NUMBER` | str | Numéro de contrat lisible |
| `INT_SPC` | str | Code spécialité complet (format : `PERIMETRE-TYPE-SPECIALITE`) |
| `INT_SPC_PERIMETRE` | str | **Dérivé** — Zone géographique de souscription (AE, AM...) |
| `INT_SPC_TYPE` | str | **Dérivé** — Type de contrat SPC (FAC, TTY, TTE) |
| `INT_SPC_SPECIALITE` | str | **Dérivé** — Spécialité métier |
| `INT_BRANCHE` | str | Branche d'activité (Incendie, Marine, Vie, RC...) |
| `INT_SBRANCHE` | str | Sous-branche |
| `INT_CEDANTE` | str | Nom de la cédante |
| `CEDANT_CODE` | str | Code unique de la cédante |
| `TYPE_CEDANTE` | str | **Dérivé** — REASSUREUR ou ASSUREUR DIRECT |
| `INT_BROKER` | str | Nom du courtier |
| `BROKER_CODE` | str | Code du courtier |
| `PAYS_RISQUE` | str | Pays où se situe le risque (géographie du risque) |
| `PAYS_CEDANTE` | str | Pays de la cédante |
| `UNDERWRITING_YEAR` | int | Année de souscription |
| `CONTRACT_STATUS` | str | Statut du contrat (CONFIRMED, CLOSED, CANCELLED...) |
| `TYPE_OF_CONTRACT` | str | Type de contrat (FAC, Treaty...) |
| `VIE_NON_VIE` | str | **Dérivé** — Classification VIE ou NON_VIE |
| `WRITTEN_PREMIUM` | float | Prime écrite par Atlantic Re |
| `SUBJECT_PREMIUM` | float | Prime totale du risque (base de calcul) |
| `SHARE_SIGNED` | float | Part signée (%) |
| `SHARE_WRITTEN` | float | Part écrite (%) |
| `COMMI` | float | Taux de commission (%) |
| `COMMISSION` | float | Montant de commission |
| `BROKERAGE1` | float | Montant de courtage |
| `BROKERAGE_RATE` | float | Taux de courtage (%) |
| `PROFIT_COMM_RATE` | float | Taux de commission de bénéfice |
| `ULR` | float | Ultimate Loss Ratio (%) |
| `RESULTAT` | float | Résultat net du contrat |
| `SUM_INSURED` | float | Somme assurée à 100% |
| `SUM_INSURED_100` | float | Somme assurée complète |
| `INCEPTION_DATE` | date | Date d'effet du contrat |
| `EXPIRY_DATE` | date | Date d'expiration |
| `DATE_SAISIE1` | date | Date de saisie dans le système |
| `DATE_CONFIRMED` | date | Date de confirmation |
| `DATE_CLOSED` | date | Date de clôture |
| `DATE_CANCELLED` | date | Date d'annulation |

---

## 5. Système de Filtres

Le filtre est le **cœur de la plateforme**. Toutes les vues analytiques sont filtrées à la demande de l'utilisateur.

### 3 Couches de Filtres (séparation métier fondamentale)

#### Couche 1 — Filtres Identitaires (`apply_identity_filters`)
Définissent **QUI** est dans le portefeuille analysé. Ne modifient pas la nature des contrats retenus.
- Périmètre SPC (`INT_SPC_PERIMETRE`)
- Cédante (`INT_CEDANTE`)
- Courtier (`INT_BROKER`)
- Années de souscription (`UNDERWRITING_YEAR`)
- Statut contrat (`CONTRACT_STATUS`)
- Type cédante (`TYPE_CEDANTE`)

> **Règle critique** : Les attributs globaux d'une cédante (diversification, type, alertes FAC) sont toujours calculés sur les filtres identitaires **uniquement**, jamais sur les filtres d'analyse. Ceci évite qu'un filtre "branche = Vie" fausse le calcul de diversification.

#### Couche 2 — Filtres d'Analyse (`apply_analysis_filters`)
Affinent la vue analytique — définissent **QUOI** est analysé dans le portefeuille.
- Branche (`INT_BRANCHE`)
- Sous-branche (`INT_SBRANCHE`)
- Pays risque (`PAYS_RISQUE`)
- Pays cédante (`PAYS_CEDANTE`)
- Type de contrat (`TYPE_OF_CONTRACT`)
- Type SPC (`INT_SPC_TYPE`)
- Spécialité (`INT_SPC_SPECIALITE`)
- Recherche libre sur INT_SPC

#### Couche 3 — Filtres Financiers (`apply_financial_filters`)
Seuils numériques sur les indicateurs.
- Prime min/max (`WRITTEN_PREMIUM`)
- ULR min/max
- Part souscrite min/max (`SHARE_WRITTEN`)
- Commission min/max (`COMMI`)
- Courtage min/max (`BROKERAGE_RATE`)

### Gestion Côté Frontend (DataContext)

- **État Draft** : Les modifications de l'utilisateur dans le panneau de filtres sont stockées dans `draftFilters`
- **État Appliqué** : Après 300ms de debounce, `draftFilters` devient `appliedFilters`
- **Réinitialisation** : `resetFilters()` revient aux valeurs par défaut ; `resetToDefaultYear()` remet l'année au plus récent
- **Auto-initialisation** : Au chargement, l'année de filtre est automatiquement positionnée sur l'année la plus récente du dataset
- **Paramètres URL** : `filtersToParams()` convertit l'état filtre en query string pour les appels API
- **Exclusion ciblée** : `filtersToParamsExcluding()` permet à un graphe de s'afficher en "vue totale" en ignorant le filtre de sa propre dimension (ex : le graphe "par branche" ignore le filtre branche pour montrer toutes les branches)

---

## 6. Backend — API FastAPI

### Point d'Entrée (`main.py`)

- **Titre** : `Atlantic Re — Plateforme Réassurance`
- **Version** : `2.0.0`
- **Lifespan** : au démarrage → `init_db()` + `load_excel()`
- **Admin par défaut** : `admin / Admin@123` (créé automatiquement si absent, `must_change_password=True`)

### Middlewares
- **CORS** : configuration des origines autorisées
- **Rate Limiting** : limitation des requêtes pour protéger l'API
- **Security Headers** : headers HTTP de sécurité (CSP, HSTS, etc.)

### Endpoints API

| Préfixe | Module | Rôle |
|---------|--------|------|
| `/api/auth` | `auth.py` | Login, logout, reset password, change password |
| `/api/admin` | `admin.py` | Gestion utilisateurs, logs activité, configuration |
| `/api/kpis` | `kpis.py` | Tous les calculs KPI (summary, by-country, by-branch, by-year...) |
| `/api/contracts` | `contracts.py` | Liste paginée des contrats individuels |
| `/api/scoring` | `scoring.py` | Calcul du score d'attractivité des marchés |
| `/api/comparison` | `comparison.py` | Comparaison de marchés et cédantes |
| `/api/data` | `data.py` | Statut données, options de filtres, rechargement Excel |
| `/api/export` | `export.py` | Export CSV, Excel, Pivot Excel, PDF |
| `/api/clients` | `clients.py` | Analyse clients inactifs, analyse renouvellement |

---

## 7. Modules Métier Principaux

### 7.1 — Calcul des KPIs (`kpis.py` + `data_service.py`)

**Fonction centrale** : `compute_kpi_summary(df)` calcule sur un DataFrame filtré :
- `total_written_premium` : Somme des primes écrites
- `total_resultat` : Somme des résultats
- `avg_ulr` : ULR **moyen pondéré par les primes** (méthode actuarielle correcte)
- `total_sum_insured` : Somme assurée totale
- `contract_count` : Nombre de contrats
- `ratio_resultat_prime` : Résultat / Prime × 100 (%)

**Endpoints clés** :
- `GET /api/kpis/summary` — KPIs globaux (utilisé dans le header de la plateforme)
- `GET /api/kpis/by-country` — Performance par pays (avec highlight de pays sélectionnés)
- `GET /api/kpis/by-branch` — Performance par branche
- `GET /api/kpis/by-cedante` — Performance par cédante (top N)
- `GET /api/kpis/by-broker` — Performance par courtier
- `GET /api/kpis/by-year` — Évolution temporelle
- `GET /api/kpis/by-contract-type` — Répartition FAC vs Traités
- `GET /api/kpis/by-specialite` — Prime FAC vs Traité
- `GET /api/kpis/alerts` — Alertes ULR élevé (par défaut seuil à 80%)
- `GET /api/kpis/financial-breakdown` — Décomposition financière (primes, commissions, courtage, résultat)
- `GET /api/kpis/cedante/profile` — Profil complet d'une cédante
- `GET /api/kpis/cedante/by-year` — Évolution historique d'une cédante (sans filtre année)
- `GET /api/kpis/cedante/by-branch` — Performance par branche pour une cédante
- `GET /api/kpis/exposition/by-country` — Exposition (risque brut) par pays
- `GET /api/kpis/exposition/by-branch` — Exposition par branche
- `GET /api/kpis/exposition/top-risks` — Top N risques les plus exposés
- `GET /api/kpis/market/profile` — Profil d'un marché (pays × branche)
- `POST /api/kpis/pivot` — Tableau croisé dynamique (ligne × colonne × valeur configurable)

### 7.2 — Scoring d'Attractivité (`scoring_service.py`)

Attribue un **score de 0 à 100** à chaque combinaison `(PAYS_RISQUE, INT_BRANCHE)`.

**Critères par défaut (configurables par l'utilisateur)** :

| Critère | Poids | Seuil | Direction |
|---------|-------|-------|-----------|
| ULR (Loss Ratio) | 40% | 70% | Plus bas = mieux |
| Prime Écrite | 25% | 100 000 | Plus haut = mieux |
| Résultat Net | 20% | 0 | Plus haut = mieux |
| Commission | 10% | 35% | Plus bas = mieux |
| Part Souscrite | 5% | 5% | Plus haut = mieux |

**Normalisation** :
- Direction `lower_is_better` : score = 100 × (1 - valeur / (seuil × 2))
- Direction `higher_is_better` : score = 100 × (valeur / seuil), plafonné à 100

**Badge assigné** :
- Score ≥ 70 → `ATTRACTIF` 🟢
- Score 40–69 → `NEUTRE` 🟡
- Score < 40 → `A_EVITER` 🔴

### 7.3 — Comparaison de Marchés (`comparison.py`)

Permet de comparer **côte à côte** :
- Deux marchés `(pays, branche)` — endpoint `GET /api/comparison`
- Deux pays (toutes branches) — endpoint `GET /api/comparison/by-country`
- Deux pays avec sélection de branches indépendante par pays — endpoint `GET /api/comparison/by-country-detail`
- Deux cédantes — endpoint `GET /api/comparison/by-cedante`

**Radar Chart** : normalisation relative entre les deux marchés sur 5 axes :
- Prime Écrite, Résultat, Loss Ratio (inversé), Portefeuille, Somme Assurée

**Règle métier** : Le **graphe d'évolution historique** (by-year) ignore le filtre d'année pour toujours afficher la courbe complète de l'historique.

**Filtres locaux** vs **filtres globaux** : Dans la comparaison, les filtres locaux de la page (année, type contrat, type SPC) sont indépendants des filtres globaux de la plateforme. Le filtre branche global est ignoré — les branches sont gérées indépendamment pour chaque marché.

### 7.4 — Détection des Cédantes Inactives (`client_service.py`)

**Logique** : Une cédante est déclarée **inactive** si :
1. Elle a souscrit au moins `min_contracts` contrats au total (par défaut : 3)
2. Sa dernière année de souscription est ≤ `MAX(UNDERWRITING_YEAR) - years_threshold` (par défaut : 2 ans)

**Données retournées par cédante** :
- Nom, code, pays
- Nombre total de contrats
- Dernière année d'activité
- Nombre d'années d'absence
- Répartition par statut (CONFIRMED, CLOSED, etc.)

**Usage commercial** : Liste de cédantes à relancer pour renouer la relation d'affaires.

**Analyse de renouvellement** : Calcul du rate de rétention par année et par cédante en identifiant les contrats renouvelés (`RENEWALE_CONTRACT` non vide).

### 7.5 — Alerte Saturation FAC

Détectée sur le profil d'une cédante ou dans la page FacSaturation.

**Déclenchement** (logique OR) : Une branche est en saturation FAC si :
- Nombre de contrats FAC > 5 **ET** Primes FAC > 1 000 000

La détection utilise `TYPE_OF_CONTRACT == "FAC"` OU `INT_SPC_TYPE == "FAC"` pour couvrir toutes les variantes de codage dans l'Excel.

**Impact métier** : Trop de contrats FAC sur une branche peut indiquer qu'Atlantic Re devrait proposer un traité à la cédante plutôt que de souscrire risque par risque.

### 7.6 — Classification Automatique (`classification_rules.py`)

#### Classification TYPE_CEDANTE
Réplique d'une formule Excel pour identifier si une cédante est un réassureur (rétrocession) ou un assureur direct :
- Suffixes → `" re"`, `" ré"` en fin de nom
- Mots-clés → `" reinsurance"`, `" reins"`, `" réassurance"`, `" reassurance"` dans le nom
- Résultat → `"REASSUREUR"` ou `"ASSUREUR DIRECT"`

#### Classification VIE_NON_VIE
- Si le nom de branche contient `"vie"` mais pas `"non"` → `"VIE"`
- Sinon → `"NON_VIE"`

### 7.7 — Exposition et Risques

**Formule** : `Exposition = SUM_INSURED_100 × SHARE_SIGNED / 100`

Représente la **part réelle du risque** supportée par Atlantic Re (fraction de la somme assurée totale). C'est l'indicateur de concentration du risque.

---

## 8. Frontend — Interface React

### Architecture Frontend

- **Framework** : React 18 + TypeScript + Vite
- **Routing** : React Router v6
- **Styling** : Tailwind CSS + CSS custom (`index.css`)
- **HTTP Client** : Axios (instance `api.ts` avec intercepteur JWT)
- **Graphiques** : Recharts (barres, lignes, radar, pie, carte)
- **Notifications** : react-hot-toast

### Contextes Globaux

#### `AuthContext`
- Stockage du JWT, rôle, nom, `must_change_password`
- Fonctions : `login()`, `logout()`
- Redirection automatique vers `/change-password` si `must_change_password = true`

#### `DataContext`
État partagé entre toutes les pages protégées :
- `draftFilters` / `appliedFilters` : état double avec debounce 300ms
- `filterOptions` : listes de valeurs disponibles pour les filtres (valeurs uniques du dataset)
- `kpiSummary` : KPIs globaux (rechargés à chaque changement de filtres)
- `scoringCriteria` : critères du scoring (modifiables par l'utilisateur)
- `dataStatus` : infos sur le fichier Excel chargé
- `refreshData()` : recharge le fichier Excel sans redémarrer le serveur

### Composants Réutilisables

| Composant | Rôle |
|-----------|------|
| `Layout.tsx` | Barre de navigation + Sidebar + contenu principal |
| `FilterPanel.tsx` | Panneau de filtres global avec tous les critères |
| `PageFilterPanel.tsx` | Panneau de filtres local pour certaines pages |
| `KPICards.tsx` | Cartes de métriques clés (prime, résultat, ULR, contrats) |
| `DataTable.tsx` | Tableau paginé générique avec tri |
| `ExportButton.tsx` | Bouton d'export (CSV, Excel, PDF, Pivot) |
| `DashboardAlerts.tsx` | Alertes ULR élevé et autres avertissements |
| `ActiveFiltersBar.tsx` | Bandeau récapitulatif des filtres actifs |
| `PipelineView.tsx` | Vue pipeline des contrats en cours |

---

## 9. Pages de l'Application

### 9.1 — Dashboard (`/`)
Page d'accueil. Affiche :
- KPIs synthétiques (prime totale, résultat, ULR, nb contrats)
- Graphe d'évolution par année
- Alertes ULR élevé (marchés à surveiller)
- Répartition par branche
- Tableau des cédantes inactives (liste rapide)
- Top cédantes et top pays

### 9.2 — Analyse Globale (`/analyse`)
Vue analytique **centrée sur les pays**. Permet d'explorer la performance du portefeuille par :
- Carte choroplèthe mondiale (pays colorés par prime ou ULR)
- Top 15 pays par prime écrite
- Top cédantes
- Décomposition financière (waterfall : prime → commissions → courtage → résultat)
- Tableau croisé dynamique (Pivot) configurable
- Filtres **locaux** indépendants des filtres globaux

### 9.3 — Analyse Cédante (`/analyse-cedante`)
Fiche analytique complète d'une **cédante sélectionnée** :
- KPIs globaux de la cédante (sur tous les filtres identitaires — immunisé contre branche/pays)
- Type de cédante (Assureur Direct vs Réassureur)
- Nombre de branches actives (diversification)
- Alertes de saturation FAC par branche
- Évolution historique (primes + ULR sur toutes les années, sans filtre année)
- Performance par branche
- Contrats individuels de la cédante
- Vue Vie / Non-Vie configurable

### 9.4 — Exposition et Risques (`/exposition`)
Analyse de la **concentration des risques** :
- Carte mondiale avec niveau d'exposition par pays
- Graphe barres : exposition par branche
- Top N risques individuels les plus exposés (par somme assurée × part signée)

### 9.5 — Scoring / Sélection de Marchés (`/scoring`)
**Outil de sélection stratégique** des marchés à développer :
- Tableau des couples (pays, branche) scorés de 0 à 100
- Badge ATTRACTIF / NEUTRE / À ÉVITER
- Critères de scoring **entièrement configurables** par l'utilisateur (poids, seuils, direction)
- Filtrage par badge, pays, branche
- Export PDF du rapport de recommandations

### 9.6 — Recommandations (`/recommandations`)
Affiche le résultat du scoring comme une liste de recommandations d'investissement. Vue simplifiée du scoring, orientée prise de décision rapide.

### 9.7 — Comparaison (`/comparaison`)
Module de comparaison côte à côte avec **4 modes** :
1. **Marché vs Marché** : (Pays A, Branche A) vs (Pays B, Branche B)
2. **Pays vs Pays** : tous secteurs vs tous secteurs
3. **Pays vs Pays (détaillé)** : avec sélection de branches indépendante par pays et filtre Vie/Non-Vie
4. **Cédante vs Cédante** : profil complet de deux cédantes

Pour chaque mode :
- Graphe Radar (5 axes normalisés)
- Graphe d'évolution historique (sur toutes les années)
- Tableau de KPIs comparatif

### 9.8 — Saturation FAC (`/fac-saturation`)
Détecte les **branches surexposées en FAC** pour une cédante ou l'ensemble du portefeuille :
- Filtre par année, statut, cédante
- Liste des branches en saturation
- Détail des contrats FAC par branche dans une modale

### 9.9 — Clients Inactifs (`/` intégré dans Dashboard)
Détecte les cédantes n'ayant plus souscrit depuis N années :
- Paramètres configurables : seuil d'années, nombre minimum de contrats
- Liste triable des cédantes inactives avec détail
- **Export Excel stylisé** avec formatage conditionnel (rouge > 3 ans, orange 2-3 ans)

### 9.10 — Top Brokers (`/top-brokers`)
Analyse de la performance des **courtiers** :
- Classement par prime écrite, résultat, ULR ou nombre de contrats
- Graphes comparatifs

### 9.11 — Administration (`/admin`)
Réservée au rôle `admin` :
- Création, modification, désactivation des utilisateurs
- Rôles : `admin`, `souscripteur`, `lecteur`
- Journaux d'activité (logs horodatés de toutes les actions)
- Configuration du chemin du fichier Excel
- Rechargement des données

### 9.12 — Authentification
- `Login` (`/login`) : Authentification JWT avec gestion `must_change_password`
- `ChangePassword` (`/change-password`) : Forcé au premier login
- `ResetPassword` (`/reset-password`) : Via lien email tokenisé

---

## 10. Authentification et Gestion des Utilisateurs

### Système JWT
- Token JWT avec expiration configurable
- Stockage côté client (localStorage ou context)
- Intercepteur Axios : ajoute automatiquement `Authorization: Bearer <token>`

### Rôles
| Rôle | Permissions |
|------|-------------|
| `admin` | Toutes les fonctionnalités + gestion utilisateurs + configuration |
| `souscripteur` | Lecture + export (CSV, Excel, PDF) |
| `lecteur` | Lecture seule — pas d'export |

### Base de Données (MySQL)
- Table `users` : `id`, `username`, `hashed_password`, `role`, `full_name`, `email`, `active`, `must_change_password`
- Table `activity_logs` : `id`, `timestamp`, `username`, `action`, `detail`
- Connexion via SQLAlchemy + MySQL (`core/database.py`)

### Sécurité Mot de Passe
- Hachage : bcrypt via `passlib`
- Reset par email : token à usage unique + expiration
- Premier login : forcé de changer le mot de passe

---

## 11. Export et Rapports

Accessible aux rôles `admin` et `souscripteur`.

| Type | Endpoint | Description |
|------|----------|-------------|
| CSV | `POST /api/export/csv` | Export brut du dataset filtré (séparateur `;`, UTF-8 BOM) |
| Excel | `POST /api/export/excel` | Export stylisé avec couleurs Atlantic Re, en-têtes gelées |
| Pivot Excel | `POST /api/export/pivot` | Tableau croisé dynamique stylisé avec totaux par ligne et colonne |
| PDF | `POST /api/export/pdf` | Rapport de recommandations (scoring) en format A4 paysage |
| Excel Clients Inactifs | Via `/api/clients/inactive/export` | Liste cédantes inactives avec formatage conditionnel |

**Palette de couleurs** (cohérente entre exports et frontend) :
- Navy : `#2D3E50` (en-têtes)
- Olive : `#4E6820` (colonnes pivot)
- Blanc : `#FFFFFF` / Gris clair : `#EEF0F3` (lignes alternées)

---

## 12. Règles Métier Spécifiques

### Règle 1 — Immunisation des attributs globaux
Les attributs qui caractérisent **globalement** une cédante (type assureur/réassureur, diversification par branches, alertes saturation FAC) sont **toujours** calculés sur la totalité du portefeuille de la cédante, en appliquant uniquement les **filtres identitaires**. Les filtres d'analyse (branche, pays) ne doivent jamais altérer ces indicateurs.

### Règle 2 — Évolution historique sans filtre année
Les graphes d'évolution dans le temps (`by-year`) ignorent toujours le **filtre d'année** afin de montrer la trajectoire complète du marché ou de la cédante. Un seul filtrage d'année cacherait des années et rendrait la courbe incompréhensible.

### Règle 3 — ULR pondéré
L'ULR moyen est calculé en **pondérant par les primes écrites**, pas comme une simple moyenne arithmétique. Les petits contrats n'ont donc qu'un faible impact sur l'ULR agrégé.

### Règle 4 — Filtres locaux vs filtres globaux (Comparaison)
Dans le module Comparaison, les filtres locaux de la page (année, type contrat, type SPC) s'appliquent aux deux marchés comparés, mais sont **indépendants des filtres globaux** de la plateforme. Le filtre branche global est ignoré ; chaque marché a sa propre sélection de branches.

### Règle 5 — Saturation FAC (logique OR)
La saturation FAC est détectée si le contrat est identifié comme FAC via `TYPE_OF_CONTRACT == "FAC"` **OU** `INT_SPC_TYPE == "FAC"`. Cette logique OU couvre les incohérences de saisie dans l'Excel source.

### Règle 6 — Année par défaut
Au chargement de l'interface, le filtre d'année est automatiquement positionné sur la **dernière année de souscription** disponible dans le dataset. Cette valeur est fournie par l'API (`uw_year_default`).

### Règle 7 — Décomposition Financière
La prime écrite sert de base 100% dont on déduit :
- Commission cédante (%) → coût d'acquisition
- Courtage courtier (%) → coût de distribution
- Commission de bénéfice (%) → coût de bonne performance
- Taxes (%) → charges fiscales
- = **Résultat** (solde après sinistres et charges)

---

## 13. Stack Technique

### Backend
| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework API | FastAPI | ~0.110 |
| Serveur ASGI | Uvicorn | ~0.29 |
| Analyse données | Pandas + NumPy | Pandas ~2.x |
| ORM | SQLAlchemy | ~2.x |
| Base de données | MySQL | 8.x |
| Authentification | python-jose (JWT) + passlib (bcrypt) | — |
| Email | smtplib / service SMTP | — |
| Export Excel | xlsxwriter | — |
| Export PDF | reportlab | — |
| Validation | Pydantic v2 | — |
| Rate Limiting | slowapi | — |

### Frontend
| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework UI | React | 18 |
| Langage | TypeScript | — |
| Build tool | Vite | — |
| Routing | React Router | v6 |
| Styling | Tailwind CSS | — |
| HTTP Client | Axios | — |
| Graphiques | Recharts | — |
| Notifications | react-hot-toast | — |
| Cartes | (composant choroplèthe interne) | — |

### Variables d'Environnement (Backend)
```
DATABASE_URL=mysql+pymysql://user:pass@host/dbname
SECRET_KEY=...           # clé JWT
EXCEL_FILE_PATH=...      # chemin absolu vers le fichier Excel source
EXCEL_SHEET_NAME=...     # nom de l'onglet Excel
SMTP_HOST=...            # serveur email
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
```

---

*Document généré le 08/04/2026 — Analyse complète du code source de la plateforme Atlantic Re v2.0.0*
