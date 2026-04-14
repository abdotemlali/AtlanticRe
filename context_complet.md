# 📋 Contexte Complet — Plateforme Atlantic Re
> **Version :** 2.0.0 · **Mise à jour :** 14 avril 2026  
> **Stack :** FastAPI (Python 3.11) + React 18 (TypeScript/Vite) + MySQL + TailwindCSS  
> **Dépôt :** `github.com/abdotemlali/AtlanticRe` · Branche `main`

---

## 1. Vue d'ensemble du projet

Atlantic Re est un **réassureur international** filiale du Groupe CDG (Maroc), actif sur **60+ marchés** et auprès de **400+ cédantes**. La plateforme porte la double mission du programme **Reach 2030** :

| Axe | Rôle | Statut |
|-----|------|--------|
| **Axe 1 – Opérationnel** | Pilotage du portefeuille de réassurance interne | ✅ Actif |
| **Axe 2 – Stratégique** | Modélisation SCAR de l'expansion africaine | 🔄 En intégration |

---

## 2. Architecture générale

```
reinsurance-platform/
├── backend/          → FastAPI 0.110 · uvicorn · Python venv
│   ├── core/         → config, security, database
│   ├── models/       → db_models, external_db_models, schemas
│   ├── routers/      → 21 routers HTTP
│   ├── services/     → 25 services métier
│   ├── repositories/ → couche d'accès BDD
│   ├── middlewares/  → CORS, rate-limit, security-headers
│   ├── migrations/   → SQL bruts (no Alembic)
│   └── scripts/      → seed_external_data.py
├── frontend/         → Vite 5 · React 18 · TypeScript · TailwindCSS 3
│   └── src/
│       ├── pages/    → 22 pages lazy-loaded
│       ├── components/ → Layout, Charts, FilterPanel, DataTable…
│       ├── context/  → AuthContext, DataContext
│       ├── hooks/    → custom hooks
│       ├── types/    → types TypeScript
│       └── utils/    → formatters, helpers
├── data/
│   └── external/     → 4 CSV marchés africains
└── database/         → Fichiers Excel sources (non versionnés)
```

**Ports :**
- Backend API : `http://localhost:8000`  
- Frontend dev : `http://localhost:5173`  
- Swagger UI : `http://localhost:8000/docs`

---

## 3. Backend — FastAPI

### 3.1 Démarrage & Lifespan

Le fichier `main.py` orchestre le démarrage via un **lifespan asyncio** (pattern FastAPI ≥ 0.93) :

1. `init_db()` — Crée les tables SQLAlchemy et l'admin par défaut (`admin / Admin@123`, `must_change_password=True`)
2. `load_excel()` — Charge le fichier réassurance principal en mémoire (pandas DataFrame)
3. `load_retro_excel()` — Charge le fichier rétrocession (affaires traitées)
4. `load_fcm_excel()` — Charge le fichier FCM Partenaires (FAC-to-FAC)
5. **Seed données externes** — Si les tables `ext_*` sont vides, lance `seed_external_data.run_seed()`

### 3.2 Fichiers de données (config.py)

| Variable d'env | Défaut |
|---|---|
| `EXCEL_FILE_PATH` | `../database/AtlanticRe_Reassurance.xlsx` |
| `RETRO_EXCEL_FILE_PATH` | `../database/AtlanticRe_Retrocession_AffairesTraites.xlsx` |
| `FCM_PARTENAIRES_FILE_PATH` | `../database/FCM_Partenaires_v2.xlsx` |

### 3.3 Base de données MySQL (`.env`)

```
DATABASE_URL=mysql+pymysql://user:password@host/dbname
SECRET_KEY=<jwt-secret>
GMAIL_SENDER=...
GMAIL_APP_PASSWORD=...
FRONTEND_URL=http://localhost:5173
```

**JWT :** HS256, expiration 8h (`JWT_EXPIRE_MINUTES=480`)

### 3.4 Modèles de base de données

#### Tables utilisateurs (db_models.py)

| Table | Colonnes clés |
|---|---|
| `users` | id, username, hashed_password, role (admin/souscripteur/lecteur), full_name, email, active, must_change_password, reset_token, token_version |
| `activity_logs` | id, timestamp, username, action, detail |

#### Tables données externes (external_db_models.py)

| Table | Contenu |
|---|---|
| `ref_pays` | Référentiel pays (nom, ISO3, région, mapping pays_risque) |
| `ext_marche_non_vie` | Primes non-vie, croissance, taux pénétration, ratio S/P, densité — par pays/année |
| `ext_marche_vie` | Primes vie, croissance, pénétration, densité — par pays/année |
| `ext_gouvernance` | FDI, stabilité politique, qualité réglementaire, KAOPEN — par pays/année |
| `ext_macroeconomie` | PIB, croissance PIB, inflation, compte courant, tx change, PIB/hab — par pays/année |

### 3.5 Routers API

| Préfixe | Fichier | Description |
|---|---|---|
| `/api/auth` | auth.py | Login, refresh, reset password, change password |
| `/api/admin` | admin.py | CRUD utilisateurs, logs d'activité, config Excel |
| `/api/kpis` | kpis_global.py | KPIs globaux, filtres options, pivot |
| `/api/kpis/exposition` | exposition.py | Exposition et risques |
| `/api/kpis` (cedantes) | cedantes.py | KPIs par cédante, matching |
| `/api/kpis` (brokers) | brokers.py | KPIs par courtier |
| `/api/kpis` (alerts) | alerts.py | Alertes KPI |
| `/api/contracts` | contracts.py | Liste paginée des contrats |
| `/api/scoring` | scoring.py | Scoring multicritère des marchés |
| `/api/comparison` | comparison.py | Comparaison directe de marchés |
| `/api/data` | data.py | Statut données, rechargement |
| `/api/export` | export.py | Export Excel/PDF |
| `/api/clients` | clients.py | Clients inactifs, pipeline |
| `/api/retro` | retro.py | Rétrocession — affaires traitées |
| `/api/fac-to-fac` | fac_to_fac.py | Module FAC-to-FAC partenaires |
| `/api/target-share` | target_share.py | Cibles TTY (parts cibles) |
| `/api/external-data` | external_data.py | Données marché africain |
| `/api/public` | public_overview.py | Stats publiques (non authentifié) |
| `/api/filter-parser` | filter_parser.py | Parsing avancé des filtres |

### 3.6 Services métier

| Service | Rôle |
|---|---|
| `data_service.py` (16 Ko) | Chargement/parsing Excel réassurance, application des filtres |
| `cedante_matching_service.py` (68 Ko) | **Cœur** — matching fuzzy cédantes, KPIs cédante, saturation FAC |
| `broker_matching_service.py` (17 Ko) | Matching brokers (RapidFuzz + Jellyfish + scikit-learn), KPIs broker |
| `retro_service.py` (20 Ko) | Parsing Excel rétrocession, logique affaires traitées |
| `fac_to_fac_service.py` (18 Ko) | Logique FAC-to-FAC partenaires (donneurs/preneurs) |
| `kpi_cedante_service.py` (13 Ko) | Agrégations KPI par cédante |
| `kpi_broker_service.py` (10 Ko) | Agrégations KPI par courtier |
| `client_service.py` (11 Ko) | Clients inactifs, pipeline CRM |
| `external_data_service.py` (11 Ko) | Lecture tables ext_*, agrégations africaines |
| `export_service.py` (3.8 Ko) | Génération exports Excel/PDF (reportlab) |
| `target_share_service.py` (8.9 Ko) | Calcul parts cibles TTY |
| `scoring_service.py` (4 Ko) | Scoring multicritère pondéré |
| `auth_service.py` (5.5 Ko) | Login, hash MDP, JWT, reset token |
| `email_service.py` (7.7 Ko) | Envoi emails (SMTP Gmail) |
| `classification_rules.py` | Règles de classification branches/types |

### 3.7 Middlewares

| Middleware | Rôle |
|---|---|
| `SecurityHeadersMiddleware` | En-têtes sécurité HTTP (CSP, X-Frame, HSTS…) |
| `setup_cors` | CORS permissif en dev, restreint en prod |
| `setup_rate_limiter` | SlowAPI — limitation débit IP |

### 3.8 Schémas Pydantic principaux

```python
LoginRequest, Token, UserCreate, UserOut
FilterOptions, FilterParams      # filtrage multi-axe
KPISummary, KPIByCountry, KPIByBranch, KPIByBroker, KPIByYear
PivotRequest, PivotResult
ScoringRequest, ScoringResult, MarketScore
ComparisonRequest, ComparisonResult
ContractSummary, PaginatedContracts
ExternalCountryMarket, RegionAggregate, CountryTimeSeries
```

### 3.9 Dépendances backend (requirements.txt)

```
fastapi==0.110.0 · uvicorn[standard]==0.29.0 · starlette==0.36.3
pandas==2.3.3 · numpy==2.4.3 · openpyxl==3.1.2 · xlsxwriter==3.2.0
rapidfuzz≥3.0.0 · jellyfish≥1.0.0 · scikit-learn≥1.3.0  # matching
python-jose[cryptography]==3.3.0 · bcrypt==4.1.3 · passlib==1.7.4
sqlalchemy==2.0.29 · pymysql==1.1.1
pydantic==2.6.4 · email-validator==2.1.1
slowapi==0.1.9 · python-dotenv==1.0.1 · reportlab==4.1.0
```

---

## 4. Frontend — React 18 / TypeScript / Vite

### 4.1 Stack & Configuration

- **Framework :** Vite 5 + React 18 + TypeScript 5.2
- **CSS :** TailwindCSS 3.4 + variables CSS custom (`index.css`)
- **Routing :** React Router DOM v6 (lazy-loading + code splitting)
- **Charts :** Recharts 2.12
- **Maps :** react-simple-maps + topojson-client
- **Tables :** @tanstack/react-table v8
- **Formulaires :** react-select, react-slider
- **Animations :** framer-motion
- **Toasts :** react-hot-toast
- **Icons :** lucide-react
- **HTTP :** axios
- **Virtualisation :** react-window

### 4.2 Arborescence des pages (22 pages)

```
src/pages/
├── Home.tsx               → Page d'entrée publique (Axe 1 / Axe 2)
├── ModelisationHome.tsx   → Hub Axe 2 SCAR — carte africaine + KPIs
├── Login.tsx              → Authentification
├── ResetPassword.tsx      → Demande reset MDP
├── ChangePassword.tsx     → Changement MDP (first login)
├── Dashboard.tsx          → Tableau de bord global
│
│   ── Analyse ──
├── Analysis.tsx           → Analyse Globale (KPIs pays/branche/année)
├── CedanteAnalysis.tsx    → Analyse Cédante (drill URL /analyse-cedante/:cedante)
├── BrokerAnalysis.tsx     → Analyse Courtiers (liste + filtres)
├── BrokerDetail.tsx       → Détail courtier (/analyse-courtiers/:brokerName)
├── ExpositionRisques.tsx  → Exposition & Risques
│
│   ── Comparaison ──
├── Comparison.tsx         → Comparaison directe de marchés
├── MarketSelection.tsx    → Scoring Marché
│
│   ── Pilotage ──
├── TargetShare.tsx        → Cibles TTY
├── FacSaturation.tsx      → Saturation FAC
│
│   ── Rétrocession ──
├── AffairesTraites.tsx    → Affaires traitées (rétrocession)
├── PanelSecurites.tsx     → Panel de Sécurités
├── FacToFac.tsx           → FAC-to-FAC Partenaires
│
│   ── Autres ──
├── Recommendations.tsx    → Recommandations
├── InactiveClients.tsx    → Clients inactifs / Pipeline
├── TopBrokers.tsx         → Top Brokers
└── Admin.tsx              → Administration (admin only)
```

### 4.3 Routes (App.tsx)

| Route | Page | Protection |
|---|---|---|
| `/` | Home | Public |
| `/modelisation` | ModelisationHome | Public |
| `/login` | Login | Public |
| `/reset-password` | ResetPassword | Public |
| `/change-password` | ChangePassword | Public |
| `/dashboard` | Dashboard | Auth requis |
| `/analyse` & `/analyse/:pays` | Analysis | Auth requis |
| `/analyse-cedante` & `/analyse-cedante/:cedante` | CedanteAnalysis | Auth requis |
| `/analyse-courtiers` | BrokerAnalysis | Auth requis |
| `/analyse-courtiers/:brokerName` | BrokerDetail | Auth requis |
| `/exposition` | ExpositionRisques | Auth requis |
| `/comparaison` | Comparison | Auth requis |
| `/scoring` | MarketSelection | Auth requis |
| `/cibles-tty` | TargetShare | Auth requis |
| `/fac-saturation` | FacSaturation | Auth requis |
| `/retrocession/traites` | AffairesTraites | Auth requis |
| `/retrocession/securites` | PanelSecurites | Auth requis |
| `/retrocession/fac-to-fac` | FacToFac | Auth requis |
| `/recommandations` | Recommendations | Auth requis |
| `/admin` | Admin | Admin only |
| `*` | → `/` | — |

### 4.4 Navigation (Layout.tsx)

Navbar glassmorphism dark navy avec dropdowns CSS hover :

```
[AtlanticRe Logo] | Tableau de bord | Analyse ▼ | Comparaison ▼ | Pilotage ▼ | Rétrocession ▼ | Recommandations | [Administration*] | [Data chip] [Actualiser] [Avatar ▼]
```

**Groupes de navigation :**
- **Analyse** : Analyse Globale · Analyse Cédante · Analyse Courtiers · Exposition & Risques
- **Comparaison** : Comparaison directe · Scoring Marché
- **Pilotage** : Cibles TTY · Saturation FAC
- **Rétrocession** : Affaires Traités · Panel de Sécurités · FAC-to-FAC

*Le lien Administration n'apparaît que pour le rôle `admin`.

### 4.5 Contextes React

| Contexte | Rôle |
|---|---|
| `AuthContext` | Gère user, token JWT, login/logout, rôles (`can()`) |
| `DataContext` | Gère le statut des données Excel, `refreshData()`, `dataStatus` |

### 4.6 Composants partagés

| Composant | Description |
|---|---|
| `Layout.tsx` | Navbar + main scrollable + status bar |
| `FilterPanel.tsx` | Panel de filtres global multi-axes |
| `LocalFilterPanel.tsx` | Panel de filtres local (page spécifique) |
| `PageFilterPanel.tsx` | Filtres avec persistance URL |
| `ActiveFiltersBar.tsx` | Barre de chips filtres actifs |
| `DataTable.tsx` | Table virtualisée (@tanstack/react-table) |
| `KPICards.tsx` | Cards KPI avec formatage compact |
| `DashboardAlerts.tsx` | Alertes dashboard (ULR, volume, etc.) |
| `ExportButton.tsx` | Bouton export (Excel / PDF) |
| `PipelineView.tsx` | Vue pipeline clients |
| `ErrorBoundary.tsx` | Gestion d'erreurs React |
| `Charts/` | Composants Recharts (Bar, Line, Radar, Area…) |
| `ui/` | Composants UI primitifs |

### 4.7 Système de filtres (FilterParams)

Tous les endpoints KPI acceptent un objet `FilterParams` optionnel :

```typescript
{
  perimetre?: string[]          // AE, AM
  type_contrat_spc?: string[]   // FAC, TTY, TTE
  specialite?: string[]
  branche?: string[]
  sous_branche?: string[]
  pays_risque?: string[]
  pays_cedante?: string[]
  courtier?: string[]
  cedante?: string[]
  underwriting_years?: number[]
  uw_year_min?: number
  uw_year_max?: number
  statuts?: string[]
  type_of_contract?: string[]
  type_cedante?: string[]
  prime_min?: float · prime_max?: float
  ulr_min?: float · ulr_max?: float
  share_min?: float · share_max?: float
  commission_min?: float · commission_max?: float
  courtage_min?: float · courtage_max?: float
}
```

---

## 5. Module Axe 1 — Portefeuille Réassurance

### 5.1 Source de données principale

Fichier Excel : `AtlanticRe_Reassurance.xlsx`  
Chargé **en mémoire** au démarrage via `data_service.load_excel()` (pandas DataFrame).  
Rechargeable dynamiquement via `POST /api/data/reload` (admin uniquement).

### 5.2 Colonnes clés du DataFrame

| Colonne | Description |
|---|---|
| `POLICY_ID` | Identifiant unique de la police |
| `INT_SPC` | Type contrat (FAC, TTY, TTE) |
| `INT_BRANCHE` | Branche (Auto, RC, Corps, Incendie…) |
| `INT_CEDANTE` | Nom de la cédante |
| `INT_BROKER` | Nom du broker/courtier |
| `PAYS_RISQUE` | Pays du risque |
| `PAYS_CEDANTE` | Pays de la cédante |
| `UNDERWRITING_YEAR` | Année de souscription |
| `WRITTEN_PREMIUM` | Prime écrite |
| `ULR` | Ultimate Loss Ratio |
| `RESULTAT` | Résultat technique |
| `SUM_INSURED` | Capitaux assurés |
| `COMMISSION` | Taux de commission |
| `SHARE_WRITTEN` | Part souscrite |

### 5.3 Scoring Marché

Algorithme de scoring personnalisable (POST `/api/scoring`) avec critères pondérés :

| Critère | Poids défaut | Seuil | Direction |
|---|---|---|---|
| ULR | 40% | 70% | lower_is_better |
| Prime écrite | 25% | 100 000 | higher_is_better |
| Résultat | 20% | 0 | higher_is_better |
| Commission | 10% | 35% | lower_is_better |
| Share Written | 5% | 5% | higher_is_better |

**Badge résultant :** `ATTRACTIF / NEUTRE / A_EVITER`

### 5.4 Matching Intelligents (SmartMatcher)

#### CedanteMatchingService
Algorithme multi-étapes pour normaliser les noms de cédantes :
1. Nettoyage & tokenisation
2. Similarité exacte (hash)
3. Fuzzy matching (RapidFuzz — Levenshtein)
4. Phonétique (Jellyfish — Double Metaphone)
5. TomTomScore ML (scikit-learn TF-IDF cosine)

#### BrokerMatchingService
Même pipeline appliqué aux noms de courtiers/brokers.

---

## 6. Module Axe 2 — Modélisation Afrique (SCAR / Reach 2030)

### 6.1 Données externes (CSV → MySQL)

| Fichier | Table cible | Contenu |
|---|---|---|
| `marche_assurance_non_vie_afrique_clean.csv` | `ext_marche_non_vie` | Primes non-vie, pénétration, S/P, densité |
| `marche_assurance_vie_afrique_clean.csv` | `ext_marche_vie` | Primes vie, pénétration, densité |
| `wgi_africa_wide_kaopen_clean.csv` | `ext_gouvernance` | FDI, stabilité politique, qualité réglementaire, KAOPEN |
| `africa_eco_integration_clean.csv` | `ext_macroeconomie` | PIB, croissance, inflation, compte courant |

**Sources :** Axco Navigator · Banque Mondiale WGI · ARCA · IPEC · DGAMP · Chinn & Ito (2006) · FANAF · BEAC

### 6.2 Périmètre géographique

**34 pays africains** couverts :

| Région | Pays |
|---|---|
| Maghreb | Algérie, Égypte, Maroc, Mauritanie, Tunisie |
| CIMA | Bénin, Burkina Faso, Cameroun, Congo, Côte d'Ivoire, Gabon, Mali, Niger, Sénégal, Tchad, Togo |
| Afrique Est | Burundi, Éthiopie, Kenya, Madagascar, Malawi, Mozambique, Ouganda, RD Congo, Tanzanie, Zambie |
| Afrique Australe | Afrique du Sud, Angola, Botswana, Namibie |
| Afrique Ouest | Ghana, Nigéria |
| Îles | Cap-Vert, Maurice |

### 6.3 Page ModelisationHome

Interface SCAR avec :
- **Navbar verte SCAR** propre (thème olive, séparée du Layout principal)
- **4 KPI Cards** détaillées (Économique · Assurance Vie · Assurance Non-Vie · Réglementaire)
- **Carte Afrique interactive** (react-simple-maps + ZoomableGroup + tooltips)
  - Pays périmètre : olive (#4E6820)
  - Pays hors périmètre : gris foncé
- **Modale détails** par critère avec sources de données
- Fetch `GET /api/public/overview/stats` (endpoint non authentifié)

### 6.4 Modules SCAR prévus (Soon)

| Module | Route prévue |
|---|---|
| Scoring SCAR | `/modelisation/scoring` |
| Critères & poids | `/modelisation/criteres` |
| Carte d'attractivité | `/modelisation/carte` |
| Vue régionale | `/modelisation/regions` |
| Comparaison marchés | `/modelisation/comparaison` |
| Projections ML | `/modelisation/projections` |
| Recommandations | `/modelisation/recommandations` |

---

## 7. Module Rétrocession

### 7.1 Affaires Traitées (`/retrocession/traites`)

Source : `AtlanticRe_Retrocession_AffairesTraites.xlsx`  
Chargé via `retro_service.load_retro_excel()`.  
API : `GET /api/retro/*`

Fonctionnalités :
- Liste complète des affaires de rétrocession
- Filtres par partenaire (Donneur d'ordre / Preneur d'ordre)
- Filtres par rôle (Apporteur / Placeur)
- KPIs agrégés (primes cédées, commissions, soldes)

### 7.2 Panel de Sécurités (`/retrocession/securites`)

Vue des traités de sécurités — protections, excédents de sinistres.

### 7.3 FAC-to-FAC Partenaires (`/retrocession/fac-to-fac`)

Source : `FCM_Partenaires_v2.xlsx`  
API : `GET /api/fac-to-fac/*`

Fonctionnalités :
- Vue globale des partenaires FAC
- Filtres Donneur/Preneur, Apporteur/Placeur
- Saturation FAC par branche (indicateur couleur : vert = saturé, rouge = non saturé)
- Modale de détail par branche (toutes branches, saturées et non saturées)

---

## 8. Module Pilotage

### 8.1 Cibles TTY (`/cibles-tty`)

Source : données réassurance filtrées sur TTY.  
API : `GET /api/target-share/*`

Fonctionnalités :
- Définition des parts cibles par pays/branche
- Comparaison réalisé vs cible
- Alertes dépassement/sous-utilisation

### 8.2 Saturation FAC (`/fac-saturation`)

Analyse de la saturation du portefeuille FAC :
- Branches saturées (vert) vs branches en alerte (rouge)
- Seuils configurables
- Modale de détail par branche

---

## 9. Module Administration (`/admin`)

Accessible uniquement au rôle `admin`.

| Fonctionnalité | Endpoint |
|---|---|
| Liste des utilisateurs | `GET /api/admin/users` |
| Créer un utilisateur | `POST /api/admin/users` |
| Modifier un utilisateur | `PUT /api/admin/users/{id}` |
| Désactiver / activer | `PATCH /api/admin/users/{id}/toggle` |
| Réinitialiser le MDP | `POST /api/admin/users/{id}/reset-password` |
| Logs d'activité | `GET /api/admin/logs` |
| Configurer les chemins Excel | `PUT /api/admin/config` |

**Rôles utilisateurs :**
- `admin` : accès total + administration
- `souscripteur` : accès full lecture + export
- `lecteur` : lecture seule, pas d'export

---

## 10. Sécurité

| Couche | Mécanisme |
|---|---|
| Authentification | JWT HS256, 8h, blacklist via `token_version` |
| MDP | bcrypt hash (passlib) |
| Reset MDP | Token 128 chars, expiry 1h, envoi email SMTP |
| First login | `must_change_password=True` → redirection forcée |
| Rate limiting | SlowAPI (par IP, configurable) |
| CORS | Origines whitelist en prod |
| Headers HTTP | CSP, X-Frame-Options, HSTS, X-Content-Type |

---

## 11. Design System Frontend

### Palette couleurs principale

| Rôle | Valeur | Usage |
|---|---|---|
| Navy deep | `hsl(209,35%,12%)` | Fond header navbar |
| Navy | `hsl(209,30%,18%)` | Fond sections |
| Olive primary | `hsl(83,52%,36%)` | Accents, CTA, active states |
| Olive light | `hsl(83,50%,55%)` | Icons actives, textes accentués |
| Text white dim | `rgba(255,255,255,0.55)` | Nav items inactifs |

### Thème Axe 2 (SCAR)

| Rôle | Valeur |
|---|---|
| Fond header | `hsl(83,40%,10%)` → `hsl(100,36%,18%)` |
| Accent | `hsl(83,60%,70%)` |
| Logo badge | `SCAR` (vs `Re` pour Axe 1) |

### Typographie

`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Animations

- `orbFloat` / `orbFloat2` : flottement lent des orbes décoratifs
- `fadeUp` : entrée des sections (opacity + translateY)
- `shimmer` : effet glossy sur textes gradient
- `spin` : spinner chargement
- `animate-float` : logo badge

---

## 12. Données External — Sources & Couverture

### CSV disponibles dans `data/external/`

| Fichier | Taille | Couverture |
|---|---|---|
| `marche_assurance_non_vie_afrique_clean.csv` | 14 Ko | 34 pays · ~2010–2024 |
| `marche_assurance_vie_afrique_clean.csv` | 12 Ko | 34 pays · ~2010–2024 |
| `wgi_africa_wide_kaopen_clean.csv` | 29 Ko | 34 pays · WGI + KAOPEN |
| `africa_eco_integration_clean.csv` | 33 Ko | 34 pays · PIB, inflation, FDI |

**Seed automatique** au démarrage si les 5 tables (`ref_pays` + 4 `ext_*`) sont vides.

---

## 13. Démarrage local

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Copier .env.example → .env et renseigner les variables
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Admin par défaut créé automatiquement :**
- Username : `admin`
- Password : `Admin@123` *(à changer au 1er login)*

---

## 14. État du code & Points d'attention

### ✅ Fonctionnel et stable

- Auth complète (login, reset, first-login)
- Analyse Globale, Cédante, Courtiers avec drill-down URL
- Dashboard KPIs principal
- FAC Saturation (couleurs, modale détail)
- Affaires Traitées (filtres Donneur/Preneur/rôles)
- FAC-to-FAC (filtres partenaires)
- Cibles TTY
- Export Excel/PDF
- Admin panel

### 🔄 En cours / À finaliser

- Module SCAR complet (scoring multicritère, carte attractivité, ML)
- Données externes : intégration régionale BAD manquante (`pending: true`)
- Routes SCAR prévues désactivées (badge "Soon")

### ⚠️ Points d'attention

- Le DataFrame principal est **in-memory** (stateless) — un redémarrage du backend recharge le fichier Excel
- `kpis_OLD_BACKUP.py` (54 Ko) — fichier legacy conservé, non utilisé en prod
- `token_version` sur `User` permet d'invalider tous les tokens existants d'un utilisateur
- Migrations SQL manuelles (pas d'Alembic) — scripts dans `backend/migrations/`

---

*Document généré automatiquement le 14 avril 2026 à partir du code source — commit `709e70d`.*
