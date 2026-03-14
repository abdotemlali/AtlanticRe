# Guide Collaborateur — Atlantic Re

> Toutes les modifications passent par une **branche dédiée** + **Pull Request**.  
> Ne jamais modifier `main` directement.

---

## 1. Cloner le projet

```bash
git clone https://github.com/abdotemlali/AtlanticRe.git
cd AtlanticRe
```

---

## 2. Configurer votre environnement

```bash
# Backend
cd backend
cp .env.example .env          # Remplir les variables (DB, JWT, Gmail…)
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

---

## 3. Créer votre branche de travail

> Toujours partir de `main` à jour.

```bash
git checkout main
git pull origin main          # Récupérer les dernières modifications

# Créer et basculer sur votre branche
git checkout -b feature/nom-de-votre-fonctionnalite
```

### Conventions de nommage des branches

| Type | Préfixe | Exemple |
|------|---------|---------|
| Nouvelle fonctionnalité | `feature/` | `feature/inactive-clients-export` |
| Correction de bug | `fix/` | `fix/login-redirect` |
| Amélioration UI | `ui/` | `ui/dashboard-charts` |
| Refactoring | `refactor/` | `refactor/auth-service` |

---

## 4. Travailler et commiter

```bash
# Après vos modifications
git add .
git commit -m "feat: description courte et claire"
```

### Format des messages de commit

```
feat: ajout de l'export Excel pour les clients inactifs
fix: correction du redirect après changement de mot de passe
ui: amélioration des cartes KPI sur le dashboard
refactor: extraction de la logique scoring dans un service dédié
```

---

## 5. Pousser votre branche

```bash
git push origin feature/nom-de-votre-fonctionnalite
```

---

## 6. Créer la Pull Request (PR)

1. Allez sur **[github.com/abdotemlali/AtlanticRe](https://github.com/abdotemlali/AtlanticRe)**
2. GitHub affiche une bannière **"Compare & pull request"** → cliquez dessus
3. Remplissez le formulaire :
   - **Titre** : description courte (`feat: export Excel clients inactifs`)
   - **Description** : ce que vous avez fait, pourquoi, et comment tester
   - **Base branch** : `main` ← votre branche
4. Cliquez **"Create Pull Request"**

---

## 7. Processus de review

```
Votre branche → Pull Request → Review par abdotemlali → Merge dans main
```

- Le mainteneur peut demander des modifications → faites les commits sur la même branche, la PR se met à jour automatiquement
- Une fois approuvée → le mainteneur fait le **Merge**
- **Supprimez votre branche** après le merge (GitHub propose le bouton "Delete branch")

---

## 8. Récupérer les dernières modifications de main

Si `main` a évolué pendant que vous travailliez :

```bash
git checkout main
git pull origin main
git checkout feature/votre-branche
git rebase main               # ou : git merge main
```

---

## Règles importantes

- ❌ Ne jamais `git push --force` sur `main`
- ❌ Ne jamais commiter le fichier `.env` (identifiants secrets)
- ✅ Une branche = une fonctionnalité
- ✅ PR petites et focalisées (plus facile à reviewer)
- ✅ Tester localement avant de créer la PR
