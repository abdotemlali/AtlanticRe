# Atlantic Re — Plan d'Implémentation : Module Rétrocession par Traités
> **Version** : 1.0.0 | **Date** : Avril 2026  
> **Module** : Affaires Traités + Panel de Sécurités  
> **Projet** : Plateforme Atlantic Re — Phase 2

---

## Table des matières

1. [Vue d'ensemble du module](#1-vue-densemble-du-module)
2. [Dataset — Fichier CSV](#2-dataset--fichier-csv)
3. [Backend — Chargement et Services](#3-backend--chargement-et-services)
4. [Backend — Endpoints API](#4-backend--endpoints-api)
5. [Frontend — Architecture et Navigation](#5-frontend--architecture-et-navigation)
6. [Page 1 — Affaires Traités (Vue Globale)](#6-page-1--affaires-traités-vue-globale)
7. [Page 2 — Affaires Traités (Vue par Courtier)](#7-page-2--affaires-traités-vue-par-courtier)
8. [Page 3 — Panel de Sécurités](#8-page-3--panel-de-sécurités)
9. [Filtres — Système Indépendant](#9-filtres--système-indépendant)
10. [Types TypeScript](#10-types-typescript)
11. [Constantes API](#11-constantes-api)
12. [Checklist d'implémentation](#12-checklist-dimplémentation)

---

## 1. Vue d'ensemble du module

### Structure de navigation

Ce module s'intègre dans la sidebar de l'application existante avec **deux entrées distinctes** qui fonctionnent comme la navigation Comparaison actuelle (onglets au sein d'une section).

```
Sidebar (existante)
├── Dashboard
├── Analyse Globale
├── Analyse Cédante
├── Exposition & Risques
├── Scoring
├── Recommandations
├── Comparaison
│   ├── Comparaison Directe
│   └── Scoring Marché
│
├── ── NOUVEAU ──
├── Rétrocession                    ← nouvelle section dans la sidebar
│   ├── Affaires Traités            ← page avec 2 onglets internes
│   │   ├── [Onglet] Vue Globale
│   │   └── [Onglet] Vue par Courtier
│   └── Panel de Sécurités         ← page indépendante
│
├── Saturation FAC
├── Top Brokers
└── Administration
```

### Routes React Router

```typescript
// App.tsx — ajouter ces routes dans le router existant
<Route path="/retrocession/traites"   element={<AffairesTraites />} />
<Route path="/retrocession/securites" element={<PanelSecurites />} />
```

### Source de données

- **Dataset existante** : `EXCEL_FILE_PATH` (contrats — inchangée)
- **Nouvelle dataset** : `RETRO_CSV_PATH` (variable d'environnement) → fichier `retrocession_traites.csv`
- Les deux datasets sont chargées indépendamment au démarrage du serveur

---

## 2. Dataset — Fichier CSV

### Nom du fichier

```
retrocession_traites.csv
```

### Séparateur et encodage

```
Séparateur : ;  (point-virgule, cohérent avec les exports existants)
Encodage   : utf-8-sig  (UTF-8 avec BOM — cohérent avec les exports existants)
```

### Colonnes exactes

```
TRAITE ; NATURE ; UY ; EPI ; DIRECT_COURTIER ; SECURITE ;
RATING_A_PLUS_PCT ; PART_PCT ; PMD_EPI_100 ; PMD_PAR_SECURITE ;
COMMISSION_COURTAGE_PCT ; COMMISSION_COURTAGE
```

### Exemple de lignes

```csv
TRAITE;NATURE;UY;EPI;DIRECT_COURTIER;SECURITE;RATING_A_PLUS_PCT;PART_PCT;PMD_EPI_100;PMD_PAR_SECURITE;COMMISSION_COURTAGE_PCT;COMMISSION_COURTAGE
Non Marine Domestic;Non Proportionnel;2026;244382488;courtier 1;Swiss Re;78.5;25.0;47955429;11988857;8.5;1019053
Non Marine Domestic;Non Proportionnel;2026;244382488;courtier 1;Africa Re;78.5;15.0;47955429;7193314;8.5;611432
Non Marine Domestic;Non Proportionnel;2026;244382488;courtier 1;Hannover Re;78.5;20.0;47955429;9591086;8.5;815242
```

### Variable d'environnement à ajouter

```bash
# .env (backend)
RETRO_CSV_PATH=/chemin/absolu/vers/retrocession_traites.csv
```

---

## 3. Backend — Chargement et Services

### 3.1 — Nouveau service : `retro_service.py`

Créer dans `backend/services/retro_service.py` — même pattern que `data_service.py`.

```python
# backend/services/retro_service.py

import pandas as pd
import numpy as np
from typing import Optional
import os

# Cache mémoire global (même pattern que _df dans data_service.py)
_retro_df: Optional[pd.DataFrame] = None

NUMERIC_COLS = [
    "EPI", "RATING_A_PLUS_PCT", "PART_PCT",
    "PMD_EPI_100", "PMD_PAR_SECURITE",
    "COMMISSION_COURTAGE_PCT", "COMMISSION_COURTAGE"
]

def load_retro_csv() -> pd.DataFrame:
    """Charge le CSV rétrocession en mémoire — appelé au lifespan du serveur."""
    global _retro_df
    path = os.getenv("RETRO_CSV_PATH", "retrocession_traites.csv")
    
    df = pd.read_csv(path, sep=";", dtype=str, encoding="utf-8-sig")
    
    # Conversion colonnes numériques
    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].str.replace(",", ".").str.replace(" ", ""),
                errors="coerce"
            ).fillna(0.0)
    
    # Conversion UY en entier
    df["UY"] = pd.to_numeric(df["UY"], errors="coerce").fillna(0).astype(int)
    
    # Colonnes dérivées utiles
    df["TAUX_PMD"] = np.where(df["EPI"] > 0, df["PMD_EPI_100"] / df["EPI"], 0)
    df["COUT_NET"] = df["PMD_PAR_SECURITE"] + df["COMMISSION_COURTAGE"]
    df["EST_DIRECT"] = df["DIRECT_COURTIER"].str.upper() == "DIRECT"
    
    _retro_df = df
    return df

def get_retro_df() -> pd.DataFrame:
    """Retourne le DataFrame en cache."""
    global _retro_df
    if _retro_df is None:
        load_retro_csv()
    return _retro_df.copy()

def apply_retro_filters(
    df: pd.DataFrame,
    uy: Optional[list] = None,
    nature: Optional[str] = None,
    traite: Optional[str] = None,
    courtier: Optional[str] = None,
    securite: Optional[str] = None,
) -> pd.DataFrame:
    """Applique les filtres locaux de la page sur le DataFrame rétrocession."""
    if uy:
        df = df[df["UY"].isin(uy)]
    if nature:
        df = df[df["NATURE"] == nature]
    if traite:
        df = df[df["TRAITE"] == traite]
    if courtier:
        df = df[df["DIRECT_COURTIER"] == courtier]
    if securite:
        df = df[df["SECURITE"] == securite]
    return df
```

### 3.2 — Intégration dans `main.py`

```python
# backend/main.py — dans le lifespan existant

from services.retro_service import load_retro_csv

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_excel()       # existant
    load_retro_csv()   # ← ajouter cette ligne
    yield
```

---

## 4. Backend — Endpoints API

### Nouveau router : `backend/routers/retro.py`

Préfixe : `/api/retro`

```python
from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from services.retro_service import get_retro_df, apply_retro_filters

router = APIRouter(prefix="/api/retro", tags=["retrocession"])
```

### Liste complète des endpoints

---

#### `GET /api/retro/options`
Retourne les valeurs uniques pour alimenter les filtres de la page.

**Réponse :**
```json
{
  "traites": ["Non Marine Domestic", "Marine & Energie", ...],
  "natures": ["Proportionnel", "Non Proportionnel"],
  "courtiers": ["Guy Carpenter", "Aon", "Direct", ...],
  "securites": ["Swiss Re", "Africa Re", ...],
  "uy_list": [2022, 2023, 2024, 2025, 2026],
  "uy_default": 2026
}
```

---

#### `GET /api/retro/summary`
KPIs globaux — affiché dans les cartes en haut des pages.

**Query params :** `uy`, `nature`, `traite`, `courtier`

**Réponse :**
```json
{
  "epi_total": 1842000000,
  "pmd_totale": 312500000,
  "courtage_total": 24800000,
  "cout_net_total": 337300000,
  "ratio_cout_epi_pct": 18.3,
  "nb_traites": 10,
  "nb_securites": 34,
  "nb_courtiers": 12,
  "taux_placement_moyen": 94.2,
  "rating_a_plus_moyen": 67.8
}
```

---

#### `GET /api/retro/by-traite`
Performance agrégée par traité — tableau principal de la Vue Globale.

**Query params :** `uy`, `nature`

**Réponse (liste) :**
```json
[
  {
    "traite": "Non Marine Domestic",
    "nature": "Non Proportionnel",
    "uy": 2026,
    "epi": 244382488,
    "pmd_100": 47955429,
    "pmd_totale": 45720000,
    "courtage_total": 3650000,
    "cout_net": 49370000,
    "taux_pmd_pct": 19.6,
    "ratio_cout_epi_pct": 20.2,
    "nb_securites": 4,
    "taux_placement": 96.5,
    "rating_a_plus_pct": 78.5,
    "courtier": "Guy Carpenter"
  }
]
```

---

#### `GET /api/retro/by-year`
Évolution temporelle — courbe EPI + PMD par année.

**Query params :** `traite`, `nature`

**Réponse (liste) :**
```json
[
  {
    "uy": 2022,
    "epi_total": 1650000000,
    "pmd_totale": 275000000,
    "courtage_total": 21000000,
    "cout_net": 296000000,
    "ratio_cout_epi_pct": 17.9,
    "nb_traites_actifs": 9
  }
]
```

---

#### `GET /api/retro/by-nature`
Répartition Proportionnel vs Non Proportionnel.

**Query params :** `uy`

**Réponse :**
```json
{
  "proportionnel": {
    "epi": 520000000,
    "pmd_totale": 156000000,
    "nb_traites": 4,
    "ratio_cout_epi_pct": 30.0
  },
  "non_proportionnel": {
    "epi": 1322000000,
    "pmd_totale": 181200000,
    "nb_traites": 6,
    "ratio_cout_epi_pct": 13.7
  }
}
```

---

#### `GET /api/retro/by-courtier`
Vue par courtier — pour l'onglet "Vue par Courtier" ET pour le croisement avec la dataset contrats.

**Query params :** `uy`, `nature`, `traite`

**Réponse (liste) :**
```json
[
  {
    "courtier": "Guy Carpenter",
    "est_direct": false,
    "nb_traites_places": 3,
    "epi_gere": 520000000,
    "pmd_placee": 82000000,
    "courtage_percu": 7200000,
    "taux_courtage_moyen": 8.8,
    "securites_utilisees": ["Swiss Re", "Hannover Re", "SCOR"],
    "rating_a_plus_moyen": 100.0,
    "traites_list": ["Non Marine Domestic", "Marine & Energie", "Aviation"],
    "primes_apportees_contrats": 45200000,
    "role_double": true
  }
]
```

> **Note** : `primes_apportees_contrats` et `role_double` sont calculés en croisant avec la dataset contrats existante via `INT_BROKER` = `DIRECT_COURTIER`.

---

#### `GET /api/retro/by-securite`
Vue complète par sécurité — pour la page Panel de Sécurités.

**Query params :** `uy`, `nature`, `traite`, `rating_min`

**Réponse (liste) :**
```json
[
  {
    "securite": "Swiss Re",
    "rating_a_plus": true,
    "nb_traites": 5,
    "uy_list": [2022, 2023, 2024, 2025, 2026],
    "part_moyenne": 18.5,
    "part_max": 28.0,
    "pmd_totale_recue": 48500000,
    "traites_couverts": ["Non Marine Domestic", "Marine & Energie", "Aviation"],
    "natures_couvertes": ["Non Proportionnel"],
    "courtiers_via": ["Guy Carpenter", "Aon"],
    "concentration_score": 62.0
  }
]
```

---

#### `GET /api/retro/placement-status`
Statut du placement par traité/UY — pour alertes taux < 100%.

**Query params :** `uy`

**Réponse (liste) :**
```json
[
  {
    "traite": "RC Décennale",
    "uy": 2026,
    "taux_placement": 88.5,
    "part_non_placee": 11.5,
    "epi_non_couvert": 9200000,
    "statut": "PARTIEL"
  }
]
```

---

#### `GET /api/retro/courtier-croise`
Croisement courtiers dataset contrats × dataset rétrocession — données pour le graphe double rôle.

**Query params :** `uy`

**Réponse (liste) :**
```json
[
  {
    "courtier": "Guy Carpenter",
    "role_apporteur": true,
    "role_placeur": true,
    "primes_apportees": 45200000,
    "pmd_placee": 82000000,
    "volume_total": 127200000,
    "courtage_retro": 7200000
  },
  {
    "courtier": "JB Boda",
    "role_apporteur": true,
    "role_placeur": false,
    "primes_apportees": 12500000,
    "pmd_placee": 0,
    "volume_total": 12500000,
    "courtage_retro": 0
  }
]
```

---

### Enregistrement du router dans `main.py`

```python
from routers.retro import router as retro_router
app.include_router(retro_router)
```

---

## 5. Frontend — Architecture et Navigation

### Nouveaux fichiers à créer

```
frontend/src/
├── pages/
│   ├── AffairesTraites.tsx        ← page avec 2 onglets
│   └── PanelSecurites.tsx         ← page indépendante
│
├── components/
│   └── retro/
│       ├── RetroKPICards.tsx      ← cartes KPI spécifiques rétrocession
│       ├── RetroFilterPanel.tsx   ← panneau de filtres indépendant
│       ├── TraiteTable.tsx        ← tableau des traités
│       ├── PlacementGauge.tsx     ← jauge de taux de placement
│       ├── CourtierCroise.tsx     ← graphe double rôle courtier
│       └── SecuriteCard.tsx       ← carte sécurité avec badge rating
│
└── constants/
    └── retroRoutes.ts             ← constantes des routes API rétrocession
```

### Ajout dans la Sidebar

```typescript
// Dans Layout.tsx ou le composant de navigation existant
// Ajouter après la section Comparaison :

{
  label: "Rétrocession",
  icon: <ShieldIcon />,       // ou l'icône appropriée
  children: [
    { label: "Affaires Traités", path: "/retrocession/traites" },
    { label: "Panel de Sécurités", path: "/retrocession/securites" }
  ]
}
```

### Constantes API à ajouter

```typescript
// frontend/src/constants/retroRoutes.ts

export const RETRO_ROUTES = {
  OPTIONS:           "/api/retro/options",
  SUMMARY:           "/api/retro/summary",
  BY_TRAITE:         "/api/retro/by-traite",
  BY_YEAR:           "/api/retro/by-year",
  BY_NATURE:         "/api/retro/by-nature",
  BY_COURTIER:       "/api/retro/by-courtier",
  BY_SECURITE:       "/api/retro/by-securite",
  PLACEMENT_STATUS:  "/api/retro/placement-status",
  COURTIER_CROISE:   "/api/retro/courtier-croise",
};
```

---

## 6. Page 1 — Affaires Traités (Vue Globale)

**Route :** `/retrocession/traites` — onglet actif par défaut : `Vue Globale`

### Layout général

```
┌─────────────────────────────────────────────────────────────────┐
│  RÉTROCESSION / AFFAIRES TRAITÉS                                │
│  ┌────────────────────┐  ┌──────────────────────────────────┐   │
│  │ [Onglet] Vue       │  │ [Onglet] Vue par Courtier        │   │
│  │ Globale ●          │  │                                  │   │
│  └────────────────────┘  └──────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  [PANNEAU DE FILTRES LOCAUX]                                    │
│  UY (multi) | Nature | Traité | Recherche libre                 │
├─────────────────────────────────────────────────────────────────┤
│  [KPI CARDS] ─ 5 cartes                                         │
│  EPI Total | PMD Totale | Courtage Total | Taux Placement | Rating>A │
├─────────────────────────────────────────────────────────────────┤
│  [LIGNE 1 GRAPHES]                                              │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │ Évolution EPI + PMD     │  │  Répartition Prop / Non-Prop │  │
│  │ par année (line chart)  │  │  (donut chart)               │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [LIGNE 2 GRAPHES]                                              │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │ PMD par Traité          │  │  Taux de Placement par Traité │  │
│  │ (bar chart horizontal)  │  │  (gauge / bar avec couleurs) │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [TABLEAU DÉTAIL PAR TRAITÉ]                                    │
│  Colonnes : Traité | Nature | UY | EPI | PMD 100% | PMD Totale │
│           | Courtage | Coût Net | Ratio% | Nb Séc | Placement% │
│           | Rating>A% | Courtier                                │
│  Tri | Pagination | Ligne expandable → détail par sécurité      │
├─────────────────────────────────────────────────────────────────┤
│  [ALERTES]                                                      │
│  Traités avec taux placement < 95% | Rating < 50%               │
└─────────────────────────────────────────────────────────────────┘
```

### KPI Cards (5 cartes)

| Card | Valeur | Sous-titre | Couleur |
|------|--------|-----------|---------|
| EPI Total | SUM(EPI) | "Volume de prime protégé" | Bleu navy |
| PMD Totale | SUM(PMD_PAR_SECURITE) | "Coût de protection payé" | Orange |
| Courtage Total | SUM(COMMISSION_COURTAGE) | "Coût d'intermédiation" | Rouge doux |
| Taux Placement | AVG(taux_placement) % | "Part du traité couverte" | Vert si >95%, orange sinon |
| Rating > A | AVG(RATING_A_PLUS_PCT) % | "Part chez sécurités solides" | Vert si >70%, orange sinon |

### Graphes détaillés

**Graphe 1 — Évolution EPI + PMD par année** (LineChart Recharts)
- Axe X : UY (2022 → 2026)
- Ligne 1 : EPI total (bleu)
- Ligne 2 : PMD totale (orange)
- Ligne 3 : Coût Net (rouge pointillé)
- Tooltip : valeurs en MAD formatées

**Graphe 2 — Répartition Proportionnel / Non Proportionnel** (PieChart / Donut)
- Secteur 1 : EPI Proportionnel
- Secteur 2 : EPI Non Proportionnel
- Label : % et montant en MAD
- Légende avec couleurs distinctes

**Graphe 3 — PMD par Traité** (BarChart horizontal)
- Axe Y : nom du traité
- Axe X : montant PMD
- Barres colorées par Nature (Prop = bleu, Non-Prop = orange)
- Tooltip : EPI + PMD + ratio %

**Graphe 4 — Taux de Placement par Traité** (BarChart avec seuil)
- Axe Y : nom du traité
- Axe X : % de placement (0 → 100%)
- Couleur : vert si ≥ 95%, orange si 85-95%, rouge si < 85%
- Ligne de référence à 100%

**Tableau des traités**
- Ligne principale : traité agrégé
- Ligne expandable : détail par sécurité (Sécurité | Part% | PMD | Courtage | Rating)
- Export CSV/Excel disponible

---

## 7. Page 2 — Affaires Traités (Vue par Courtier)

**Route :** `/retrocession/traites` — onglet actif : `Vue par Courtier`

### Layout général

```
┌─────────────────────────────────────────────────────────────────┐
│  [Onglets] Vue Globale | Vue par Courtier ●                     │
├─────────────────────────────────────────────────────────────────┤
│  [FILTRES LOCAUX] UY | Nature | Traité                          │
├─────────────────────────────────────────────────────────────────┤
│  [SECTION 1 — DOUBLE RÔLE COURTIER]                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CROISEMENT : Courtiers Apporteurs × Courtiers Placeurs  │   │
│  │                                                          │   │
│  │  Bubble chart ou Bar chart groupé :                      │   │
│  │  - Axe X : Primes apportées (dataset contrats)           │   │
│  │  - Axe Y : PMD placée (dataset rétrocession)             │   │
│  │  - Taille bulle : Volume total                           │   │
│  │  - Couleur : Apporteur seul / Placeur seul / Double rôle │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  [SECTION 2 — PERFORMANCE PAR COURTIER PLACEUR]                 │
│  ┌─────────────────────────────┐  ┌────────────────────────┐   │
│  │ Top courtiers par PMD placée│  │ Taux courtage par       │   │
│  │ (bar chart horizontal)      │  │ courtier (bar chart)    │   │
│  └─────────────────────────────┘  └────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  [TABLEAU COURTIERS]                                            │
│  Courtier | Rôle | Traités Placés | EPI Géré | PMD Placée      │
│  | Courtage Perçu | Taux Moy | Séc Utilisées | Rating>A Moy    │
│  Badge : 🔵 Apporteur | 🟠 Placeur | 🟢 Double Rôle            │
├─────────────────────────────────────────────────────────────────┤
│  [SECTION 3 — DÉTAIL COURTIER SÉLECTIONNÉ]                      │
│  Sélectionner un courtier → voir :                              │
│  - Traités qu'il a placés + PMD + Rating des sécurités choisies │
│  - Contrats qu'il a apportés à Atlantic Re (depuis dataset)     │
│  - Évolution de son activité par année                          │
└─────────────────────────────────────────────────────────────────┘
```

### Logique du croisement courtiers

```python
# backend — dans retro_service.py ou endpoint dédié

def get_courtier_croise(df_retro, df_contrats, uy=None):
    """
    Croise les courtiers de la dataset rétrocession
    avec les courtiers de la dataset contrats.
    """
    # Courtiers dans la rétrocession
    retro_courtiers = df_retro.groupby("DIRECT_COURTIER").agg(
        pmd_placee=("PMD_PAR_SECURITE", "sum"),
        courtage_retro=("COMMISSION_COURTAGE", "sum"),
        nb_traites=("TRAITE", "nunique")
    ).reset_index()
    retro_courtiers.columns = ["courtier", "pmd_placee", "courtage_retro", "nb_traites"]
    
    # Courtiers dans les contrats (dataset existante)
    contrats_courtiers = df_contrats.groupby("INT_BROKER").agg(
        primes_apportees=("WRITTEN_PREMIUM", "sum"),
        nb_contrats=("POLICY_SEQUENCE_NUMBER", "count")
    ).reset_index()
    contrats_courtiers.columns = ["courtier", "primes_apportees", "nb_contrats"]
    
    # Fusion OUTER pour avoir tous les courtiers
    merged = pd.merge(
        retro_courtiers,
        contrats_courtiers,
        on="courtier",
        how="outer"
    ).fillna(0)
    
    # Détermination du rôle
    merged["role_apporteur"] = merged["primes_apportees"] > 0
    merged["role_placeur"] = merged["pmd_placee"] > 0
    merged["role_double"] = merged["role_apporteur"] & merged["role_placeur"]
    merged["volume_total"] = merged["pmd_placee"] + merged["primes_apportees"]
    
    return merged.sort_values("volume_total", ascending=False)
```

### Badges visuels

```typescript
// Couleurs des badges de rôle
const ROLE_CONFIG = {
  double:     { label: "Double Rôle", color: "#4E6820", bg: "#EEF3E6" },  // olive
  apporteur:  { label: "Apporteur",   color: "#2D3E50", bg: "#E8EDF1" },  // navy
  placeur:    { label: "Placeur",     color: "#E67E22", bg: "#FEF5EC" },  // orange
  aucun:      { label: "Autre",       color: "#95A5A6", bg: "#F4F6F7" },  // gris
};
```

---

## 8. Page 3 — Panel de Sécurités

**Route :** `/retrocession/securites`

### Layout général

```
┌─────────────────────────────────────────────────────────────────┐
│  PANEL DE SÉCURITÉS                                             │
├─────────────────────────────────────────────────────────────────┤
│  [FILTRES LOCAUX] UY | Nature | Traité | Rating (A+ seulement)  │
├─────────────────────────────────────────────────────────────────┤
│  [KPI CARDS] — 4 cartes                                         │
│  Nb Sécurités | PMD Totale Placée | % Rating>A | Conc. Max      │
├─────────────────────────────────────────────────────────────────┤
│  [LIGNE 1]                                                      │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │ Top 10 sécurités        │  │  Répartition Rating A+ vs    │  │
│  │ par PMD reçue           │  │  Rating < A (donut)          │  │
│  │ (bar chart horizontal)  │  │                              │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [LIGNE 2]                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Heatmap : Sécurité × Traité — intensité = PMD reçue     │   │
│  │ (visualisation de la diversification du panel)          │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  [GRILLE DE CARTES SÉCURITÉS]                                   │
│  Pour chaque sécurité :                                         │
│  ┌──────────────────────────────────────┐                       │
│  │ [Badge Rating] Swiss Re              │                       │
│  │ PMD Totale reçue : 48 500 000 MAD   │                       │
│  │ Traités couverts : 5                 │                       │
│  │ Part moyenne     : 18,5%             │                       │
│  │ Années actives   : 2022 → 2026       │                       │
│  │ Via courtiers    : Guy Carpenter, Aon│                       │
│  │ [Voir détail ▼]                      │                       │
│  └──────────────────────────────────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│  [ALERTE CONCENTRATION]                                         │
│  Sécurités portant > 30% d'un traité → signalées en rouge       │
└─────────────────────────────────────────────────────────────────┘
```

### KPI Cards Panel de Sécurités

| Card | Valeur | Interprétation |
|------|--------|---------------|
| Nb Sécurités actives | COUNT DISTINCT(SECURITE) | Diversité du panel |
| PMD Totale Placée | SUM(PMD_PAR_SECURITE) | Engagement total |
| % Rating > A | AVG(RATING_A_PLUS_PCT) | Solidité financière |
| Concentration Max | MAX(PART_PCT) sur un traité | Risque de dépendance |

### Heatmap Sécurité × Traité

```typescript
// Structure de données pour la heatmap
type HeatmapCell = {
  securite: string;
  traite: string;
  pmd: number;          // intensité de couleur
  part_pct: number;     // affiché au hover
  uy: number;
};

// Couleur : gradient blanc → orange → rouge selon PMD
// Cellule vide (sécurité n'intervient pas sur ce traité) : gris clair
```

### Badge Rating

```typescript
const RATING_BADGE = {
  true:  { label: "Rating ≥ A", color: "#27AE60", icon: "✓" },
  false: { label: "Rating < A", color: "#E67E22", icon: "~" },
};
```

---

## 9. Filtres — Système Indépendant

Les filtres de ces pages sont **totalement indépendants** des filtres globaux de l'application. Ils ne passent pas par le `DataContext` global mais par un contexte local ou un état React local à chaque page.

### Filtres disponibles

| Filtre | Type | Options | Pages concernées |
|--------|------|---------|-----------------|
| UY | Multi-select | 2022, 2023, 2024, 2025, 2026 | Toutes |
| Nature | Select unique | Tous / Proportionnel / Non Proportionnel | Toutes |
| Traité | Select unique | Liste des traités | Toutes |
| Courtier | Select unique | Liste des courtiers | Vue Globale, Vue Courtier |
| Sécurité | Select unique | Liste des sécurités | Panel Sécurités |
| Rating | Toggle | Tous / Rating ≥ A seulement | Panel Sécurités |

### Comportement par défaut

```typescript
const DEFAULT_RETRO_FILTERS = {
  uy: [],              // vide = toutes les années
  nature: null,        // tous
  traite: null,        // tous
  courtier: null,      // tous
  securite: null,      // tous
  rating_a_only: false // tous les ratings
};
```

### Pas de debounce nécessaire

Les filtres de cette page sont appliqués côté backend via les query params. Utiliser un debounce simple de 200ms sur les selects pour éviter trop d'appels.

---

## 10. Types TypeScript

```typescript
// frontend/src/types/retro.ts

export type RetroNature = "Proportionnel" | "Non Proportionnel";

export interface RetroFilters {
  uy: number[];
  nature: RetroNature | null;
  traite: string | null;
  courtier: string | null;
  securite: string | null;
  rating_a_only: boolean;
}

export interface RetroSummary {
  epi_total: number;
  pmd_totale: number;
  courtage_total: number;
  cout_net_total: number;
  ratio_cout_epi_pct: number;
  nb_traites: number;
  nb_securites: number;
  nb_courtiers: number;
  taux_placement_moyen: number;
  rating_a_plus_moyen: number;
}

export interface RetroTraite {
  traite: string;
  nature: RetroNature;
  uy: number;
  epi: number;
  pmd_100: number;
  pmd_totale: number;
  courtage_total: number;
  cout_net: number;
  taux_pmd_pct: number;
  ratio_cout_epi_pct: number;
  nb_securites: number;
  taux_placement: number;
  rating_a_plus_pct: number;
  courtier: string;
  securites?: RetroSecuriteDetail[];  // expandable
}

export interface RetroSecuriteDetail {
  securite: string;
  part_pct: number;
  pmd_par_securite: number;
  commission_courtage: number;
  est_rating_a: boolean;
}

export interface RetroCourtier {
  courtier: string;
  est_direct: boolean;
  nb_traites_places: number;
  epi_gere: number;
  pmd_placee: number;
  courtage_percu: number;
  taux_courtage_moyen: number;
  securites_utilisees: string[];
  rating_a_plus_moyen: number;
  traites_list: string[];
  primes_apportees_contrats: number;
  role_double: boolean;
  role_apporteur: boolean;
  role_placeur: boolean;
}

export interface RetroSecurite {
  securite: string;
  rating_a_plus: boolean;
  nb_traites: number;
  uy_list: number[];
  part_moyenne: number;
  part_max: number;
  pmd_totale_recue: number;
  traites_couverts: string[];
  natures_couvertes: RetroNature[];
  courtiers_via: string[];
  concentration_score: number;
}

export interface RetroOptions {
  traites: string[];
  natures: RetroNature[];
  courtiers: string[];
  securites: string[];
  uy_list: number[];
  uy_default: number;
}
```

---

## 11. Constantes API

```typescript
// frontend/src/constants/retroRoutes.ts

export const RETRO_ROUTES = {
  OPTIONS:          "/api/retro/options",
  SUMMARY:          "/api/retro/summary",
  BY_TRAITE:        "/api/retro/by-traite",
  BY_YEAR:          "/api/retro/by-year",
  BY_NATURE:        "/api/retro/by-nature",
  BY_COURTIER:      "/api/retro/by-courtier",
  BY_SECURITE:      "/api/retro/by-securite",
  PLACEMENT_STATUS: "/api/retro/placement-status",
  COURTIER_CROISE:  "/api/retro/courtier-croise",
};
```

---

## 12. Checklist d'implémentation

### Backend

- [ ] Créer variable d'environnement `RETRO_CSV_PATH`
- [ ] Créer `backend/services/retro_service.py` avec `load_retro_csv()`, `get_retro_df()`, `apply_retro_filters()`
- [ ] Intégrer `load_retro_csv()` dans le lifespan de `main.py`
- [ ] Créer `backend/routers/retro.py` avec tous les endpoints
- [ ] Implémenter le croisement courtiers dans `retro_service.py`
- [ ] Enregistrer le router dans `main.py`
- [ ] Tester tous les endpoints avec le CSV fake

### Frontend

- [ ] Créer `frontend/src/constants/retroRoutes.ts`
- [ ] Créer `frontend/src/types/retro.ts`
- [ ] Créer le composant `RetroFilterPanel.tsx`
- [ ] Créer le composant `RetroKPICards.tsx`
- [ ] Créer la page `AffairesTraites.tsx` avec système d'onglets
  - [ ] Onglet Vue Globale : 5 KPIs + 4 graphes + tableau expandable
  - [ ] Onglet Vue par Courtier : croisement + graphes + tableau avec badges
- [ ] Créer la page `PanelSecurites.tsx`
  - [ ] 4 KPIs + top 10 bar + donut rating + heatmap + grille cartes
- [ ] Ajouter les deux routes dans `App.tsx`
- [ ] Ajouter la section Rétrocession dans la Sidebar (`Layout.tsx`)
- [ ] Tester le rendu avec la dataset fake

### Intégration finale

- [ ] Remplacer le CSV fake par le CSV réel fourni par l'encadrant
- [ ] Vérifier la cohérence des courtiers entre les deux datasets
- [ ] Valider les KPIs calculés avec l'équipe métier
- [ ] Export CSV/Excel sur les tableaux principaux

---

*Document généré le 08/04/2026 — Plan d'implémentation Phase 2 — Atlantic Re Business Développement*
