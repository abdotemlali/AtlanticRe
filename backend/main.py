import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI

from core import database
from core.security import get_password_hash
from models import db_models
from models import external_db_models  # noqa: F401 — register external tables on Base
from middlewares.cors import setup_cors
from middlewares.rate_limit import setup_rate_limiter
from middlewares.security_headers import SecurityHeadersMiddleware
from routers import auth, admin, contracts, scoring, comparison, data, export, clients
from routers import kpis_global, exposition as exposition_router, cedantes, brokers, alerts as alerts_router
from services.data_service import load_excel
from services.retro_service import load_retro_excel
from services.fac_to_fac_service import load_fcm_excel

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
        # Table dédiée au cache persistant des prédictions Axe 2 (Base distinct)
        from models.predictions_cache_model import Base as PredictionsCacheBase
        PredictionsCacheBase.metadata.create_all(bind=database.engine)
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

    try:
        load_fcm_excel()
        logger.info("Fichier Excel FCM Partenaires chargé au démarrage")
    except Exception as exc:
        logger.warning(f"Impossible de charger le fichier FCM Partenaires au démarrage : {exc}")

    # ── Seed des données externes (marché africain) ─────────────────────────
    # Les tables sont créées par init_db() via create_all (idempotent).
    # On saute le seed uniquement si les 5 tables contiennent déjà des lignes.
    # Un simple check "table existe" ne suffit pas : un run partiel précédent
    # peut avoir rempli ref_pays mais laissé les ext_* vides.
    try:
        from sqlalchemy import text as _sql_text

        counts: dict[str, int] = {}
        with database.engine.connect() as conn:
            for tbl in ("ref_pays", "ext_marche_non_vie", "ext_marche_vie",
                        "ext_gouvernance", "ext_macroeconomie"):
                try:
                    counts[tbl] = conn.execute(_sql_text(f"SELECT COUNT(*) FROM {tbl}")).scalar() or 0
                except Exception:
                    counts[tbl] = 0

        all_populated = all(c > 0 for c in counts.values())

        if all_populated:
            logger.info(f"Données externes déjà présentes — seed ignoré ({counts})")
        else:
            logger.info(f"Tables externes vides ou incomplètes {counts} — lancement du seed…")
            from scripts.seed_external_data import run_seed
            rc = run_seed()
            if rc == 0:
                logger.info("Seed des données externes terminé avec succès")
            else:
                logger.warning(f"Seed des données externes terminé avec code {rc}")
    except Exception as exc:
        logger.warning(f"Impossible de seeder les données externes au démarrage : {exc}")

    # ── Init table synergie_settings ────────────────────────────────────────
    try:
        from sqlalchemy import text as _sql_text2
        with database.engine.connect() as _conn:
            _conn.execute(_sql_text2(
                "CREATE TABLE IF NOT EXISTS synergie_settings ("
                "  `key` VARCHAR(100) PRIMARY KEY,"
                "  value TEXT"
                ")"
            ))
            _conn.execute(_sql_text2(
                "INSERT IGNORE INTO synergie_settings (`key`, value)"
                " VALUES ('usd_to_mad', '9.5')"
            ))
            _conn.commit()
        logger.info("Table synergie_settings initialisée")
    except Exception as exc:
        logger.warning("Impossible d'initialiser synergie_settings : %s", exc)

    # ── Préchauffage cache Monte Carlo (background thread) ──────────────────
    try:
        from routers.monte_carlo_axe2 import start_warmup
        start_warmup()
        logger.info("Monte Carlo — préchauffage du cache lancé en arrière-plan")
    except Exception as exc:
        logger.warning(f"Impossible de démarrer le préchauffage Monte Carlo : {exc}")

    # ── Préchauffage cache Prédictions Axe 2 (DB persistant) ────────────────
    # Charge depuis SQLite si valide ; sinon lance la pipeline ML (~30–60s).
    try:
        from routers.predictions_axe2 import _get_pipeline as _predictions_warmup
        _predictions_warmup()
        logger.info("Prédictions Axe 2 — cache prêt (chargé depuis DB ou recalculé)")
    except Exception as exc:
        logger.warning(f"Impossible de préchauffer le cache Prédictions Axe 2 : {exc}")

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

from routers.fac_to_fac import router as fac_to_fac_router
app.include_router(fac_to_fac_router, prefix="/api/fac-to-fac", tags=["FAC-to-FAC"])

from routers.target_share import router as target_share_router
app.include_router(target_share_router, prefix="/api/target-share", tags=["target-share"])

from routers.external_data import router as external_data_router
app.include_router(external_data_router, prefix="/api", tags=["Market Context"])

from routers.public_overview import router as public_overview_router
app.include_router(public_overview_router, prefix="/api/public", tags=["Public"])

from routers.synergie import router as synergie_router
app.include_router(synergie_router, prefix="/api", tags=["Synergie"])

from routers.analyse_compagnie import router as analyse_compagnie_router
app.include_router(analyse_compagnie_router, prefix="/api", tags=["Analyse Compagnie"])

from routers.predictions_axe2 import router as predictions_axe2_router
app.include_router(predictions_axe2_router, prefix="/api", tags=["Prédictions Axe 2"])

from routers.monte_carlo_axe2 import router as monte_carlo_router
app.include_router(monte_carlo_router, prefix="/api", tags=["Monte Carlo Axe 2"])

