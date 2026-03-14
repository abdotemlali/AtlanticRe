from fastapi import APIRouter, Depends, Request, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from core import database
from core.config import ENVIRONMENT
from core.security import create_access_token, get_password_hash
from middlewares.rate_limit import limiter
from models import schemas
from models.db_models import User
from repositories import user_repository, log_repository
from services import auth_service

router = APIRouter()

ALLOWED_PATHS_TEMP_PASSWORD = {
    "/api/auth/change-password",
    "/api/auth/logout",
    "/api/auth/me",
}


def get_current_user(
    access_token: str = Cookie(None),
    db: Session = Depends(database.get_db)
) -> dict:
    from jose import JWTError, jwt
    from fastapi import HTTPException
    from core.config import JWT_SECRET_KEY, JWT_ALGORITHM
    from models import db_models

    if not access_token:
        raise HTTPException(status_code=401, detail="Non authentifié (cookie manquant)")

    try:
        payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

    user = db.query(db_models.User).filter(db_models.User.username == username, db_models.User.active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")

    jwt_version = payload.get("token_version", 0)
    if user.token_version != jwt_version:
        raise HTTPException(status_code=401, detail="Session expirée. Veuillez vous reconnecter.")

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "email": user.email,
        "active": user.active,
        "id_int": user.id,
        "must_change_password": user.must_change_password
    }


def require_password_changed(
    request: Request,
    current_user: dict = Depends(get_current_user)
) -> dict:
    from fastapi import HTTPException
    if current_user.get("must_change_password") and request.url.path not in ALLOWED_PATHS_TEMP_PASSWORD:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PASSWORD_CHANGE_REQUIRED",
                "message": "Vous devez modifier votre mot de passe avant de continuer.",
                "redirect": "/change-password"
            }
        )
    return current_user


def require_role(*roles):
    def checker(user: dict = Depends(require_password_changed)):
        from fastapi import HTTPException
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Accès refusé")
        return user
    return checker


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, login_req: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    from core.security import verify_password
    user = user_repository.get_by_username(db, login_req.username)
    if not user or not verify_password(login_req.password, user.hashed_password):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "token_version": user.token_version,
        "must_change_password": user.must_change_password
    })
    log_repository.add_log(user.username, "LOGIN")

    response = JSONResponse(content={
        "message": "Connexion réussie",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "must_change_password": user.must_change_password
        }
    })

    is_prod = ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="strict",
        max_age=8 * 3600,
        path="/"
    )
    return response


@router.post("/logout")
def logout(user: dict = Depends(get_current_user)):
    log_repository.add_log(user["username"], "LOGOUT")
    response = JSONResponse(content={"message": "Déconnexion réussie"})
    response.delete_cookie(key="access_token", path="/")
    return response


@router.get("/me", response_model=schemas.UserOut)
def me(user: dict = Depends(get_current_user)):
    return schemas.UserOut(
        id=user["id"],
        username=user["username"],
        full_name=user["full_name"],
        email=user.get("email", ""),
        role=user["role"],
        active=user.get("active", True),
        must_change_password=user.get("must_change_password", False)
    )


@router.post("/confirm-reset")
@limiter.limit("3/minute")
def confirm_reset(request: Request, body: schemas.ConfirmResetRequest, db: Session = Depends(database.get_db)):
    auth_service.confirm_reset(body, db)
    return {"message": "Mot de passe réinitialisé. Vous pouvez maintenant vous connecter."}


@router.post("/change-password")
def change_password_first_login(
    body: schemas.FirstLoginPasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    auth_service.change_password_first_login(body, current_user, db)
    return {"message": "Mot de passe mis à jour. Veuillez vous reconnecter."}
