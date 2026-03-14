import logging
import secrets
import string

from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.security import get_password_hash
from models import schemas
from models.db_models import User
from repositories import user_repository, log_repository
from services.email_service import send_welcome_email

logger = logging.getLogger(__name__)

def get_users(db: Session):
    users = user_repository.get_all(db)
    return [schemas.UserOut(id=u.id, username=u.username, full_name=u.full_name,
                            email=u.email or "", role=u.role, active=u.active, 
                            must_change_password=u.must_change_password) for u in users]

def create_user(new_user: schemas.UserCreate, admin_username: str, db: Session):
    existing = user_repository.get_by_username_or_email(db, new_user.username, new_user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur ou email déjà pris")
    
    def generate_temp_password(length=12) -> str:
        lowercase = string.ascii_lowercase
        uppercase = string.ascii_uppercase
        digits = string.digits
        special = "!@#$%^&*"
        pwd = [
            secrets.choice(uppercase),
            secrets.choice(digits),
            secrets.choice(special),
            secrets.choice(lowercase),
        ]
        all_chars = lowercase + uppercase + digits + special
        pwd += [secrets.choice(all_chars) for _ in range(length - 4)]
        secrets.SystemRandom().shuffle(pwd)
        return "".join(pwd)

    temp_password = new_user.password if new_user.password else generate_temp_password()
    hashed = get_password_hash(temp_password)

    db_user = User(
        username=new_user.username,
        full_name=new_user.full_name,
        email=new_user.email,
        role=new_user.role,
        active=new_user.active,
        hashed_password=hashed,
        must_change_password=True,
        token_version=0
    )
    user_repository.create(db, db_user)
    
    log_repository.add_log(admin_username, "CREATE_USER", new_user.username)

    if db_user.email:
        try:
            send_welcome_email(
                to_email=db_user.email,
                full_name=db_user.full_name,
                username=db_user.username,
                temp_password=temp_password,
                role=db_user.role
            )
            logger.info(f"Email de bienvenue envoyé à {db_user.email}")
        except Exception as e:
            # L'utilisateur est créé, mais on log l'échec d'email clairement
            logger.error(f"[EMAIL] Échec envoi welcome email à {db_user.email}: {e}")
            # On retourne un warning dans la réponse (sans bloquer la création)
            return schemas.UserOut(
                id=db_user.id,
                username=db_user.username,
                full_name=db_user.full_name,
                email=db_user.email or "",
                role=db_user.role,
                active=db_user.active,
                must_change_password=db_user.must_change_password,
                email_warning=f"Utilisateur créé mais l'email de bienvenue n'a pas pu être envoyé : {str(e)}"
            )

    return schemas.UserOut(id=db_user.id, username=db_user.username, full_name=db_user.full_name,
                   email=db_user.email or "", role=db_user.role, active=db_user.active,
                   must_change_password=db_user.must_change_password)

def update_user(user_id: int, updates: schemas.UserUpdate, admin_username: str, db: Session):
    target = user_repository.get_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    if updates.full_name is not None:
        target.full_name = updates.full_name
    if updates.email is not None:
        target.email = updates.email
    if updates.role is not None:
        target.role = updates.role
    if updates.active is not None:
        target.active = updates.active
    if updates.password is not None:
        target.hashed_password = get_password_hash(updates.password)
        
    user_repository.update(db, target)
    
    log_repository.add_log(admin_username, "UPDATE_USER", str(user_id))
    return schemas.UserOut(id=target.id, username=target.username, full_name=target.full_name,
                   email=target.email or "", role=target.role, active=target.active,
                   must_change_password=target.must_change_password)

def delete_user(user_id: int, admin_id: int, admin_username: str, db: Session):
    if user_id == admin_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer votre propre compte")

    target = user_repository.get_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    full_name = target.full_name
    username = target.username
    user_repository.delete(db, target)

    log_repository.add_log(admin_username, "DELETE_USER", username)
    return {"message": f"Utilisateur '{full_name}' supprimé avec succès"}
