# Guide Fonctionnel Détaillé — Plateforme Atlantic Re (Portail360)
## Description exhaustive de chaque fonctionnalité et son apport métier

---

## 📌 Comment lire ce document

Pour chaque fonctionnalité, vous trouverez :
- **🖥️ Écran** : Ce que l'utilisateur voit
- **⚙️ Mécanique** : Comment ça fonctionne techniquement (vulgarisé)
- **💼 Apport métier** : L'impact concret sur le travail quotidien
- **🎯 Exemple d'usage** : Un scénario réel d'utilisation

---

# 🏠 ACCUEIL — Sélecteur d'Axes Stratégiques

**🖥️ Écran** : Page d'atterrissage avec deux cartes de sélection : *Axe 1 (Portefeuille Interne)* et *Axe 2 (Modélisation Afrique 2030)*. Bandeau de statistiques clés : 60+ marchés, 400+ cédantes, 54 pays Afrique.

**⚙️ Mécanique** : Navigation conditionnelle — l'utilisateur choisit son module. L'authentification est obligatoire avant d'accéder à cette page. Le statut de chaque axe (Actif / En intégration) est affiché en temps réel.

**💼 Apport métier** : Séparation claire entre le **pilotage opérationnel** (gérer le portefeuille existant) et la **prospection stratégique** (identifier les marchés d'expansion). Chaque profil utilisateur accède directement à son périmètre de travail.

**🎯 Exemple** : Le Directeur Technique ouvre l'Axe 1 pour vérifier la sinistralité du trimestre. Le Responsable Business Développement ouvre l'Axe 2 pour préparer le comité Reach2030.

---

# 📊 AXE 1 — PORTEFEUILLE INTERNE

---

## F1. Tableau de Bord Central (Dashboard)

### F1.1 — KPI Cards (Indicateurs Clés)

**🖥️ Écran** : 4 à 6 cartes en haut de page affichant les métriques agrégées : Primes Émises, Primes Acquises, Sinistres, ULR (Loss Ratio), Résultat Technique, Nombre de contrats.

**⚙️ Mécanique** : Les KPIs se recalculent instantanément à chaque changement de filtre (année, pays, branche, cédante). Les données proviennent de l'API `/kpis` avec les paramètres de filtrage actifs.

**💼 Apport métier** : En un coup d'œil, le souscripteur connaît la santé de son portefeuille. Plus besoin d'ouvrir 3 fichiers Excel pour croiser les chiffres — tout est consolidé et actualisé.

**🎯 Exemple** : « Quel est mon ULR global sur l'exercice 2024 pour la branche Incendie au Maroc ? » → Réponse en 2 clics de filtre.

---

### F1.2 — Carte Mondiale Interactive (WorldMap)

**🖥️ Écran** : Carte du monde colorée par intensité (primes émises ou exposition). Survol d'un pays → tooltip avec chiffres détaillés. Clic sur un pays → navigation vers l'analyse détaillée.

**⚙️ Mécanique** : Choroplèthe basée sur les données filtrées. Échelle de couleur dynamique (du bleu clair au bleu foncé selon le volume). Mode « exposition » disponible pour visualiser la concentration des risques.

**💼 Apport métier** : Vision géographique immédiate de la répartition du portefeuille. Le management identifie visuellement les zones de concentration excessive et les marchés sous-exploités.

**🎯 Exemple** : Le Directeur constate que 70% des primes sont concentrées sur 3 pays → signal d'alerte sur le risque de concentration.

---

### F1.3 — Évolution Temporelle (EvolutionChart)

**🖥️ Écran** : Graphique combiné barres + lignes montrant l'évolution des primes émises, primes acquises, et sinistres sur plusieurs exercices. Double axe Y pour les montants et les ratios.

**⚙️ Mécanique** : Données agrégées par année d'exercice (UY). Les filtres globaux s'appliquent : on peut isoler l'évolution d'un seul pays ou d'une seule branche.

**💼 Apport métier** : Détection des **tendances** — croissance ou décroissance du portefeuille, dégradation progressive de la sinistralité. Le souscripteur anticipe les problèmes avant qu'ils ne deviennent critiques.

**🎯 Exemple** : « La sinistralité Automobile en Côte d'Ivoire est passée de 45% à 120% en 3 ans » → action corrective sur les renouvellements.

---

### F1.4 — Répartition par Branche (DistributionCharts)

**🖥️ Écran** : Camemberts et barres montrant la ventilation du portefeuille par branche, par type (TTY/FAC), et par nature (Proportionnel/Non-Proportionnel).

**💼 Apport métier** : Mesure de la **diversification** du portefeuille. Un portefeuille trop concentré sur une seule branche est un risque stratégique. Ce module permet de piloter l'équilibre.

---

### F1.5 — Tableau Croisé Dynamique (PivotTable)

**🖥️ Écran** : Tableau pivot croisant Pays × Branche avec les métriques financières. Tri par colonne, totaux automatiques, code couleur sur les ULR.

**⚙️ Mécanique** : Agrégation côté serveur des données filtrées. Chaque cellule est cliquable pour un drill-down.

**💼 Apport métier** : L'outil de **micro-analyse** par excellence. Le souscripteur identifie immédiatement quel segment (pays + branche) est rentable et lequel ne l'est pas.

**🎯 Exemple** : « En Tunisie, la branche Transport est-elle rentable ? » → lecture directe dans le tableau croisé.

---

### F1.6 — Détail Contrats (DataTable)

**🖥️ Écran** : Table de données granulaire avec tous les contrats individuels. Colonnes : N° Police, Cédante, Courtier, Branche, Pays, Prime, ULR, Résultat. Tri multi-colonnes, export Excel.

**💼 Apport métier** : Accès au **niveau le plus fin** de la donnée. Indispensable pour les vérifications comptables, les audits, et la préparation des renouvellements contrat par contrat.

---

### F1.7 — Finances & Rentabilité

**🖥️ Écran** : Deux onglets dédiés : *Finances* (flux de trésorerie, primes vs sinistres) et *Rentabilité* (marges techniques, résultat par segment).

**💼 Apport métier** : Vue financière pure pour le contrôle de gestion. Permet de répondre aux exigences de reporting réglementaire (Solvabilité II) et aux demandes du comité financier.

---

### F1.8 — Clients Inactifs (InactiveClients)

**🖥️ Écran** : Liste des cédantes n'ayant généré aucune affaire sur la période sélectionnée. Filtrable par durée d'inactivité. Réservé aux rôles Admin et Souscripteur.

**⚙️ Mécanique** : Comparaison entre la liste complète des cédantes historiques et celles présentes dans les exercices filtrés. Détection automatique des « disparitions ».

**💼 Apport métier** : **Rétention client proactive**. Au lieu de découvrir la perte d'un client lors du bilan annuel, le souscripteur est alerté en temps réel et peut agir (relance commerciale, renégociation).

**🎯 Exemple** : « La cédante X ne nous a rien cédé depuis 2023 alors qu'elle représentait 2M MAD/an » → déclenchement d'une action commerciale.

---

## F2. Panneau de Filtrage Global (FilterPanel)

**🖥️ Écran** : Sidebar latérale persistante avec filtres multi-sélection : Année (UY), Pays, Branche, Cédante, Courtier, Type (TTY/FAC), Marchés Africains.

**⚙️ Mécanique** : Context React global (`DataContext`) — tout changement de filtre propage automatiquement aux KPIs, graphiques, et tables. Chip « Marchés Africains » pour filtrer en un clic tous les pays du continent.

**💼 Apport métier** : **Cohérence analytique totale**. Tous les modules voient les mêmes données filtrées — plus de risque de comparer des chiffres issus de périmètres différents (un problème fréquent avec les fichiers Excel séparés).

---

## F3. Analyse de Marché (Analysis)

**🖥️ Écran** : Page d'analyse approfondie par pays. KPIs spécifiques au marché, évolution historique, répartition par branche et par cédante, classement des cédantes par volume.

**💼 Apport métier** : Le **dossier marché complet** en une seule page. Remplace les fiches pays manuelles préparées pour les comités de souscription.

---

## F4. Recommandations & Scoring (Recommendations)

**🖥️ Écran** : Classement de tous les marchés (Pays × Branche) avec un score de 0 à 100. Podium Top 3 (Gold/Silver/Bronze). Filtrage par badge (Attractif/Neutre/À éviter). Graphique barres horizontales + tableau détaillé.

**⚙️ Mécanique** : Scoring multicritère basé sur les poids configurables dans l'administration. Le hook `useScoring()` appelle l'API backend qui applique la normalisation et le calcul pondéré. Le recalcul est instantané.

**💼 Apport métier** : **Objectivation de la décision stratégique**. Le comité de direction ne débat plus sur des intuitions — il dispose d'un classement quantifié et auditable. Les poids sont ajustables (« What-If ») pour simuler différents scénarios.

**🎯 Exemple** : « Si on double le poids du Loss Ratio dans le scoring, quels marchés basculent de Attractif à À éviter ? » → simulation instantanée.

---

## F5. Analyse Cédante (CedanteAnalysis)

**🖥️ Écran** : Fiche complète par cédante : KPIs dédiés, évolution des primes et sinistres, répartition par branche, indice de diversification, historique de rentabilité.

**💼 Apport métier** : **Outil de négociation**. Lors des renouvellements, le souscripteur dispose de l'historique complet de la relation avec la cédante — primes cumulées, sinistralité par année, branches rentables vs déficitaires.

**🎯 Exemple** : « SAHAM nous demande une augmentation de capacité — mais leur ULR sur 5 ans est de 130% en Transport. Argument factuel pour refuser ou conditionner. »

---

## F6. Analyse Courtier (BrokerAnalysis)

**🖥️ Écran** : Classement des courtiers par volume d'affaires. Détection automatique du rôle (Apporteur/Placeur/Double Rôle). Scatter chart Primes Apportées × PMD Placée. Export Excel.

**⚙️ Mécanique** : Croisement des données d'apport (contrats directs) et de placement (rétrocession). Un courtier qui apparaît dans les deux flux est classé « Double Rôle ».

**💼 Apport métier** : **Gestion de la relation courtier**. Identification des courtiers à forte valeur ajoutée (ceux qui apportent ET placent) vs ceux qui ne font que du volume sans rentabilité. Outil essentiel pour la politique de commissionnement.

---

## F7. Target Share — Part Cible (TargetShare)

**🖥️ Écran** : Tableau des traités TTY avec : part actuelle, part cible, écart, recommandation d'ajustement. Système de bonus/malus basé sur l'historique de rentabilité.

**💼 Apport métier** : **Pilotage de l'allocation de capacité**. Le module calcule automatiquement si Atlantic Re est surexposé ou sous-exposé sur chaque traité et recommande l'ajustement optimal pour le prochain renouvellement.

---

## F8. Saturation FAC (FacSaturation)

**🖥️ Écran** : Tableau de bord de saturation avec jauges visuelles par cédante × branche. Code couleur : 🟢 < 70%, 🟡 70-90%, 🔴 > 90%. Modal de drill-down au clic.

**💼 Apport métier** : **Prévention des cumuls de risques**. Le souscripteur voit en temps réel s'il approche de la limite d'engagement sur un segment donné AVANT d'accepter une nouvelle affaire.

**🎯 Exemple** : « Puis-je accepter cette facultative Incendie de 5M MAD pour cette cédante ? » → vérification instantanée du taux de saturation.

---

## F9. Rétrocession — Affaires Traités (AffairesTraites)

**🖥️ Écran** : Deux vues — *Vue Globale* (KPIs, répartition Prop/Non-Prop, PMD par traité, taux de placement) et *Vue Courtier* (scatter croisé, table des rôles). Export multi-onglets.

**💼 Apport métier** : **Maîtrise du coût de protection**. Le module répond à : Combien coûte notre programme de rétro ? Quel pourcentage est effectivement placé ? Quelle est la qualité (rating) de nos sécurités ?

---

## F10. Exposition & Risques (ExpositionRisques)

**🖥️ Écran** : KPIs d'exposition globale, carte mondiale de concentration, Top 10 pays, Top 10 branches, table des 20 plus gros risques individuels avec export Excel.

**💼 Apport métier** : **Conformité réglementaire et gestion du capital**. Ce module fournit les données nécessaires pour le reporting de solvabilité et les comités de risques. Identification immédiate des concentrations dangereuses.

---

## F11. Comparaison (Comparison)

**🖥️ Écran** : Sélection de deux entités (pays ou cédantes) → comparaison côte-à-côte avec radar 6D, KPIs avec delta badges (▲/▼), et graphiques superposés.

**💼 Apport métier** : **Arbitrage factuel**. Quand le management hésite entre deux marchés ou deux cédantes, la comparaison fournit une réponse visuelle et chiffrée en 30 secondes.

---

# 🌍 AXE 2 — MODÉLISATION AFRIQUE 2030 (SCAR)

---

## F12. Vue d'Ensemble Stratégique (ModelisationHome)

**🖥️ Écran** : Carte interactive de l'Afrique (54 pays) avec colorisation par indicateur sélectionnable (primes, pénétration, PIB, stabilité politique). KPIs macro consolidés. Navigation vers les fiches pays.

**💼 Apport métier** : **Radar d'expansion**. Visualisation instantanée des marchés les plus attractifs pour le programme Reach2030. L'utilisateur identifie en 10 secondes les zones vertes (opportunités) et rouges (risques élevés).

---

## F13. Analyse par Pays (AnalysePays) — 7 onglets

**🖥️ Écran** : Fiche monographique complète avec navigation par onglets et barre de progression.

| # | Onglet | Contenu | Apport métier |
|---|--------|---------|---------------|
| 1 | **KPIs & Évolution** | Scorecard 8 KPIs + graphique combo primes/macro 2015-2024 | Synthèse décisionnelle rapide |
| 2 | **Radar 6D** | Profil normalisé vs médiane des 34 pays | Identification forces/faiblesses vs continent |
| 3 | **Non-Vie** | Primes, pénétration, densité, croissance + rang continental | Potentiel du marché Non-Vie |
| 4 | **Vie** | Mêmes métriques pour le segment Vie | Détection des marchés Vie sous-exploités |
| 5 | **Macroéconomie** | PIB, croissance, inflation, compte courant | Contexte économique pour le risque-pays |
| 6 | **Gouvernance** | 6 indicateurs WGI + badges stabilité/ouverture | Risque politique et réglementaire |
| 7 | **Positionnement** | Rang continental sur chaque indicateur + médiane régionale | Position relative du pays |

**⚙️ Mécanique** : Données croisées de 4 sources (Axco, World Bank, FMI, WGI). Insights auto-générés par des hooks dédiés (`useAnalyseInsights`, `useNonVieInsights`, etc.). Sélecteur d'année ou moyenne 2015-2024.

**💼 Apport métier** : Le **rapport pays complet** autrefois produit en 2-3 jours par un analyste est désormais disponible **instantanément** pour les 34 pays du panel. Chaque onglet génère automatiquement des insights textuels contextualisés.

**🎯 Exemple** : « Préparer le briefing sur le Ghana pour le comité de demain matin » → 5 minutes au lieu de 2 jours.

---

## F14. Cartographies Thématiques (4 modules)

### F14.1 — Macroéconomie (CartographieMacro)
9 onglets : KPIs, Top 10 PIB, Carte choroplèthe, Scatter multi-axes, Évolution PIB régionale, Distribution inflation (heatmap + box plot), Intégration régionale, Détail pays, Classement.

**💼 Apport clé** : Le scatter multi-axes est **configurable** — l'utilisateur choisit librement les deux métriques à croiser (ex: Inflation × Croissance PIB). Les insights se recalculent automatiquement selon les axes choisis.

### F14.2 — Non-Vie (CartographieNonVie)
Analyse du marché d'assurance Non-Vie par pays : primes émises, taux de pénétration, densité, sinistralité. Carte, scatter, classement.

### F14.3 — Vie (CartographieVie)
Même profondeur pour le segment Vie. Identification des marchés à fort potentiel de croissance (pénétration < 1% avec PIB en hausse).

### F14.4 — Gouvernance (CartographieGouvernance)
6 indicateurs WGI : Stabilité politique, Efficacité gouvernementale, Qualité réglementaire, État de droit, Contrôle de la corruption, Ouverture financière (KAOPEN).

**💼 Apport métier commun** : Ces 4 modules constituent la **base de données d'intelligence marché** la plus complète disponible pour un réassureur africain. Chaque cartographie produit des insights automatiques et permet l'export.

---

## F15. Comparaison de Pays (ComparaisonPays)

**🖥️ Écran** : Sélection de deux pays via dropdown → comparaison sur les 7 mêmes onglets que l'analyse pays. Radar 3 séries (Pays A + Pays B + Médiane). KPI rows avec checkmark du gagnant. Tableaux historiques comparatifs.

**💼 Apport métier** : **Outil d'arbitrage pour Reach2030**. Quand le comité stratégique hésite entre deux marchés pour l'expansion, ce module fournit la réponse factuelle sur 7 dimensions.

---

## F16. Analyse Synergie (AnalyseSynergie)

**🖥️ Écran** : Croisement des données internes (portefeuille Atlantic Re) avec les données externes (marché total). Onglets Synthèse, Classement, Deep-dive cédante.

**⚙️ Mécanique** : Calcul de l'exposition relative : Part Atlantic Re / Taille du marché total. Identification des marchés où Atlantic Re est surexposé (part > médiane) ou sous-exposé (potentiel de croissance).

**💼 Apport métier** : **Le pont entre les deux axes**. Ce module répond à LA question stratégique : « Compte tenu de notre performance historique ET de la dynamique du marché, où devons-nous investir notre prochaine unité de capacité ? »

---

# ⚙️ FONCTIONNALITÉS TRANSVERSALES

---

## T1. Authentification & Gestion des Rôles

| Rôle | Accès Dashboard | Module Inactifs | Administration | Scoring |
|------|:-:|:-:|:-:|:-:|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Souscripteur** | ✅ | ✅ | ❌ | ✅ |
| **Lecteur** | ✅ | ❌ | ❌ | 👁️ (lecture) |

## T2. Export de Données
- **Excel (.xlsx)** : Disponible sur toutes les tables — export multi-onglets pour les modules complexes
- **Génération datée** : Chaque fichier exporté porte la date du jour dans son nom

## T3. Filtrage Intelligent
- **Filtres globaux** : Persistent entre les pages via `DataContext`
- **Filtres locaux** : Chaque module spécialisé a ses propres filtres sans polluer le global
- **Navigation contextuelle** : `sessionStorage` pour passer des filtres entre pages (ex: Dashboard → Détail contrats)

## T4. Insights Automatiques
- Les modules Axe 2 génèrent des **analyses textuelles automatiques** (forces, alertes, opportunités)
- Recalcul dynamique selon les filtres actifs et les axes sélectionnés
- Chaque panel d'insights est contextuel à l'onglet affiché

---

> **💡 Note finale** : Cette plateforme est conçue comme un **écosystème vivant** — chaque module alimente les autres. Le Dashboard détecte un problème → l'Analyse l'explique → les Recommandations proposent une action → la Comparaison valide le choix. C'est cette chaîne de valeur analytique intégrée qui fait la différence avec des outils isolés.
