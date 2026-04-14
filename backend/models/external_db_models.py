"""
Modèles SQLAlchemy pour les tables de données externes (marché africain).
Tables : ref_pays, ext_marche_non_vie, ext_marche_vie, ext_gouvernance, ext_macroeconomie.

Dernière modification : renommage integration_regionale_rank -> integration_regionale_score (Float).
"""
from sqlalchemy import (
    Column, Integer, SmallInteger, String, Float, DateTime,
    ForeignKey, UniqueConstraint, Index, CHAR,
)
from sqlalchemy.sql import func

from core.database import Base


class RefPays(Base):
    __tablename__ = "ref_pays"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom_pays = Column(String(100), nullable=False, unique=True, index=True)
    code_iso3 = Column(CHAR(3), nullable=True, index=True)
    region = Column(String(50), nullable=True, index=True)
    pays_risque_match = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ExtMarcheNonVie(Base):
    __tablename__ = "ext_marche_non_vie"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pays = Column(String(100), ForeignKey("ref_pays.nom_pays", onupdate="CASCADE"), nullable=False)
    annee = Column(SmallInteger, nullable=False)
    primes_emises_mn_usd = Column(Float, nullable=True)
    croissance_primes_pct = Column(Float, nullable=True)
    taux_penetration_pct = Column(Float, nullable=True)
    ratio_sp_pct = Column(Float, nullable=True)
    densite_assurance_usd = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("pays", "annee", name="uq_ext_non_vie_pays_annee"),
        Index("ix_ext_non_vie_annee", "annee"),
    )


class ExtMarcheVie(Base):
    __tablename__ = "ext_marche_vie"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pays = Column(String(100), ForeignKey("ref_pays.nom_pays", onupdate="CASCADE"), nullable=False)
    annee = Column(SmallInteger, nullable=False)
    primes_emises_mn_usd = Column(Float, nullable=True)
    croissance_primes_pct = Column(Float, nullable=True)
    taux_penetration_pct = Column(Float, nullable=True)
    densite_assurance_usd = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("pays", "annee", name="uq_ext_vie_pays_annee"),
        Index("ix_ext_vie_annee", "annee"),
    )


class ExtGouvernance(Base):
    __tablename__ = "ext_gouvernance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pays = Column(String(100), ForeignKey("ref_pays.nom_pays", onupdate="CASCADE"), nullable=False)
    annee = Column(SmallInteger, nullable=False)
    fdi_inflows_pct_gdp = Column(Float, nullable=True)
    political_stability = Column(Float, nullable=True)
    regulatory_quality = Column(Float, nullable=True)
    kaopen = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("pays", "annee", name="uq_ext_gouv_pays_annee"),
        Index("ix_ext_gouv_annee", "annee"),
    )


class ExtMacroeconomie(Base):
    __tablename__ = "ext_macroeconomie"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pays = Column(String(100), ForeignKey("ref_pays.nom_pays", onupdate="CASCADE"), nullable=False)
    annee = Column(SmallInteger, nullable=False)
    gdp_growth_pct = Column(Float, nullable=True)
    current_account_mn = Column(Float, nullable=True)
    exchange_rate = Column(Float, nullable=True)
    gdp_per_capita = Column(Float, nullable=True)
    gdp_mn = Column(Float, nullable=True)
    inflation_rate_pct = Column(Float, nullable=True)
    integration_regionale_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("pays", "annee", name="uq_ext_macro_pays_annee"),
        Index("ix_ext_macro_annee", "annee"),
    )
