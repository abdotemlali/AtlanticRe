import logging
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.config import FRONTEND_URL
from core.security import verify_password, create_access_token, get_password_hash
from models import schemas
from repositories import user_repository, log_repository
from services.email_service import send_reset_email

logger = logging.getLogger(__name__)

def login(login_req: schemas.LoginRequest, db: Session):
    user = user_repository.get_by_username(db, login_req.username)
    if not user or not verify_password(login_req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    # Automatic hash migration — only for old sha256_crypt hashes (not bcrypt $2b$...)
    if not user.hashed_password.startswith("$2"):
        from core.security import pwd_context
        try:
            if pwd_context.needs_update(user.hashed_password):
                user.hashed_password = get_password_hash(login_req.password)
                user_repository.update(db, user)
        except Exception as e:
            logger.warning(f"Hash migration check skipped for {user.username}: {e}")
    
    token = create_access_token({
        "sub": user.username, 
        "role": user.role,
        "token_version": user.token_version,
        "must_change_password": user.must_change_password
    })
    log_repository.add_log(user.username, "LOGIN")
    
    return {
        "token": token,
        "user_data": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "must_change_password": user.must_change_password
        }
    }

def request_reset(user_id: int, current_user_id: int, db: Session, admin_username: str):
    if user_id == current_user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas réinitialiser votre propre compte depuis cet écran")
        
    target = user_repository.get_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
    if not target.email:
        raise HTTPException(status_code=400, detail="Cet utilisateur n'a pas d'adresse email configurée")
        
    token = secrets.token_urlsafe(48)
    target.reset_token = token
    target.reset_token_expiry = datetime.utcnow() + timedelta(hours=24)
    user_repository.update(db, target)
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    try:
        send_reset_email(target.email, target.full_name, reset_link)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email non envoyé: {str(e)}")
        
    log_repository.add_log(admin_username, "REQUEST_RESET", target.username)

def confirm_reset(body: schemas.ConfirmResetRequest, db: Session):
    user = user_repository.get_by_reset_token(db, body.token)
    
    if not user:
        raise HTTPException(status_code=400, detail="Lien invalide ou déjà utilisé")
        
    if user.reset_token_expiry and datetime.utcnow() > user.reset_token_expiry:
        raise HTTPException(status_code=400, detail="Ce lien a expiré. Demandez un nouveau reset.")
        
    pwd = body.new_password
    errors = []
    if len(pwd) < 8: errors.append("Minimum 8 caractères")
    if not any(c.isupper() for c in pwd): errors.append("Au moins 1 majuscule")
    if not any(c.isdigit() for c in pwd): errors.append("Au moins 1 chiffre")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in pwd): errors.append("Au moins 1 caractère spécial")
    
    if errors:
        raise HTTPException(status_code=400, detail=" · ".join(errors))
        
    user.hashed_password = get_password_hash(pwd)
    user.reset_token = None
    user.reset_token_expiry = None
    user.token_version += 1  
    user_repository.update(db, user)
    
    log_repository.add_log(user.username, "PASSWORD_RESET", "L'utilisateur a réinitialisé son mot de passe")

def change_password_first_login(body: schemas.FirstLoginPasswordRequest, current_user: dict, db: Session):
    if not current_user.get("must_change_password"):
        raise HTTPException(status_code=400, detail="Action non requise")
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas")
    
    pwd = body.new_password
    errors = []
    if len(pwd) < 8: errors.append("Minimum 8 caractères")
    if not any(c.isupper() for c in pwd): errors.append("Au moins 1 majuscule")
    if not any(c.isdigit() for c in pwd): errors.append("Au moins 1 chiffre")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in pwd): errors.append("Au moins 1 caractère spécial")
    
    if errors:
        raise HTTPException(status_code=400, detail=" · ".join(errors))

    user_model = user_repository.get_by_id(db, current_user["id_int"])
    if not user_model:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user_model.hashed_password = get_password_hash(pwd)
    user_model.must_change_password = False
    user_model.token_version += 1
    user_repository.update(db, user_model)

    log_repository.add_log(current_user["username"], "PASSWORD_CHANGED_FIRST_LOGIN")
