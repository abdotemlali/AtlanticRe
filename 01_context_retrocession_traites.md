# Atlantic Re — Contexte Métier : Module Rétrocession par Traités
> **Version** : 1.0.0 | **Date** : Avril 2026  
> **Module** : Affaires Traités + Panel de Sécurités  
> **Projet** : Plateforme Atlantic Re — Phase 2

---

## Table des matières

1. [Positionnement dans la chaîne de risque](#1-positionnement-dans-la-chaîne-de-risque)
2. [Qu'est-ce que la rétrocession par traités ?](#2-quest-ce-que-la-rétrocession-par-traités)
3. [Les deux natures de traités](#3-les-deux-natures-de-traités)
4. [La table de données — 12 colonnes expliquées](#4-la-table-de-données--12-colonnes-expliquées)
5. [Relations entre les colonnes — Chaîne de calcul](#5-relations-entre-les-colonnes--chaîne-de-calcul)
6. [Cycle de vie complet d'un traité](#6-cycle-de-vie-complet-dun-traité)
7. [Cas possibles selon la Nature](#7-cas-possibles-selon-la-nature)
8. [Les acteurs de la table](#8-les-acteurs-de-la-table)
9. [Indicateurs clés à surveiller](#9-indicateurs-clés-à-surveiller)

---

## 1. Positionnement dans la chaîne de risque

Atlantic Re est un **réassureur africain**. Elle se situe au milieu de la chaîne de risque :

```
Assuré (particulier / entreprise)
        │  souscrit une police d'assurance
        ▼
Cédante (compagnie d'assurance)
        │  cède une partie de ses risques à Atlantic Re
        ▼
ATLANTIC RE (réassureur) ◄── notre plateforme
        │  rétrocède une partie de ses risques acceptés
        ▼
Sécurité / Rétrocessionnaire
(Swiss Re, Africa Re, Hannover Re, SCOR...)
```

**Atlantic Re joue donc deux rôles simultanément :**
- Elle est **réassureur** vis-à-vis des cédantes → elle reçoit des primes
- Elle est **cédante** vis-à-vis des sécurités → elle paie des primes (PMD)

La table de rétrocession par traités documente exclusivement ce **second rôle** : comment Atlantic Re transfère une partie de ses risques à d'autres réassureurs.

---

## 2. Qu'est-ce que la rétrocession par traités ?

### Définition

La **rétrocession** est littéralement "la réassurance de la réassurance". Quand Atlantic Re accumule trop de risques sur une branche ou un périmètre géographique, elle ne peut pas tout absorber seule. Elle crée donc des **traités de rétrocession** pour se protéger.

### Pourquoi Atlantic Re rétrocède ?

- **Gestion du capital** : éviter qu'un sinistre catastrophique absorbe trop de fonds propres
- **Diversification du risque** : ne pas être sur-exposée sur une seule branche ou zone
- **Capacité de souscription** : en cédant une partie des risques, elle libère de la capacité pour en accepter de nouveaux
- **Obligation réglementaire** : certaines branches imposent des niveaux de rétention maximaux

### Structure d'un traité

Un traité de rétrocession couvre un **portefeuille entier** d'affaires (contrairement au FAC qui couvre police par police). Par exemple :
- Le traité **Non Marine Domestic** couvre l'ensemble du portefeuille Non Marine local accepté par Atlantic Re
- Le traité **Marine & Energie** couvre l'ensemble des affaires maritimes et énergétiques

Plusieurs **sécurités** participent à chaque traité, chacune prenant une fraction (sa **Part%**). La somme des parts doit couvrir entre 85% et 100% du traité pour qu'il soit considéré comme bien placé.

---

## 3. Les deux natures de traités

### 3.1 — Proportionnel

**Principe** : Atlantic Re cède un pourcentage fixe de ses primes ET de ses sinistres à la sécurité.

```
Pour chaque risque du portefeuille :
  Sécurité reçoit → Part% × Prime de chaque contrat
  Sécurité paie   → Part% × Sinistre de chaque contrat (dès le 1er euro)
```

**Caractéristiques :**
- La sécurité partage le risque dès le premier sinistre, sans seuil
- La prime cédée est directement proportionnelle à la part
- Pas de PMD au sens strict : la prime est calculée sur la quote-part réelle du portefeuille
- Dans notre table : `PMD_EPI_100 = EPI × Taux_quote_part` (taux négocié globalement)
- Utilisé pour : Motor, RC Générale, Life, Marine & Non Marine VS

**Exemple :**
```
EPI         = 100 000 000 MAD
Taux QS     = 30%
PMD 100%    = 30 000 000 MAD
Part sécurité = 20%
Prime sécurité = 30 000 000 × 20% = 6 000 000 MAD

Si sinistre = 5 000 000 MAD sur un contrat :
→ Sécurité paie 20% × 5 000 000 = 1 000 000 MAD à Atlantic Re
```

---

### 3.2 — Non Proportionnel (XL — Excédent de Sinistres)

**Principe** : Atlantic Re paie une prime fixe (PMD) à la sécurité. La sécurité n'intervient QUE si les sinistres dépassent un seuil prédéfini (la **priorité** ou **rétention** d'Atlantic Re).

```
Sinistres < Seuil → Atlantic Re absorbe seule, sécurité ne paie rien
Sinistres > Seuil → Sécurité paie sa Part% du dépassement
```

**Caractéristiques :**
- La PMD est calculée via un taux appliqué sur l'EPI estimé : `PMD = EPI × Taux_PMD`
- Le Taux_PMD est négocié contrat par contrat (typiquement entre 15% et 25%)
- Le seuil (priorité) est fixé dans le contrat du traité — **non présent dans cette table**
- Utilisé pour : Non Marine Domestic, Non Marine International Risk, Non Marine International CAT, Marine & Energie, Aviation, RC Décennale

**Exemple :**
```
EPI          = 244 382 488 MAD
Taux PMD     = 19,6% (négocié)
PMD 100%     = 244 382 488 × 19,6% = 47 955 429 MAD
Part sécurité = 15%
PMD sécurité = 47 955 429 × 15% = 7 193 314 MAD

Seuil XL     = 30 000 000 MAD (dans le contrat)

Sinistre = 80 000 000 MAD :
  Atlantic Re absorbe : 30 000 000 MAD (sa rétention)
  Dépassement         : 50 000 000 MAD → activé
  Sécurité paie 15%  : 50 000 000 × 15% = 7 500 000 MAD → Atlantic Re
```

---

### 3.3 — Comparaison des deux natures

| Critère | Proportionnel | Non Proportionnel |
|---------|--------------|-------------------|
| Déclenchement sécurité | Dès le 1er sinistre | Seulement si sinistre > priorité |
| Base de prime | Quote-part de l'EPI | Taux PMD × EPI |
| Risque pour la sécurité | Partagé proportionnellement | Concentré sur les gros sinistres |
| Avantage pour Atlantic Re | Partage immédiat | Protection catastrophe |
| Visibilité seuil dans la table | N/A | Non (dans le contrat) |
| Ajustement fin d'année | Basé sur prime réelle | PMD minimum garantie |

---

## 4. La table de données — 12 colonnes expliquées

Chaque ligne de la table représente **un traité × une année × une sécurité**.
Un même traité/année peut avoir plusieurs lignes si plusieurs sécurités y participent.

### Nom des colonnes dans le CSV

| # | Nom CSV | Libellé métier | Type | Description |
|---|---------|---------------|------|-------------|
| 1 | `TRAITE` | Traité | str | Ligne de business couverte par ce traité de rétrocession |
| 2 | `NATURE` | Nature | str | `Proportionnel` ou `Non Proportionnel` |
| 3 | `UY` | UY (Underwriting Year) | int | Année de souscription du traité |
| 4 | `EPI` | Assiette de prime (EPI) | float | Estimated Premium Income — prime totale estimée à 100% sur l'année (MAD) |
| 5 | `DIRECT_COURTIER` | Direct / Courtier | str | Canal : `Direct` ou nom du courtier intermédiaire |
| 6 | `SECURITE` | Sécurité | str | Nom du rétrocessionnaire qui porte cette part |
| 7 | `RATING_A_PLUS_PCT` | Rating > A (%) | float | % de la part totale du traité placée auprès de sécurités notées ≥ A |
| 8 | `PART_PCT` | Part (%) | float | Quote-part que cette sécurité accepte de porter sur ce traité |
| 9 | `PMD_EPI_100` | PMD / EPI 100% | float | PMD calculée sur l'EPI total (valeur de référence à 100%) |
| 10 | `PMD_PAR_SECURITE` | PMD / EPI par Sécurité | float | PMD revenant à cette sécurité = PMD_100% × PART_PCT / 100 |
| 11 | `COMMISSION_COURTAGE_PCT` | Commission Courtage (%) | float | Taux prélevé par le courtier sur la PMD par sécurité |
| 12 | `COMMISSION_COURTAGE` | Commission Courtage | float | Montant du courtage = PMD_PAR_SECURITE × COMMISSION_COURTAGE_PCT / 100 |

### Description détaillée de chaque colonne

**TRAITE** — L'identifiant métier du traité. Chaque traité correspond à une ligne de business qu'Atlantic Re a acceptée et qu'elle rétrocède partiellement. Valeurs possibles : `Non Marine Domestic`, `Non Marine International Risk`, `Non Marine International CAT`, `Marine & Energie`, `Motor`, `Aviation`, `RC Générale`, `RC Décennale`, `Life`, `Marine & Non Marine VS`.

**NATURE** — Détermine le mécanisme de calcul de la prime et le mode d'intervention de la sécurité. Colonne critique qui conditionne toute la logique financière.

**UY** — Permet de suivre l'évolution des traités d'une année à l'autre : le même traité peut être renouvelé chaque année avec des conditions différentes (taux, parts, sécurités).

**EPI** — C'est la masse brute. Toutes les autres valeurs financières en découlent. C'est une **estimation** en début d'année — l'EPI réel ne sera connu qu'en fin d'exercice.

**DIRECT_COURTIER** — Le canal de placement. Si `Direct`, Atlantic Re négocie elle-même avec la sécurité et aucun courtage n'est dû. Si c'est un courtier nommé (Guy Carpenter, Aon, etc.), ce courtier a négocié et placé le traité auprès de la sécurité et perçoit une commission.

**SECURITE** — Le rétrocessionnaire. Chaque sécurité a un appétit et une capacité différents. Atlantic Re cherche à diversifier son panel pour ne pas dépendre d'une seule sécurité et pour maintenir un niveau de qualité (Rating > A).

**RATING_A_PLUS_PCT** — Indicateur de qualité du panel de sécurités. Plus ce % est élevé, plus la couverture est solide financièrement. **Important** : cette valeur est la même pour toutes les lignes d'un même traité/UY car elle caractérise le panel global, pas la sécurité individuelle.

**PART_PCT** — La quote-part individuelle de cette sécurité. La somme des PART_PCT de toutes les sécurités d'un traité/UY donne le **taux de placement total**. Si < 100%, le traité est partiellement non placé (risque résiduel chez Atlantic Re).

**PMD_EPI_100** — Valeur intermédiaire de référence. Même valeur pour toutes les sécurités d'un même traité/UY. Représente le coût théorique total si une seule entité portait 100% du traité.

**PMD_PAR_SECURITE** — Le flux financier réel entre Atlantic Re et cette sécurité. C'est ce montant qu'Atlantic Re transfère effectivement à la sécurité en début d'année.

**COMMISSION_COURTAGE_PCT** — Varie par sécurité au sein d'un même traité si chaque sécurité a négocié son propre taux de courtage. Égal à 0 si `DIRECT_COURTIER = Direct`.

**COMMISSION_COURTAGE** — Coût d'intermédiation supporté par Atlantic Re. S'additionne à la PMD pour calculer le coût total réel de la protection.

---

## 5. Relations entre les colonnes — Chaîne de calcul

```
┌─────────────────────────────────────────────────────────┐
│                    EPI (colonne 4)                      │
│          Assiette de prime estimée à 100%               │
└─────────────────────┬───────────────────────────────────┘
                      │
                      × Taux PMD (implicite, négocié)
                      │  [Taux PMD = PMD_EPI_100 / EPI]
                      ▼
┌─────────────────────────────────────────────────────────┐
│                PMD_EPI_100 (colonne 9)                  │
│    Prime de référence si 1 sécurité portait 100%        │
│    Identique pour toutes les lignes du même traité/UY   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      × PART_PCT / 100 (colonne 8)
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              PMD_PAR_SECURITE (colonne 10)              │
│    Flux financier réel : Atlantic Re → cette sécurité   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      × COMMISSION_COURTAGE_PCT / 100 (colonne 11)
                      │  [= 0 si DIRECT_COURTIER = Direct]
                      ▼
┌─────────────────────────────────────────────────────────┐
│            COMMISSION_COURTAGE (colonne 12)             │
│    Coût d'intermédiation → payé au courtier             │
└─────────────────────────────────────────────────────────┘
```

### Formules explicites

```python
# Taux PMD implicite (non stocké, calculable)
taux_pmd = PMD_EPI_100 / EPI

# PMD par sécurité
PMD_PAR_SECURITE = PMD_EPI_100 × PART_PCT / 100

# Commission courtage
COMMISSION_COURTAGE = PMD_PAR_SECURITE × COMMISSION_COURTAGE_PCT / 100

# Coût net total Atlantic Re sur ce traité (toutes sécurités)
cout_total_traite = SUM(PMD_PAR_SECURITE) + SUM(COMMISSION_COURTAGE)

# Taux de placement du traité
taux_placement = SUM(PART_PCT) pour un traité/UY donné

# Part placée auprès de sécurités Rating ≥ A
# → RATING_A_PLUS_PCT est déjà calculé, identique pour toutes lignes du traité/UY
```

### Agrégations importantes

```python
# Vue par traité/UY (regroupement)
par_traite_uy = GROUP BY [TRAITE, UY, NATURE, EPI, DIRECT_COURTIER, RATING_A_PLUS_PCT]
  → nb_securites    = COUNT(SECURITE)
  → taux_placement  = SUM(PART_PCT)
  → pmd_total       = SUM(PMD_PAR_SECURITE)
  → courtage_total  = SUM(COMMISSION_COURTAGE)
  → cout_net_total  = pmd_total + courtage_total
  → pct_cout_epi    = cout_net_total / EPI × 100

# Vue par sécurité (toutes années)
par_securite = GROUP BY [SECURITE]
  → nb_traites      = COUNT DISTINCT(TRAITE + UY)
  → pmd_total_recu  = SUM(PMD_PAR_SECURITE)
  → part_moy        = AVG(PART_PCT)
  → traites_list    = liste des traités couverts
```

---

## 6. Cycle de vie complet d'un traité

### Illustration avec la ligne de l'exemple

```
TRAITE       : Non Marine Domestic
NATURE       : Non Proportionnel
UY           : 2026
EPI          : 244 382 488 MAD
COURTIER     : courtier 1
SECURITE     : sécurité rétrocessionnaire 1
RATING_A_PCT : 15%
PART_PCT     : 15%
PMD_EPI_100  : 47 955 429 MAD
PMD_SEC      : 7 193 314 MAD
CRTG_PCT     : 10%
CRTG_AMT     : 719 331 MAD
```

### Étape 1 — Création du traité (avant le 1er janvier 2026)

Atlantic Re analyse son portefeuille Non Marine Domestic et constate qu'elle a trop de risques concentrés. Elle mandate courtier 1 pour trouver des sécurités. Le courtier identifie plusieurs rétrocessionnaires dont la sécurité 1 qui accepte de porter 15% du traité.

### Étape 2 — Estimation de l'EPI (début janvier 2026)

Atlantic Re estime à 244 382 488 MAD les primes qu'elle va collecter sur Non Marine Domestic en 2026. C'est l'EPI — basé sur l'historique des années précédentes.

### Étape 3 — Calcul et paiement de la PMD (janvier 2026)

```
Taux PMD négocié     ≈ 19,6%
PMD 100%             = 244 382 488 × 19,6% = 47 955 429 MAD
PMD sécurité 1 (15%) = 47 955 429 × 15%   =  7 193 314 MAD
Commission courtier  = 7 193 314 × 10%    =    719 331 MAD

→ Atlantic Re transfère 7 193 314 MAD à la sécurité 1
→ Atlantic Re paie    719 331 MAD au courtier
```

### Étape 4 — Pendant l'année 2026

| Situation | Ce qui se passe |
|-----------|----------------|
| Sinistres normaux (< seuil XL) | Sécurité 1 ne paie rien. Elle conserve sa PMD. |
| Sinistre catastrophique (> seuil XL) | Sécurité 1 paie 15% du dépassement à Atlantic Re |
| Ex. sinistre 80M, seuil 30M | Dépassement = 50M → Sécurité 1 paie 50M × 15% = 7,5M MAD |

### Étape 5 — Ajustement de fin d'année (décembre 2026)

| Scénario | Prime réelle | Résultat |
|----------|-------------|---------|
| Prime > EPI | 280 000 000 MAD | Atlantic Re paie complément : (280M×19,6%×15%) - 7 193 314 = +1 038 686 MAD |
| Prime = EPI | 244 382 488 MAD | Aucun ajustement |
| Prime < EPI | 200 000 000 MAD | PMD reste acquise à la sécurité. Pas de remboursement. |

### Flux financiers résumés

```
DÉBUT 2026
Atlantic Re ──── 7 193 314 MAD (PMD) ──────► Sécurité 1
Atlantic Re ──── 719 331 MAD (courtage) ────► Courtier 1

EN COURS D'ANNÉE — si gros sinistre
Sécurité 1 ──── Part% × Dépassement ──────► Atlantic Re

FIN 2026
Si prime réelle > EPI → Atlantic Re paie un complément à Sécurité 1
Si prime réelle < EPI → PMD reste acquise à Sécurité 1 (minimum garanti)
```

---

## 7. Cas possibles selon la Nature

### Proportionnel — cas possibles

| Cas | Description | Impact financier |
|-----|-------------|-----------------|
| Pas de sinistre | Sécurité garde sa prime | Atlantic Re paie la PMD, gain net = 0 sinistre à partager |
| Sinistres faibles | Sécurité paie Part% des sinistres | Récupération partielle |
| Sinistres élevés | Sécurité paie Part% des sinistres | Récupération proportionnelle, pas de seuil |
| Fin d'année : prime réelle ≠ EPI | Ajustement de la prime cédée | Complément ou rien selon la direction |

### Non Proportionnel — cas possibles

| Cas | Description | Impact financier |
|-----|-------------|-----------------|
| Pas de sinistre dépassant le seuil | Sécurité garde la PMD intégralement | Atlantic Re a payé pour rien (mais c'est le prix de la sérénité) |
| Sinistre partiel (< seuil) | Sécurité n'intervient pas | Atlantic Re absorbe seule |
| Sinistre dépassant le seuil | Sécurité paie Part% du dépassement | Atlantic Re récupère une partie des pertes |
| Sinistre catastrophique (>> seuil) | Sécurité plafonnée à son engagement max | Au-delà du plafond, Atlantic Re absorbe le reste |
| Prime réelle > EPI fin d'année | Atlantic Re paie une prime complémentaire | Coût supplémentaire |
| Prime réelle < EPI fin d'année | PMD reste acquise, pas de remboursement | La PMD est bien le "minimum" garanti |

---

## 8. Les acteurs de la table

### Les Traités (10 lignes de business)

| Traité | Nature typique | Commentaire |
|--------|---------------|-------------|
| Non Marine Domestic | Non Proportionnel | Risques locaux non-marins — le plus grand EPI |
| Non Marine International Risk | Non Proportionnel | Risques étrangers par police individuelle |
| Non Marine International CAT | Non Proportionnel | Protection catastrophe internationale |
| Marine & Energie | Non Proportionnel | Risques maritimes et pétroliers — EPI élevé |
| Motor | Proportionnel | Portefeuille automobile |
| Aviation | Non Proportionnel | Risques aériens — faible volume, fort impact |
| RC Générale | Proportionnel | Responsabilité civile générale |
| RC Décennale | Non Proportionnel | Responsabilité construction — longue durée |
| Life | Proportionnel | Portefeuille vie |
| Marine & Non Marine VS | Proportionnel | Valeurs en stocks et transports |

### Les Courtiers (canal de placement)

Deux catégories :
- **Direct** : Atlantic Re négocie directement avec la sécurité, pas de commission
- **Courtiers spécialisés** : Guy Carpenter, Gallagher, Aon, ARB, Chedid Re, Nasco, JB Boda, Lockton, FIRB, Afroasian, UIB, Howden, Swan Re, KMD, Apex, Turker Broker

**Note** : Ces mêmes courtiers apparaissent aussi dans la dataset contrats (col. `INT_BROKER`) comme apporteurs d'affaires à Atlantic Re. Certains jouent donc les **deux rôles** : ils apportent des contrats ET ils placent des rétrocessions.

### Les Sécurités (rétrocessionnaires)

Classées par niveau de notation :

**Rating ≥ A (sécurités solides) :**
Swiss Re, Hannover Re, SCOR, AXA XL, Everest Re, Ren Re, QBE, Tokio Marine Kiln, Convex, Fidelis, CCR Paris, Helvethia, MS Re, Hamilton Re, IGI, Odyssey Re, Argenta, Canopius

**Rating < A (sécurités régionales/émergentes) :**
Africa Re, Continental Re, Waica Re, Tunis Re, Zep Re, Arab Re, Kuwait Re, Saudi Re, Cica Re, Ghana Re, Sen Re, Global Re, Adnic, Riyadh Re, China Re, Rockstone

---

## 9. Indicateurs clés à surveiller

### KPIs Financiers

| KPI | Formule | Interprétation |
|-----|---------|---------------|
| **EPI Total** | SUM(EPI) par traité/UY | Volume de prime protégé |
| **PMD Totale** | SUM(PMD_PAR_SECURITE) | Coût total de protection payé par Atlantic Re |
| **Courtage Total** | SUM(COMMISSION_COURTAGE) | Coût d'intermédiation |
| **Coût Net Total** | PMD + Courtage | Décaissement réel d'Atlantic Re |
| **Ratio PMD/EPI** | PMD_EPI_100 / EPI | Taux de rétrocession implicite |
| **Ratio Coût/EPI** | Coût Net / EPI × 100 | % de l'EPI consacré à la protection |

### KPIs Qualitatifs

| KPI | Formule | Interprétation |
|-----|---------|---------------|
| **Taux de placement** | SUM(PART_PCT) par traité/UY | Si < 100% : risque résiduel non couvert |
| **Rating > A %** | RATING_A_PLUS_PCT | Solidité financière du panel |
| **Nb sécurités** | COUNT par traité/UY | Diversification du panel |
| **Concentration max** | MAX(PART_PCT) par traité/UY | Dépendance à une sécurité |
| **% Direct vs Courtier** | Lignes Direct / Total | Degré d'autonomie dans le placement |
