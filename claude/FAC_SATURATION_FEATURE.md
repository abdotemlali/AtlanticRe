# Feature : Saturation FAC — Documentation Détaillée

> Projet AtlanticRe · Rédigé le 07/04/2026

---

## 1. Contexte métier

### Qu'est-ce que la saturation FAC ?

Dans l'activité de réassurance, une **opération Facultative (FAC)** est un contrat traité au cas par cas (par opposition aux traités automatiques TTY/TTE qui couvrent en bloc un portefeuille de risques).

La **saturation FAC** désigne la situation où une cédante accumule, sur une branche d'activité donnée, un volume d'opérations facultatives tellement élevé (en nombre d'affaires ET en prime totale) qu'il dépasse les seuils de tolérance définis par AtlanticRe.

**Pourquoi c'est un signal d'alerte ?**
- Un trop grand apport de FAC peut indiquer un risque de sélection adverse (la cédante ne cède que ses mauvais risques en FAC).
- Cela peut créer une concentration de risque non souhaitée sur une branche.
- Cela peut signaler un déséquilibre dans la relation contractuelle avec la cédante.

### Objectif de la feature

Permettre au souscripteur de **surveiller par cédante et par branche** si le flux de FAC dépasse des seuils (prime totale + nombre d'affaires). Ces seuils sont **configurables dynamiquement** dans l'interface pour s'adapter à chaque contexte d'analyse.

---

## 2. Architecture technique

### Vue d'ensemble

```
Utilisateur
    │
    ├── Page dédiée : /fac-saturation  (FacSaturation.tsx)
    │   Sélection cédante + réglage seuils → appel API → tableau de résultats
    │
    └── Widget embarqué : /analyse-cedante  (CedanteAnalysis.tsx)
        Badge d'alerte globale dans l'en-tête de la fiche cédante
        (via champ fac_saturation_alerts dans /kpis/cedante/profile)
```

### Fichiers impliqués

| Couche | Fichier | Rôle |
|---|---|---|
| **Frontend** | `frontend/src/pages/FacSaturation.tsx` | Page principale dédiée |
| **Frontend** | `frontend/src/pages/CedanteAnalysis.tsx` | Widget d'alerte embarqué (badge + intégration dans l'en-tête) |
| **Frontend** | `frontend/src/components/Layout.tsx` | Lien dans la navigation principale |
| **Frontend** | `frontend/src/App.tsx` | Route `/fac-saturation` |
| **Frontend** | `frontend/src/constants/api.ts` | Constante `CEDANTE.FAC_SATURATION` |
| **Backend** | `backend/routers/kpis.py` | Endpoint `GET /kpis/cedante/fac-saturation` |
| **Backend** | `backend/services/data_service.py` | `apply_filters` + logique de filtrage FAC |

---

## 3. Endpoint backend

### `GET /kpis/cedante/fac-saturation`

Défini dans `backend/routers/kpis.py` (ligne 924).

#### Paramètres

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `cedante` | `str` | *requis* | Nom exact de la cédante (`INT_CEDANTE`) |
| `seuil_prime` | `float` | `1 000 000` | Seuil de prime totale FAC en DH. Une branche est saturée si elle dépasse **ce seuil ET** le seuil d'affaires |
| `seuil_affaires` | `int` | `5` | Seuil du nombre d'affaires FAC. Même conjonction que ci-dessus |
| `filters.*` | `FilterParams` | Tous filtres globaux | Année de souscription, périmètre, statut, etc. |

#### Logique de calcul

```python
# 1. Application des filtres globaux (année, périmètre, statut...)
df = apply_filters(df, filters)

# 2. Isoler les contrats de la cédante sélectionnée
df_cedante = df[df["INT_CEDANTE"] == cedante]

# 3. Filtrer UNIQUEMENT les opérations FAC
#    (basé sur la colonne TYPE_OF_CONTRACT contenant "FAC")
df_cedante = df_cedante[
    df_cedante["TYPE_OF_CONTRACT"].str.upper().str.contains("FAC", na=False)
]

# 4. Pour chaque branche active de la cédante
for branche in df_cedante["INT_BRANCHE"].unique():
    df_br = df_cedante[df_cedante["INT_BRANCHE"] == branche]
    total_prime = df_br["WRITTEN_PREMIUM"].sum()
    nb_affaires = len(df_br)

    # 5. Règle de saturation : conjonction des deux seuils
    is_saturated = (total_prime > seuil_prime) AND (nb_affaires > seuil_affaires)
```

> **Règle métier** : l'alerte se déclenche uniquement quand **les deux conditions sont remplies simultanément** — prime totale FAC > seuil_prime **ET** nombre d'affaires > seuil_affaires. Dépasser un seul des deux seuils ne suffit pas.

#### Réponse (liste triée par prime décroissante)

```json
[
  {
    "branche": "INCENDIE",
    "total_prime_fac": 2450000.00,
    "nb_affaires_fac": 12,
    "is_saturated": true,
    "seuil_prime": 1000000,
    "seuil_affaires": 5
  },
  {
    "branche": "TRANSPORT",
    "total_prime_fac": 750000.00,
    "nb_affaires_fac": 8,
    "is_saturated": false,
    "seuil_prime": 1000000,
    "seuil_affaires": 5
  }
]
```

**Colonnes** :
- `branche` : nom de la branche (`INT_BRANCHE`)
- `total_prime_fac` : somme de `WRITTEN_PREMIUM` pour les contrats FAC de cette branche/cédante
- `nb_affaires_fac` : nombre de contrats FAC de cette branche/cédante
- `is_saturated` : booléen — `true` si les deux seuils sont dépassés simultanément
- `seuil_prime` / `seuil_affaires` : les seuils utilisés (renvoyés pour référence côté frontend)

---

## 4. Page dédiée — `/fac-saturation`

**Fichier** : `frontend/src/pages/FacSaturation.tsx`  
**Route** : `/fac-saturation`  
**Accès** : Tous les utilisateurs authentifiés (lien dans la barre de navigation principale via `Layout.tsx`)

### Fonctionnement de la page

#### 4.1 Sélection de la cédante

Un `Select` (`react-select`) alimenté par la liste complète des cédantes depuis `filterOptions.cedantes` (chargées par `DataContext`). Le select est **obligatoire** : tant qu'aucune cédante n'est sélectionnée, un état vide est affiché (icône + message "Sélectionnez une cédante").

#### 4.2 Réglage des seuils

Une fois une cédante sélectionnée, deux champs numériques apparaissent :
- **Seuil Prime (DH)** : défaut 1 000 000 DH, incrément 100 000
- **Seuil Nb Affaires** : défaut 5 affaires, valeur minimum 1

La règle active est affichée en temps réel : `Prime > X DH ET Affaires > Y`

Chaque modification des seuils **redéclenche immédiatement l'appel API** (le `useEffect` dépend de `[selectedCedante, filters, seuilPrime, seuilAffaires]`).

#### 4.3 Affichage des résultats

Le résultat est affiché sous forme de **tableau**, une ligne par branche FAC de la cédante :

| Branche | Prime Totale FAC | Nb Affaires FAC | Statut |
|---|---|---|---|
| INCENDIE | 2 450 000 DH | 12 | 🔴 SATURÉ |
| TRANSPORT | 750 000 DH | 8 | 🟢 OK |

**Règles d'affichage** :
- La colonne "Prime Totale FAC" s'affiche en rouge (`hsl(358,66%,54%)`) si la valeur dépasse `seuilPrime`
- La colonne "Nb Affaires FAC" s'affiche en rouge si la valeur dépasse `seuilAffaires`
- Le badge de statut est rouge fondé (`SATURÉ`) ou vert fondé (`OK`)
- Les lignes saturées ont un fond légèrement rosé

#### 4.4 Indicateur global

Si **au moins une branche** est saturée, un badge "Alertes actives" s'affiche dans l'en-tête de la section (en rouge).

#### 4.5 Interaction avec les filtres globaux

La page utilise `getScopedParams(location.pathname, filters)` pour transmettre les filtres globaux (notamment l'**année de souscription**) à l'endpoint. Cela permet de limiter l'analyse à une période temporelle spécifique.

```typescript
const params = {
  ...getScopedParams(location.pathname, filters),
  cedante: selectedCedante,
  seuil_prime: seuilPrime,
  seuil_affaires: seuilAffaires
}
api.get(API_ROUTES.CEDANTE.FAC_SATURATION, { params })
```

---

## 5. Widget intégré dans l'Analyse Cédante

**Fichier** : `frontend/src/pages/CedanteAnalysis.tsx`  
**Route** : `/analyse-cedante`

### 5.1 Badge dans l'en-tête de la fiche cédante (B3)

Quand l'utilisateur consulte la fiche d'une cédante, si cette cédante a des branches saturées en FAC, un **badge d'alerte animé (pulse)** s'affiche directement dans l'en-tête :

```tsx
{profile?.fac_saturation_alerts && profile.fac_saturation_alerts.length > 0 && (
  <div className="... animate-pulse">
    <AlertTriangle size={12} />
    <span>Saturation FAC ({profile.fac_saturation_alerts.length} Branche{...})</span>
  </div>
)}
```

Ce badge affiche **le nombre de branches saturées** (avec les seuils par défaut : 1M DH + 5 affaires).

### 5.2 Source de données du badge

Le champ `fac_saturation_alerts` provient de l'endpoint `GET /kpis/cedante/profile` (qui retourne le profil complet de la cédante). Ce champ est calculé côté backend au moment du profil, avec les **seuils par défaut** (1M DH et 5 affaires). Il retourne la liste des branches saturées.

Le type TypeScript est :
```typescript
interface CedanteProfile {
  // ... autres champs KPI
  fac_saturation_alerts?: string[]  // liste des branches saturées (B3)
}
```

### 5.3 Navigation vers la page dédiée

Le badge sert d'indicateur rapide. L'utilisateur peut cliquer sur le lien "Saturation FAC" dans la navigation principale pour accéder à la page dédiée `/fac-saturation` avec des seuils personnalisables.

---

## 6. Navigation et accès

La feature est accessible via deux points d'entrée :

### 6.1 Barre de navigation principale

Dans `Layout.tsx` (ligne 20) :
```typescript
{ to: '/fac-saturation', label: 'Saturation FAC', icon: ShieldAlert }
```
L'icône `ShieldAlert` (lucide-react) est utilisée pour signifier la nature d'alerte de sécurité de la feature.

### 6.2 Badge dans la fiche cédante (`/analyse-cedante`)

Un badge rouge pulsant s'affiche automatiquement dans l'en-tête si des alertes de saturation sont détectées pour la cédante affichée.

---

## 7. Identifiants techniques

| Element | Valeur |
|---|---|
| Route frontend | `/fac-saturation` |
| Composant React | `FacSaturation` (export default) |
| Constante API | `API_ROUTES.CEDANTE.FAC_SATURATION` |
| URL API | `/kpis/cedante/fac-saturation` |
| Fonction backend | `cedante_fac_saturation()` |
| Colonne source (type contrat) | `TYPE_OF_CONTRACT` (contient "FAC") |
| Colonne source (prime) | `WRITTEN_PREMIUM` |
| Colonne source (branche) | `INT_BRANCHE` |
| Colonne source (cédante) | `INT_CEDANTE` |

---

## 8. Flux de données complet

```
Utilisateur sélectionne "CEDANTE X" + ajuste seuils (1M DH, 10 affaires)
    │
    ↓  GET /kpis/cedante/fac-saturation
       ?cedante=CEDANTE X
       &seuil_prime=1000000
       &seuil_affaires=10
       &uw_year_min=2024
       &uw_year_max=2024
    │
    ↓  Backend — cedante_fac_saturation()
       1. apply_filters(df, filters)           → filtre année, périmètre, statut
       2. df[df["INT_CEDANTE"] == "CEDANTE X"] → isoler la cédante
       3. filtre TYPE_OF_CONTRACT contenant "FAC" → isoler les FAC
       4. groupby INT_BRANCHE → pour chaque branche :
          - total_prime_fac = WRITTEN_PREMIUM.sum()
          - nb_affaires_fac = len(df_branche)
          - is_saturated = (total_prime > 1M) AND (nb > 10)
       5. Tri par total_prime_fac décroissant
    │
    ↓  Réponse JSON : [{branche, total_prime_fac, nb_affaires_fac, is_saturated, ...}]
    │
    ↓  Frontend — DistributionCharts / FacSaturation.tsx
       - Tableau ligne par ligne
       - Cellules rouges si dépassement individuel de chaque seuil
       - Badge SATURÉ (rouge) ou OK (vert)
       - Header : "Alertes actives" si hasAlerts === true
```

---

## 9. États de l'interface

| État | Condition | Affichage |
|---|---|---|
| **Vide initial** | Aucune cédante sélectionnée | Icône `AlertTriangle` + message d'aide |
| **Chargement** | Appel API en cours | Overlay spinner sur le tableau |
| **Sans données** | Aucune FAC pour la cédante avec ces filtres | Message "Aucune opération FAC trouvée..." |
| **Résultats sans alerte** | Toutes branches OK | Tableau avec badges verts uniquement |
| **Résultats avec alertes** | Au moins une branche saturée | Tableau + badge "Alertes actives" en rouge dans l'en-tête |

---

## 10. Points d'attention & limites actuelles

### Seuils par défaut
Les seuils par défaut (1 000 000 DH et 5 affaires) sont hardcodés côté backend (`Query(1_000_000)`, `Query(5)`) et côté frontend (`useState(1000000)`, `useState(5)`). Ils ne sont pas persistés — à chaque rechargement de page, ils reviennent aux valeurs par défaut.

### Colonne TYPE_OF_CONTRACT vs INT_SPC_TYPE
La feature utilise `TYPE_OF_CONTRACT.str.contains("FAC")` pour identifier les contrats FAC. Il est important de distinguer :
- `TYPE_OF_CONTRACT` : type contractuel (PROPORT., XOL, QUOTA SHARE, **FAC**, ...) — utilisé ici
- `INT_SPC_TYPE` (dérivée de `INT_SPC`) : classification SPC (FAC, TTY, TTE) — utilisée par les filtres globaux

Ces deux colonnes peuvent différer. Si un contrat est FAC dans `INT_SPC_TYPE` mais pas dans `TYPE_OF_CONTRACT`, il ne sera pas comptabilisé dans la saturation FAC.

### Pas de drill-down
La page actuelle ne propose pas de détail contrat par contrat. Elle affiche uniquement l'agrégat par branche. Pour voir les contrats détaillés d'une branche FAC, l'utilisateur peut aller dans la page Tableau de bord avec les filtres cédante + type_contrat_spc=FAC actifs.

### Seuils non persistés
Les seuils sont locaux à la session React — si l'utilisateur change de page et revient, les seuils sont réinitialisés à 1M DH / 5 affaires. Une future amélioration pourrait persister ces seuils en `localStorage` ou en base via les préférences utilisateur.

### Badge cédante avec seuils fixes
Le badge `fac_saturation_alerts` dans la fiche cédante (`/analyse-cedante`) utilise les **seuils par défaut** du backend, pas les seuils personnalisés de la page `/fac-saturation`. Si l'utilisateur modifie les seuils dans la page dédiée, le badge ne se met pas à jour.
