"""
Persistent log repository — writes to MySQL via SQLAlchemy.

Every call to add_log() inserts a row into the `activity_logs` table.
get_logs() reads the latest N entries ordered by timestamp DESC.
"""
from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.db_models import ActivityLog

# ── max rows kept in DB (soft cap, not purged automatically) ─────────────────
MAX_LOGS = 10_000


def add_log(username: str, action: str, detail: str = "") -> None:
    """Insert a log entry into the database. Never raises."""
    try:
        db: Session = SessionLocal()
        try:
            entry = ActivityLog(
                username=username,
                action=action,
                detail=detail or None,
            )
            db.add(entry)
            db.commit()
        finally:
            db.close()
    except Exception:
        pass  # logs must never crash the caller


def get_logs(limit: int = 500) -> List[dict]:
    """Return the most recent `limit` log entries as dicts."""
    try:
        db: Session = SessionLocal()
        try:
            rows = (
                db.query(ActivityLog)
                .order_by(ActivityLog.timestamp.desc())
                .limit(limit)
                .all()
            )
            return [
                {
                    "timestamp": r.timestamp.isoformat() if r.timestamp else "",
                    "username": r.username,
                    "action": r.action,
                    "detail": r.detail or "",
                }
                for r in rows
            ]
        finally:
            db.close()
    except Exception:
        return []
