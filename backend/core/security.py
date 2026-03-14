from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException
import bcrypt
from core.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

# We only use passlib for the legacy PHP sha256_crypt hashes to avoid the bcrypt>=4.0 passlib bug
pwd_context = CryptContext(
    schemes=["sha256_crypt"],
    deprecated="auto"
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Direct bcrypt verification for modern hashes
    if hashed_password.startswith("$2"):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False
    
    # Fallback to older hashes (sha256_crypt)
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    # Use pure bcrypt library directly to avoid passlib bug
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    data.update({"exp": expire})
    return jwt.encode(data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
