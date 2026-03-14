# Atlantic Re — Decision Intelligence Platform

Plateforme web full-stack de visualisation, scoring et sélection de marchés en réassurance (Africa & Middle East), développée pour **CDG Group – Atlantic Re**.

**Stack :** FastAPI (Python) · React 18 (TypeScript) · Tailwind CSS · Recharts · MySQL · SQLAlchemy

---

## 🚀 Démarrage rapide

### Prérequis
- **Python 3.10+** · **Node.js 18+** · **MySQL 8.0+**

### 1. Backend

```bash
cd backend

# Copier la configuration
cp .env.example .env
# → Éditer .env avec vos valeurs (DB, JWT, Gmail)

# Installer les dépendances
pip install -r requirements.txt

# Lancer (crée la BDD + l'admin automatiquement)
uvicorn main:app --reload --port 8000
```

> 🔐 Au premier démarrage, un compte **admin** est créé automatiquement avec `must_change_password=True`.  
> Consultez `backend/FIRST_LAUNCH.md` pour les détails.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Application : [http://localhost:5173](http://localhost:5173)  
API Docs : [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Premier login

| Identifiant | Mot de passe | Rôle |
|-------------|-------------|------|
| `admin`     | `Admin@123` | Administrateur |

> ⚠️ **Le changement de mot de passe est obligatoire à la première connexion.**

Pour les utilisateurs supplémentaires, utilisez l'interface **Administration → Gestion des utilisateurs**.

---

## 📂 Structure du projet

```
reinsurance-platform/
├── backend/
│   ├── main.py              # FastAPI app + startup init DB
│   ├── seed.py              # Script de seed manuel
│   ├── FIRST_LAUNCH.md      # Guide premier lancement
│   ├── core/
│   │   ├── config.py        # Variables d'environnement
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   └── security.py      # JWT + bcrypt
│   ├── models/
│   │   ├── db_models.py     # ORM (User, ActivityLog)
│   │   └── schemas.py       # Pydantic schemas
│   ├── routers/             # Endpoints API (auth, admin, kpis, …)
│   ├── services/            # Logique métier
│   ├── repositories/        # Accès BDD
│   ├── middlewares/         # CORS, rate limit, security headers
│   ├── .env.example         # Template configuration (à copier en .env)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── context/         # AuthContext + DataContext
    │   ├── pages/           # Dashboard, Scoring, Comparison, Admin, …
    │   ├── components/      # Layout, FilterPanel, KPICards, Charts/…
    │   ├── hooks/           # useKPIs, useContracts, useInactiveClients, …
    │   └── utils/           # api.ts, formatters.ts
    ├── package.json
    └── vite.config.ts
```

---

## 📱 Pages disponibles

| Page | URL | Rôles |
|------|-----|-------|
| Tableau de bord | `/` | Tous |
| Scoring marchés | `/scoring` | Tous |
| Comparaison | `/comparaison` | Tous |
| Recommandations | `/recommandations` | Tous |
| Clients inactifs | `/inactive-clients` | Admin, Souscripteur |
| Administration | `/admin` | Admin uniquement |

---

## 🛡️ Sécurité

- Authentification par **cookie httpOnly JWT** (pas de localStorage)
- **bcrypt** (rounds=12) pour les mots de passe
- Middleware **CORS**, **Rate Limiting**, **Security Headers**
- **RBAC** (admin / souscripteur / lecteur)
- Tokens invalidables via `token_version`
