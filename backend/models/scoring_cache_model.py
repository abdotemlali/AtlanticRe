"""Modèle SQLAlchemy pour le cache persistant du scoring Axe 2.

Le cache survit aux redémarrages — TOPSIS + Clustering + Monte Carlo
ne sont recalculés que si l'entrée la plus récente est expirée ou invalidée.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class ScoringCache(Base):
    __tablename__ = "scoring_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    computed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    cache_data = Column(LONGTEXT, nullable=False)
