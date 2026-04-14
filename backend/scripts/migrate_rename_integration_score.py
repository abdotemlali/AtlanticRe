"""
Migration : renomme integration_regionale_rank -> integration_regionale_score
             et change le type SMALLINT -> FLOAT.
Usage : python backend/scripts/migrate_rename_integration_score.py
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.database import engine  # noqa
from sqlalchemy import text       # noqa


def col_exists(conn, table: str, col: str) -> bool:
    sql = text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "  AND TABLE_NAME   = :t "
        "  AND COLUMN_NAME  = :c"
    )
    return conn.execute(sql, {"t": table, "c": col}).scalar() > 0


def main() -> int:
    with engine.connect() as conn:
        has_rank  = col_exists(conn, "ext_macroeconomie", "integration_regionale_rank")
        has_score = col_exists(conn, "ext_macroeconomie", "integration_regionale_score")

        print(f"integration_regionale_rank  exists: {has_rank}")
        print(f"integration_regionale_score exists: {has_score}")

        if has_rank and not has_score:
            # Rename + retype SMALLINT -> FLOAT
            print("Renaming integration_regionale_rank -> integration_regionale_score (FLOAT)...")
            conn.execute(text(
                "ALTER TABLE ext_macroeconomie "
                "CHANGE COLUMN integration_regionale_rank "
                "integration_regionale_score FLOAT NULL"
            ))
            conn.commit()
            print("Done.")
        elif not has_rank and not has_score:
            # Fresh add
            print("Adding new column integration_regionale_score (FLOAT)...")
            conn.execute(text(
                "ALTER TABLE ext_macroeconomie "
                "ADD COLUMN integration_regionale_score FLOAT NULL"
            ))
            conn.commit()
            print("Done.")
        else:
            print("Column integration_regionale_score already present. No action needed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
