from sqlalchemy.orm import Session
from models.db_models import User

def get_by_username(db: Session, username: str) -> User:
    return db.query(User).filter(User.username == username, User.active == True).first()

def get_by_email(db: Session, email: str) -> User:
    return db.query(User).filter(User.email == email).first()

def get_by_id(db: Session, user_id: int) -> User:
    return db.query(User).filter(User.id == user_id).first()

def get_by_reset_token(db: Session, token: str) -> User:
    return db.query(User).filter(User.reset_token == token).first()

def get_all(db: Session) -> list[User]:
    return db.query(User).all()

def get_by_username_or_email(db: Session, username: str, email: str) -> User:
    return db.query(User).filter((User.username == username) | (User.email == email)).first()

def create(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update(db: Session, user: User) -> User:
    db.commit()
    db.refresh(user)
    return user

def delete(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
