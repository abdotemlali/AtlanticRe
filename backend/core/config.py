import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Env context
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Chemin du fichier Excel (modifiable via Admin)
EXCEL_FILE_PATH = os.getenv(
    "EXCEL_FILE_PATH",
    r"C:\Users\TEMLALI\Downloads\Template_data_filled (1).xlsx"
)
EXCEL_SHEET_NAME = "Feuil2"

# JWT
JWT_SECRET_KEY = os.getenv("SECRET_KEY")
if not JWT_SECRET_KEY:
    raise RuntimeError("SECRET_KEY manquante dans .env")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 480  # 8 heures

# Base de données MySQL
DATABASE_URL = os.getenv("DATABASE_URL")

# Reset Password & Email Config
GMAIL_SENDER = os.getenv("GMAIL_SENDER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Utilisateurs par défaut (stockage en mémoire)
DEFAULT_USERS = [
    {
        "id": "1",
        "username": "admin",
        "password": "admin123", # À l'avenir, le process d'init forcera peut-être le reset
        "role": "admin",
        "full_name": "Administrateur",
        "email": "admin@reinsurance.ma",
        "active": True,
    }
]

# Seuils de scoring par défaut
DEFAULT_SCORING_CRITERIA = [
    {"key": "ulr", "label": "Loss Ratio (ULR)", "weight": 40, "threshold": 70, "direction": "lower_is_better"},
    {"key": "written_premium", "label": "Prime écrite (volume)", "weight": 25, "threshold": 100000, "direction": "higher_is_better"},
    {"key": "resultat", "label": "Résultat net", "weight": 20, "threshold": 0, "direction": "higher_is_better"},
    {"key": "commi", "label": "Taux de commission", "weight": 10, "threshold": 35, "direction": "lower_is_better"},
    {"key": "share_written", "label": "Part souscrite (Share)", "weight": 5, "threshold": 5, "direction": "higher_is_better"},
]
