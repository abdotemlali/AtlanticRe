# 🚀 Premier lancement — Atlantic Re Decision Intelligence

## Pré-requis

- Python 3.10+
- MySQL 8.0+ (serveur local ou distant)
- Variables d'environnement configurées dans `.env`

### Variables `.env` minimales

```env
DATABASE_URL=mysql+pymysql://user:password@localhost/atlantic_re
JWT_SECRET_KEY=change_me_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
```

---

## Démarrage automatique (recommandé)

```bash
# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Lancer le backend
uvicorn main:app --reload
```

> Au démarrage, l'application :
> - **Crée automatiquement la base de données MySQL** (ex: `atlantic_re`) si elle n'existe pas
> - Crée automatiquement les tables manquantes
> - Vérifie si un admin existe
> - Crée l'admin par défaut si nécessaire

---

## Identifiants par défaut

| Champ    | Valeur                   |
|----------|--------------------------|
| Username | `admin`                  |
| Password | `Admin@123`              |
| Email    | `admin@atlantic-re.com`  |
| Rôle     | `admin`                  |

> ⚠️ **Le changement de mot de passe est obligatoire au premier login.**

---

## Reset / Réinitialisation manuelle

Si vous avez besoin de réinitialiser ou de repeupler la BDD :

```bash
python seed.py
```

Le script est **idempotent** : il ne recrée pas un admin qui existe déjà.

---

## Vérification

Après démarrage, visitez :

- **API Docs** → `http://localhost:8000/docs`
- **Health check** → `http://localhost:8000/api/auth/me` (après login)
- **Frontend** → `http://localhost:5173` (si Vite est démarré)

---

## Création d'utilisateurs supplémentaires

Connectez-vous en tant qu'admin, puis utilisez l'interface **Administration → Gestion des utilisateurs** pour créer des comptes souscripteur ou analyste.
