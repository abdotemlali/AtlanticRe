from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy_utils import database_exists, create_database
from core.config import DATABASE_URL

# Auto-create database if it doesn't exist
if DATABASE_URL:
    try:
        if not database_exists(DATABASE_URL):
            create_database(DATABASE_URL)
            print(f"Base de données créée avec succès.")
    except Exception as e:
        print(f"Attention: Impossible de créer la BDD automatiquement: {e}")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
