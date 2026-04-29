"""Modèle SQLAlchemy pour le cache persistant des prédictions Axe 2.

Le cache survit aux redémarrages — la pipeline ML (30–60s) n'est relancée que
si l'entrée la plus récente est plus vieille que CACHE_TTL_DAYS.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class PredictionsCache(Base):
    __tablename__ = "predictions_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    computed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    axco_filename = Column(String(255), nullable=True)
    cache_data = Column(LONGTEXT, nullable=False)
