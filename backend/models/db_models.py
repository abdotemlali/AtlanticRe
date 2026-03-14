from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150))
    active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    reset_token = Column(String(128), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    token_version = Column(Integer, default=0, nullable=False)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id         = Column(Integer, primary_key=True, index=True)
    timestamp  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    username   = Column(String(100), nullable=False, index=True)
    action     = Column(String(100), nullable=False)
    detail     = Column(Text, nullable=True)
