"""
Seed idempotent des 4 tables externes (marché africain) + ref_pays.

Usage :
    python backend/scripts/seed_external_data.py --data-dir ./data/external/

Variables d'environnement :
    EXTERNAL_DATA_DIR   Chemin par défaut vers le dossier des CSV
                        (défaut : ./data/external/)
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Permettre l'exécution depuis la racine du projet
THIS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = THIS_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pandas as pd  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.dialects.mysql import insert as mysql_insert  # noqa: E402

from core.database import engine, SessionLocal, Base  # noqa: E402
from models.external_db_models import (  # noqa: E402
    RefPays,
    ExtMarcheNonVie,
    ExtMarcheVie,
    ExtGouvernance,
    ExtMacroeconomie,
)

# ── Référentiel des 34 pays ──────────────────────────────────────────────────
REF_PAYS: List[Dict[str, str]] = [
    {"nom_pays": "SOUTH AFRICA",         "code_iso3": "ZAF", "region": "Afrique Australe", "pays_risque_match": "SOUTH AFRICA"},
    {"nom_pays": "ALGERIE",              "code_iso3": "DZA", "region": "Maghreb",          "pays_risque_match": "ALGERIE"},
    {"nom_pays": "ANGOLA",               "code_iso3": "AGO", "region": "Afrique Australe", "pays_risque_match": "ANGOLA"},
    {"nom_pays": "BOTSWANA",             "code_iso3": "BWA", "region": "Afrique Australe", "pays_risque_match": "BOTSWANA"},
    {"nom_pays": "BURKINA FASO",         "code_iso3": "BFA", "region": "CIMA",             "pays_risque_match": "BURKINA FASO"},
    {"nom_pays": "BURUNDI",              "code_iso3": "BDI", "region": "Afrique Est",      "pays_risque_match": "BURUNDI"},
    {"nom_pays": "BENIN",                "code_iso3": "BEN", "region": "CIMA",             "pays_risque_match": "BENIN"},
    {"nom_pays": "CAMEROON",             "code_iso3": "CMR", "region": "CIMA",             "pays_risque_match": "CAMEROON"},
    {"nom_pays": "CAPE VERDE",           "code_iso3": "CPV", "region": "Iles",             "pays_risque_match": "CAPE VERDE"},
    {"nom_pays": "CONGO",                "code_iso3": "COG", "region": "CIMA",             "pays_risque_match": "CONGO"},
    {"nom_pays": "IVORY COAST",          "code_iso3": "CIV", "region": "CIMA",             "pays_risque_match": "IVORY COAST"},
    {"nom_pays": "GABON",                "code_iso3": "GAB", "region": "CIMA",             "pays_risque_match": "GABON"},
    {"nom_pays": "GHANA",                "code_iso3": "GHA", "region": "Afrique Ouest",    "pays_risque_match": "GHANA"},
    {"nom_pays": "KENYA",                "code_iso3": "KEN", "region": "Afrique Est",      "pays_risque_match": "KENYA"},
    {"nom_pays": "MADAGASCAR",           "code_iso3": "MDG", "region": "Afrique Est",      "pays_risque_match": "MADAGASCAR"},
    {"nom_pays": "MALAWI",               "code_iso3": "MWI", "region": "Afrique Est",      "pays_risque_match": "MALAWI"},
    {"nom_pays": "MALI",                 "code_iso3": "MLI", "region": "CIMA",             "pays_risque_match": "MALI"},
    {"nom_pays": "MOROCCO",              "code_iso3": "MAR", "region": "Maghreb",          "pays_risque_match": "MOROCCO"},
    {"nom_pays": "MAURITIUS",            "code_iso3": "MUS", "region": "Iles",             "pays_risque_match": "MAURITIUS"},
    {"nom_pays": "MAURITANIE",           "code_iso3": "MRT", "region": "Maghreb",          "pays_risque_match": "MAURITANIE"},
    {"nom_pays": "MOZAMBIQUE",           "code_iso3": "MOZ", "region": "Afrique Est",      "pays_risque_match": "MOZAMBIQUE"},
    {"nom_pays": "NAMIBIA",              "code_iso3": "NAM", "region": "Afrique Australe", "pays_risque_match": "NAMIBIA"},
    {"nom_pays": "NIGER",                "code_iso3": "NER", "region": "CIMA",             "pays_risque_match": "NIGER"},
    {"nom_pays": "NIGERIA",              "code_iso3": "NGA", "region": "Afrique Ouest",    "pays_risque_match": "NIGERIA"},
    {"nom_pays": "UGANDA",               "code_iso3": "UGA", "region": "Afrique Est",      "pays_risque_match": "UGANDA"},
    {"nom_pays": "ZAIRE",                "code_iso3": "COD", "region": "Afrique Centrale", "pays_risque_match": "ZAIRE"},
    {"nom_pays": "SENEGAL",              "code_iso3": "SEN", "region": "CIMA",             "pays_risque_match": "SENEGAL"},
    {"nom_pays": "TANZANIA,UNITED REP.", "code_iso3": "TZA", "region": "Afrique Est",      "pays_risque_match": "TANZANIA,UNITED REP."},
    {"nom_pays": "CHAD",                 "code_iso3": "TCD", "region": "CIMA",             "pays_risque_match": "CHAD"},
    {"nom_pays": "TOGO",                 "code_iso3": "TGO", "region": "CIMA",             "pays_risque_match": "TOGO"},
    {"nom_pays": "TUNISIE",              "code_iso3": "TUN", "region": "Maghreb",          "pays_risque_match": "TUNISIE"},
    {"nom_pays": "ZAMBIA",               "code_iso3": "ZMB", "region": "Afrique Est",      "pays_risque_match": "ZAMBIA"},
    {"nom_pays": "EGYPT",                "code_iso3": "EGY", "region": "Maghreb",          "pays_risque_match": "EGYPT"},
    {"nom_pays": "ETHIOPIA",             "code_iso3": "ETH", "region": "Afrique Est",      "pays_risque_match": "ETHIOPIA"},
]


# ── Mapping explicite CSV → DB ───────────────────────────────────────────────
NON_VIE_COLS: Dict[str, str] = {
    "Pays": "pays",
    "Année": "annee",
    "Primes Emises (mn USD)": "primes_emises_mn_usd",
    "Croissance Primes (%)": "croissance_primes_pct",
    "Taux Penetration (%)": "taux_penetration_pct",
    "Ratio S/P (%)": "ratio_sp_pct",
    "Densite Assurance (USD/hab)": "densite_assurance_usd",
}

VIE_COLS: Dict[str, str] = {
    "Pays": "pays",
    "Année": "annee",
    "Primes Emises (mn USD)": "primes_emises_mn_usd",
    "Croissance Primes (%)": "croissance_primes_pct",
    "Taux Penetration (%)": "taux_penetration_pct",
    "Densite Assurance (USD/hab)": "densite_assurance_usd",
}

GOUV_COLS: Dict[str, str] = {
    "Pays": "pays",
    "Année": "annee",
    "FDI Inflows % GDP": "fdi_inflows_pct_gdp",
    "Political Stability": "political_stability",
    "Regulatory Quality": "regulatory_quality",
    "kaopen": "kaopen",
}

MACRO_COLS: Dict[str, str] = {
    "Année": "annee",
    "Pays": "pays",
    "Annual Real GDP Growth (%)": "gdp_growth_pct",
    "Current Account Balance (mn)": "current_account_mn",
    "Exchange Rate": "exchange_rate",
    "GDP Per Capita": "gdp_per_capita",
    "Gross Domestic Product (mn)": "gdp_mn",
    "Inflation Rate (%)": "inflation_rate_pct",
    "Integration_Regionale_Score": "integration_regionale_score",
}

# Mapping noms de pays français (tous CSV) -> noms anglais (ref_pays)
# Utilisé pour non_vie, vie, gouv ET macro (tous les CSV ont les pays en français)
PAYS_FR_TO_EN: Dict[str, str] = {
    "Afrique du Sud": "SOUTH AFRICA",
    "Algérie":        "ALGERIE",
    "Angola":          "ANGOLA",
    "Botswana":        "BOTSWANA",
    "Burkina Faso":    "BURKINA FASO",
    "Burundi":         "BURUNDI",
    "Bénin":          "BENIN",
    "Cameroun":        "CAMEROON",
    "Cap-Vert":        "CAPE VERDE",
    "Congo":           "CONGO",
    "Côte d'Ivoire":  "IVORY COAST",
    "Gabon":           "GABON",
    "Ghana":           "GHANA",
    "Kenya":           "KENYA",
    "Madagascar":      "MADAGASCAR",
    "Malawi":          "MALAWI",
    "Mali":            "MALI",
    "Maroc":           "MOROCCO",
    "Maurice":         "MAURITIUS",
    "Mauritanie":      "MAURITANIE",
    "Mozambique":      "MOZAMBIQUE",
    "Namibie":         "NAMIBIA",
    "Niger":           "NIGER",
    "Nigeria":         "NIGERIA",
    "Ouganda":         "UGANDA",
    "RDC":             "ZAIRE",
    "Sénégal":        "SENEGAL",
    "Tanzanie":        "TANZANIA,UNITED REP.",
    "Tchad":           "CHAD",
    "Togo":            "TOGO",
    "Tunisie":         "TUNISIE",
    "Zambie":          "ZAMBIA",
    "Égypte":          "EGYPT",
    "Éthiopie":        "ETHIOPIA",
}

# Alias pour rétrocompatibilité
MACRO_PAYS_FR_TO_EN = PAYS_FR_TO_EN


# ── Helpers ──────────────────────────────────────────────────────────────────

def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, str):
        s = value.strip().replace(",", ".")
        if s == "" or s.lower() in {"nan", "n/a", "na", "null"}:
            return None
        try:
            return float(s)
        except ValueError:
            return None
    try:
        f = float(value)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> Optional[int]:
    f = _to_float(value)
    return int(f) if f is not None else None


def _load_csv(
    path: Path,
    mapping: Dict[str, str],
    decimal: str = ".",
    pays_normalize: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"CSV introuvable : {path}")

    df = pd.read_csv(path, encoding="utf-8", decimal=decimal)
    missing = [c for c in mapping if c not in df.columns]
    if missing:
        raise ValueError(
            f"Colonnes manquantes dans {path.name} : {missing}. "
            f"Colonnes trouvées : {list(df.columns)}"
        )

    rows: List[Dict[str, Any]] = []
    for _, r in df.iterrows():
        row: Dict[str, Any] = {}
        for csv_col, db_col in mapping.items():
            val = r[csv_col]
            if db_col == "pays":
                raw_pays = str(val).strip() if pd.notna(val) else None
                if raw_pays and pays_normalize:
                    raw_pays = pays_normalize.get(raw_pays, raw_pays)
                row[db_col] = raw_pays
            elif db_col == "annee":
                row[db_col] = _to_int(val)
            elif db_col == "integration_regionale_score":
                row[db_col] = _to_float(val)
            else:
                row[db_col] = _to_float(val)
        if row.get("pays") and row.get("annee") is not None:
            rows.append(row)
    return rows


def _upsert(session, model, rows: List[Dict[str, Any]], unique_cols: List[str]) -> Dict[str, int]:
    """INSERT ... ON DUPLICATE KEY UPDATE compatible toutes versions MySQL 8.x."""
    if not rows:
        return {"inserted_or_updated": 0}

    table = model.__table__
    update_cols = [c.name for c in table.columns if c.name not in unique_cols + ["id", "created_at"]]

    inserted = 0
    for row in rows:
        stmt = mysql_insert(table).values(**row)
        stmt = stmt.on_duplicate_key_update(
            {c: text(f"VALUES({c})") for c in update_cols}
        )
        session.execute(stmt)
        inserted += 1
    session.commit()
    return {"inserted_or_updated": inserted}


def _seed_ref_pays(session) -> Dict[str, int]:
    table = RefPays.__table__
    update_cols = ["code_iso3", "region", "pays_risque_match"]
    count = 0
    for row in REF_PAYS:
        stmt = mysql_insert(table).values(**row)
        stmt = stmt.on_duplicate_key_update(
            {c: text(f"VALUES({c})") for c in update_cols}
        )
        session.execute(stmt)
        count += 1
    session.commit()
    return {"inserted_or_updated": count}


def _filter_known_countries(rows: List[Dict[str, Any]], known: set) -> List[Dict[str, Any]]:
    kept: List[Dict[str, Any]] = []
    dropped = 0
    for r in rows:
        if r["pays"] in known:
            kept.append(r)
        else:
            dropped += 1
    if dropped:
        print(f"  ⚠  {dropped} lignes ignorées (pays absent de ref_pays)")
    return kept


# ── Entrée principale ────────────────────────────────────────────────────────

def run_seed(data_dir: Optional[str] = None, create_tables: bool = False) -> int:
    """Point d'entrée programmatique (utilisable au démarrage de l'app)."""
    data_dir_path = Path(
        data_dir or os.getenv("EXTERNAL_DATA_DIR", str(REPO_ROOT / "data" / "external"))
    ).resolve()
    return _run(data_dir_path, create_tables)


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed idempotent des données externes marché africain")
    parser.add_argument(
        "--data-dir",
        default=os.getenv("EXTERNAL_DATA_DIR", str(REPO_ROOT / "data" / "external")),
        help="Dossier contenant les 4 CSV (défaut : ./data/external/)",
    )
    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Créer les tables via SQLAlchemy avant seed (si la migration SQL n'a pas été exécutée).",
    )
    args = parser.parse_args()

    return _run(Path(args.data_dir).resolve(), args.create_tables)


def _run(data_dir: Path, create_tables: bool) -> int:
    print(f"📂 Répertoire des CSV : {data_dir}")

    if create_tables:
        print("🛠  Création des tables via SQLAlchemy (create_all)")
        Base.metadata.create_all(bind=engine)

    files = {
        "non_vie": data_dir / "marche_assurance_non_vie_FINAL.csv",
        "vie":     data_dir / "marche_assurance_vie_FINAL.csv",
        "gouv":    data_dir / "wgi_africa_kaopen_FINAL.csv",
        "macro":   data_dir / "africa_eco_integration_FINAL.csv",
    }

    # macro : virgule comme séparateur décimal possible → on teste
    macro_decimal = "."
    try:
        with open(files["macro"], "r", encoding="utf-8") as fh:
            sample = fh.read(2048)
        if sample.count(",") > sample.count(".") * 2:
            macro_decimal = ","
    except FileNotFoundError:
        pass

    print("📥 Lecture des CSV…")
    non_vie_rows = _load_csv(files["non_vie"], NON_VIE_COLS, pays_normalize=MACRO_PAYS_FR_TO_EN)
    vie_rows     = _load_csv(files["vie"],     VIE_COLS, pays_normalize=MACRO_PAYS_FR_TO_EN)
    gouv_rows    = _load_csv(files["gouv"],    GOUV_COLS, pays_normalize=MACRO_PAYS_FR_TO_EN)
    macro_rows   = _load_csv(files["macro"],   MACRO_COLS, decimal=macro_decimal, pays_normalize=MACRO_PAYS_FR_TO_EN)

    print(f"  non_vie : {len(non_vie_rows)} lignes")
    print(f"  vie     : {len(vie_rows)} lignes")
    print(f"  gouv    : {len(gouv_rows)} lignes")
    print(f"  macro   : {len(macro_rows)} lignes (decimal='{macro_decimal}')")

    session = SessionLocal()
    try:
        print("\n🌍 Seed ref_pays…")
        r = _seed_ref_pays(session)
        print(f"  → {r['inserted_or_updated']} pays insérés/mis à jour")

        known = {p["nom_pays"] for p in REF_PAYS}
        non_vie_rows = _filter_known_countries(non_vie_rows, known)
        vie_rows     = _filter_known_countries(vie_rows,     known)
        gouv_rows    = _filter_known_countries(gouv_rows,    known)
        macro_rows   = _filter_known_countries(macro_rows,   known)

        print("\n📊 Seed ext_marche_non_vie…")
        r = _upsert(session, ExtMarcheNonVie, non_vie_rows, ["pays", "annee"])
        print(f"  → {r['inserted_or_updated']} lignes insérées/mises à jour")

        print("📊 Seed ext_marche_vie…")
        r = _upsert(session, ExtMarcheVie, vie_rows, ["pays", "annee"])
        print(f"  → {r['inserted_or_updated']} lignes insérées/mises à jour")

        print("📊 Seed ext_gouvernance…")
        r = _upsert(session, ExtGouvernance, gouv_rows, ["pays", "annee"])
        print(f"  → {r['inserted_or_updated']} lignes insérées/mises à jour")

        print("📊 Seed ext_macroeconomie…")
        r = _upsert(session, ExtMacroeconomie, macro_rows, ["pays", "annee"])
        print(f"  → {r['inserted_or_updated']} lignes insérées/mises à jour")

        print("\n✅ Seed terminé avec succès")
        return 0
    except Exception as exc:
        session.rollback()
        print(f"\n❌ Erreur pendant le seed : {exc}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())