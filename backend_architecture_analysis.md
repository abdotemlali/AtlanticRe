# Analyse de l'Architecture Backend - Atlantic Re

Ce document détaille l'architecture actuelle du backend de la plateforme de réassurance, isole chaque composant, et met en évidence les problèmes par rapport aux bonnes pratiques de l'industrie, ainsi que les recommandations associées.

---

## 1. Vue d'Ensemble de la Stack Technique

Le backend est construit autour des technologies suivantes :
- **Framework Web** : FastAPI (v0.110.0), exécuté par le serveur ASGI `uvicorn`.
- **Base de Données Relationnelle** : MySQL/MariaDB interrogé via **SQLAlchemy** (v2.0.29) (ORM) et PyMySQL.
- **Moteur de Traitement de Données** : **Pandas** et **NumPy**, utilisés de manière intensive pour traiter des fichiers Excel en mémoire.
- **Sécurité & Auth** : JWT (JSON Web Tokens) via `python-jose`, hachage via `bcrypt`.
- **Validation** : Pydantic V2 pour la validation des schémas d'entrée/sortie.
- **Export** : `reportlab` pour la génération de PDF.

---

## 2. Structure et Organisation du Code

L'architecture s'inspire du modèle M-V-C orienté Services (Controller/Router → Service → Repository/Data). Cependant, elle présente des approches spécifiques liées à Pandas.

### A. Point d'entrée (`main.py` & `core/`)
- **Rôle** : Initialisation de l'application FastAPI, chargement des fichiers Excel au démarrage (via `lifespan`), configuration de la base de données (`database.py`) et montage des routeurs.
- **Bonnes Pratiques ✅** : 
  - Utilisation de `@asynccontextmanager` pour le `lifespan` comme gestionnaire de contexte (méthode moderne recommandée dans FastAPI).
  - Centralisation de la configuration métier et l'inclusion des middlewares de sécurité (`SecurityHeadersMiddleware`, CORS de qualité, `slowapi` pour le rate limiting).
- **Problèmes Détectés ❌** : 
  - Le chargement des fichiers Excel métier (`load_excel()`) s'effectue de manière synchrone pendant le démarrage. Si les fichiers deviennent volumineux, cela allongera exponentiellement le temps de démarrage du serveur REST.

### B. Couche Routage (`routers/`)
- **Rôle** : Définition des endpoints API. Regroupement logique : `kpis.py`, `contracts.py`, `auth.py`, `retro.py`.
- **Problèmes Détectés ❌ - "Fat Controllers" (Routeurs Surchargés)** :
  - Un anti-pattern majeur est visible, notamment dans `routers/kpis.py` (plus de 1200 lignes).
  - Ce fichier contient énormément de logique métier. Les opérations natives de Pandas (`df.groupby(...)`, transformations, concaténations, calculs de ratios) sont exécutées *directement* dans les routes.
  - **Recommandation** : Les contrôleurs ne doivent agir que comme des passeurs. Ils doivent recevoir la requête, la valider, appeler la couche *Service*, et formater la réponse. La présence de variables `pandas` directes dans un routeur casse la séparation des responsabilités (Separation of Concerns).

### C. Couche Services (`services/`)
- **Rôle** : Centraliser la logique métier. Ex: `data_service.py`, `client_service.py`, `auth_service.py`.
- **L'Analyse de `data_service.py` (Moteur de Données)** :
  - Fournit des chaînes intelligentes de filtrage (`apply_identity_filters`, `apply_analysis_filters`, `apply_financial_filters`).
- **Problèmes Détectés ❌ - État Global Muable en Mémoire (Stateful Service)** :
  - Le service repose sur des variables globales (`_df`, `_last_loaded`, `_row_count`) pour cacher la donnée du fichier Excel en mémoire vive.
  - **Risque critique** : Cette conception casse le principe fondamental du serveur web "Stateless".
    1. Si l'API scale horizontalement via plusieurs processus workers (ex. `uvicorn --workers 4`), chaque worker stockera son propre DataFrame complet, multipliant par X l'usage de la mémoire RAM.
    2. En cas de mise à jour du fichier source, un worker peut charger la nouvelle version, tandis que les autres gardent l'ancienne en mémoire (problème d'asymétrie de la donnée).
  - **Recommandation** : Soit l'utilisation d'une table SQL propre avec SQLAlchemy si les performances le permettent, soit le déploiement d'un cache distribué dédié (Serveur Redis via un format sérialisé léger comme Apache Parquet ou PyArrow).

### D. Couche Accès aux Données (`models/`, `repositories/`)
- **Rôle** : Modélisation (SQLAlchemy) et interactions I/O avec la base de données (`User`, `ActivityLog`).
- **Bonnes Pratiques ✅** : Initiation d'une architecture `Repository` (`user_repository.py`) propre.
- **Problèmes Détectés ❌ - Base de Données Synchrone / Environnement Asynchrone** :
  - FastAPI est asynchrone (gère les requêtes sans bloquer le thread principal grâce à l'Event Loop). Or, l'implémentation de la BDD utilise `create_engine` standard, `sessionmaker`, et `pymysql`, tous synchrones (`core/database.py`).
  - Chaque opération vers la base de données bloque le thread courant, ce qui crée un "bottleneck" (goulot d'étranglement) architectural et nie en partie l'avantage asynchrone natif de FastAPI.
  - **Recommandation** : Utiliser `ext.asyncio` avec un driver adapté (`asyncmy`, `aiomysql`) et des `AsyncSession` pour le requêtage.

### E. Opérations Manuelles de Traitement (Data Processing)
- **Rôle** : Nettoyage et parseurs complexes (`_parse_int_spc` dans `data_service.py`).
- **Problèmes Détectés ❌ - Couplage données mortes / Code vivant** :
  - Des informations fixes de configuration métier (ex: dérivations de types LOB, branches, classification de cédantes) semblent enfouies sous forme de pseudo-scripts hardcodés (ex: `classification_rules.py`). 
  - Gérer l'ETL (Extract Transform Load) au *runtime* de l'API est coûteux en cycle CPU. Ce travail devrait être fait "en amont".

---

## 3. Synthèse des Recommandations et Priorités Architecturales

Pour stabiliser le backend avant une scalabilité industrielle, voici l'ordre d'action recommandé par criticité :

### 🚨 Priorité Haute (Urgent) : La Refonte MVC (Clean Architecture)
Sortir intégralement la logique `Pandas` (opérations de calculs, tris, filtrages, groupements) du dossier `routers/` (surtout `kpis.py`). Chaque calcul doit être un use-case dans un fichier du package `services/`. Le routeur doit se contenter de ce workflow :
`Requete → Validation Pydantic → Service.get_kpi(...) → Pydantic Response`

### ⚠️ Priorité Moyenne (Court / Moyen terme) : Élimination du In-Memory Stateful System
Au bout de plusieurs utilisateurs concurrents, l'application crashera pour "Out of Memory" à force d'allouer de nouvelles instances/vues de DataFrame.
Il est nécessaire d'envisager une base de données de lecture (DataWarehouse) locale, via Postgresql par exemple. On exécuterait l'ETL Excel → SQL une fois lors de l'upload du fichier, les calculs de KPIs seraient ensuite délégués au moteur SQL sous-jacent avec d'excellentes optimisations.

### 💡 Priorité Basse (Évolutif) : Passage intégral Asynchrone
La migration de `core/database.py` d'une session Synchrone (`pymysql`) vers Asynchrone (`aiomysql`) pour fluidifier l'utilisation concurrente des connexions à la base de données.
