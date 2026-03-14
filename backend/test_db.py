import logging
from database import engine, SessionLocal
from db_models import Base, User
import config

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    count = db.query(User).count()
    print(f"DEBUG: Found {count} users.")
    if count == 0:
        # Just mock pwd_context.hash since we didn't import passlib
        print("Seeding users...")
        for u in config.DEFAULT_USERS:
            db_user = User(
                username=u["username"],
                full_name=u["full_name"],
                email=u["email"],
                role=u["role"],
                active=u["active"],
                hashed_password="mock_hashed_password"
            )
            db.add(db_user)
        db.commit()
    
    users = db.query(User).all()
    print("SUCCESS: Retrieved users from DB:")
    for u in users:
        print(f" - {u.username} (Role: {u.role})")
finally:
    db.close()
