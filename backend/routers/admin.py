import os
from dotenv import set_key
import core.config
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core import database
from models import schemas
from services import user_service
from repositories import log_repository
from routers.auth import require_role
from core.config import EXCEL_FILE_PATH, RETRO_EXCEL_FILE_PATH

router = APIRouter()

# In-memory config store (same as original)
_app_config = {
    "excel_file_path": EXCEL_FILE_PATH,
    "retro_excel_file_path": RETRO_EXCEL_FILE_PATH,
}


@router.get("/users")
def list_users(user: dict = Depends(require_role("admin")), db: Session = Depends(database.get_db)):
    return user_service.get_users(db)


@router.post("/users")
def create_user(new_user: schemas.UserCreate, user: dict = Depends(require_role("admin")), db: Session = Depends(database.get_db)):
    return user_service.create_user(new_user, user["username"], db)


@router.put("/users/{user_id}")
def update_user(user_id: int, updates: schemas.UserUpdate, user: dict = Depends(require_role("admin")), db: Session = Depends(database.get_db)):
    return user_service.update_user(user_id, updates, user["username"], db)


@router.post("/users/{user_id}/reset-password")
def request_reset(user_id: int, current_user: dict = Depends(require_role("admin")), db: Session = Depends(database.get_db)):
    from services.auth_service import request_reset as svc_reset
    svc_reset(user_id, current_user["id_int"], db, current_user["username"])
    return {"message": "Email de réinitialisation envoyé"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, user: dict = Depends(require_role("admin")), db: Session = Depends(database.get_db)):
    return user_service.delete_user(user_id, user["id"], user["username"], db)


@router.get("/logs")
def get_logs(user: dict = Depends(require_role("admin"))):
    return log_repository.get_logs()


@router.get("/config")
def get_config(user: dict = Depends(require_role("admin"))):
    return _app_config


@router.put("/config")
def update_config(updates: schemas.ConfigUpdate, user: dict = Depends(require_role("admin"))):
    env_path = str(core.config.BASE_DIR / "backend" / ".env")
    if not os.path.exists(env_path):
        env_path = ".env"

    if updates.excel_file_path:
        core.config.EXCEL_FILE_PATH = updates.excel_file_path
        os.environ["EXCEL_FILE_PATH"] = updates.excel_file_path
        _app_config["excel_file_path"] = updates.excel_file_path
        
        try:
            set_key(env_path, "EXCEL_FILE_PATH", updates.excel_file_path)
        except Exception:
            pass
            
        log_repository.add_log(user["username"], "UPDATE_CONFIG", updates.excel_file_path)
        
    if updates.retro_excel_file_path:
        core.config.RETRO_EXCEL_FILE_PATH = updates.retro_excel_file_path
        os.environ["RETRO_EXCEL_FILE_PATH"] = updates.retro_excel_file_path
        _app_config["retro_excel_file_path"] = updates.retro_excel_file_path
        
        try:
            set_key(env_path, "RETRO_EXCEL_FILE_PATH", updates.retro_excel_file_path)
        except Exception:
            pass
            
        log_repository.add_log(user["username"], "UPDATE_RETRO_CONFIG", updates.retro_excel_file_path)
        
    return _app_config
