import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI

from core import database
from core.security import get_password_hash
from models import db_models
from middlewares.cors import setup_cors
from middlewares.rate_limit import setup_rate_limiter
from middlewares.security_headers import SecurityHeadersMiddleware
from routers import auth, admin, contracts, scoring, comparison, data, export, clients
from routers import kpis_global, exposition as exposition_router, cedantes, brokers, alerts as alerts_router
from services.data_service import load_excel
from services.retro_service import load_retro_excel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Identifiants de l'admin par défaut ───────────────────────────────────────
_DEFAULT_ADMIN = {
    "username":            "admin",
    "password":            "Admin@123",
    "role":                "admin",
    "full_name":           "Administrateur",
    "email":               "admin@atlantic-re.com",
    "must_change_password": True,
    "active":              True,
}


def init_db() -> None:
    """
    Initialise la base de données au démarrage :
      1. Crée les tables manquantes (idempotent via create_all)
      2. Vérifie si un admin existe
      3. Si aucun admin → crée l'admin par défaut (must_change_password=True)
      4. Enregistre l'opération dans activity_logs

    En cas d'erreur de connexion, log un warning sans bloquer le démarrage.
    """
    try:
        # 1. Créer les tables
        db_models.Base.metadata.create_all(bind=database.engine)
        logger.info("Tables BDD vérifiées / créées")
    except Exception as exc:
        logger.warning(f"⚠️  Impossible de créer les tables : {exc}")
        return  # Ne pas bloquer le démarrage

    db = database.SessionLocal()
    try:
        # 2. Vérifier si un admin existe déjà
        existing_admin = (
            db.query(db_models.User)
            .filter(db_models.User.username == _DEFAULT_ADMIN["username"])
            .first()
        )

        if existing_admin:
            logger.info(f"Admin '{_DEFAULT_ADMIN['username']}' déjà présent — skip")
            return

        # 3. Créer l'admin par défaut
        hashed = get_password_hash(_DEFAULT_ADMIN["password"])
        admin_user = db_models.User(
            username=_DEFAULT_ADMIN["username"],
            hashed_password=hashed,
            role=_DEFAULT_ADMIN["role"],
            full_name=_DEFAULT_ADMIN["full_name"],
            email=_DEFAULT_ADMIN["email"],
            active=_DEFAULT_ADMIN["active"],
            must_change_password=_DEFAULT_ADMIN["must_change_password"],
        )
        db.add(admin_user)

        # 4. Logger l'opération
        log = db_models.ActivityLog(
            timestamp=datetime.now(tz=timezone.utc),
            username="system",
            action="AUTO_SEED_ADMIN",
            detail=(
                f"Admin par défaut créé automatiquement au démarrage — "
                f"username={_DEFAULT_ADMIN['username']}, "
                f"must_change_password=True"
            ),
        )
        db.add(log)
        db.commit()

        logger.info("=" * 55)
        logger.info("  ✅ Admin par défaut créé au démarrage")
        logger.info(f"  👤 Username : {_DEFAULT_ADMIN['username']}")
        logger.info(f"  🔑 Password : {_DEFAULT_ADMIN['password']}")
        logger.info("  ⚠️  Changez ce mot de passe au premier login !")
        logger.info("=" * 55)

    except Exception as exc:
        db.rollback()
        logger.warning(f"⚠️  Erreur lors de l'initialisation de l'admin : {exc}")
    finally:
        db.close()


# ── Lifespan (remplace @app.on_event déprecié dans FastAPI ≥ 0.93) ───────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    # Init BDD & admin par défaut
    init_db()

    # Charger le fichier Excel
    try:
        load_excel()
        logger.info("Fichier Excel chargé au démarrage")
    except Exception as exc:
        logger.warning(f"Impossible de charger le fichier Excel au démarrage : {exc}")

    try:
        load_retro_excel()
        logger.info("Fichier Excel rétrocession chargé au démarrage")
    except Exception as exc:
        logger.warning(f"Impossible de charger le fichier rétrocession au démarrage : {exc}")

    yield  # L'application tourne ici

    # ── Shutdown (facultatif) ────────────────────────────────────────────────
    logger.info("Application arrêtée proprement")


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Atlantic Re — Plateforme Réassurance",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Middlewares ───────────────────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)
setup_cors(app)
setup_rate_limiter(app)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(admin.router,      prefix="/api/admin",      tags=["Admin"])

# KPIs — découpé en 5 routers par domaine métier
app.include_router(kpis_global.router,       prefix="/api/kpis",              tags=["KPIs"])
app.include_router(exposition_router.router, prefix="/api/kpis/exposition",   tags=["Exposition"])
app.include_router(cedantes.router,          prefix="/api/kpis",              tags=["Cédantes"])
app.include_router(brokers.router,           prefix="/api/kpis",              tags=["Brokers"])
app.include_router(alerts_router.router,     prefix="/api/kpis",              tags=["Alerts"])

app.include_router(contracts.router,  prefix="/api/contracts",  tags=["Contracts"])
app.include_router(scoring.router,    prefix="/api/scoring",    tags=["Scoring"])
app.include_router(comparison.router, prefix="/api/comparison", tags=["Comparison"])
app.include_router(data.router,       prefix="/api/data",       tags=["Data"])
app.include_router(export.router,     prefix="/api/export",     tags=["Export"])
app.include_router(clients.router,    prefix="/api/clients",    tags=["Clients"])

from routers.retro import router as retro_router
app.include_router(retro_router, prefix="/api/retro", tags=["Retrocession"])

from routers.target_share import router as target_share_router
app.include_router(target_share_router, prefix="/api/target-share", tags=["target-share"])

