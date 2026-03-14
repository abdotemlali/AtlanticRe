"""
seed.py — Script d'initialisation de la base de données Atlantic Re
------------------------------------------------------------------
Usage : python seed.py

Actions :
  1. Crée toutes les tables SQLAlchemy si elles n'existent pas
  2. Vérifie si un admin existe déjà → skip si oui
  3. Crée un admin par défaut (must_change_password=True)
  4. Enregistre l'opération dans activity_logs
"""

import sys
import os

# Permet d'importer les modules backend depuis n'importe quel répertoire
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone
from core.database import engine, SessionLocal
from core.security import get_password_hash
from models.db_models import Base, User, ActivityLog

# ── Identifiants par défaut ─────────────────────────────────────────────────
DEFAULT_ADMIN = {
    "username":            "admin",
    "password":            "Admin@123",
    "role":                "admin",
    "full_name":           "Administrateur",
    "email":               "admin@atlantic-re.com",
    "must_change_password": True,
    "active":              True,
}


def create_tables() -> None:
    """Crée toutes les tables manquantes (idempotent, ne détruit rien)."""
    print("📦 Création des tables (si nécessaire)…")
    Base.metadata.create_all(bind=engine)
    print("   ✅ Tables prêtes")


def seed_admin(db) -> bool:
    """
    Crée l'admin par défaut si aucun utilisateur 'admin' n'existe.
    Retourne True si créé, False si déjà existant.
    """
    existing = db.query(User).filter(User.username == DEFAULT_ADMIN["username"]).first()
    if existing:
        print(f"ℹ️  Utilisateur '{DEFAULT_ADMIN['username']}' déjà existant — skip")
        return False

    hashed = get_password_hash(DEFAULT_ADMIN["password"])
    user = User(
        username=DEFAULT_ADMIN["username"],
        hashed_password=hashed,
        role=DEFAULT_ADMIN["role"],
        full_name=DEFAULT_ADMIN["full_name"],
        email=DEFAULT_ADMIN["email"],
        active=DEFAULT_ADMIN["active"],
        must_change_password=DEFAULT_ADMIN["must_change_password"],
    )
    db.add(user)

    # Log dans activity_logs
    log = ActivityLog(
        timestamp=datetime.now(tz=timezone.utc),
        username="system",
        action="SEED_ADMIN_CREATED",
        detail=f"Admin par défaut créé via seed.py — username={DEFAULT_ADMIN['username']}",
    )
    db.add(log)
    db.commit()
    return True


def main():
    print()
    print("=" * 55)
    print("  Atlantic Re — Initialisation de la base de données")
    print("=" * 55)

    # 1. Créer les tables
    try:
        create_tables()
    except Exception as exc:
        print(f"❌ Erreur lors de la création des tables : {exc}")
        sys.exit(1)

    # 2. Seed admin
    db = SessionLocal()
    try:
        created = seed_admin(db)
    except Exception as exc:
        db.rollback()
        print(f"❌ Erreur lors de la création de l'admin : {exc}")
        sys.exit(1)
    finally:
        db.close()

    # 3. Résumé console
    if created:
        print()
        print("─" * 55)
        print("  ✅ Utilisateur admin créé avec succès")
        print(f"  👤 Username  : {DEFAULT_ADMIN['username']}")
        print(f"  🔑 Password  : {DEFAULT_ADMIN['password']}")
        print(f"  📧 Email     : {DEFAULT_ADMIN['email']}")
        print(f"  🛡️  Rôle      : {DEFAULT_ADMIN['role']}")
        print()
        print("  ⚠️  Changez ce mot de passe au premier login !")
        print("─" * 55)
    else:
        print()
        print("─" * 55)
        print("  ℹ️  Aucune action requise — base déjà initialisée")
        print("─" * 55)

    print()


if __name__ == "__main__":
    main()
