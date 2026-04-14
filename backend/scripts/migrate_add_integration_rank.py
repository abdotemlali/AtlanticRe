"""
Script de migration : ajoute la colonne integration_regionale_rank a ext_macroeconomie.
Usage : python backend/scripts/migrate_add_integration_rank.py
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.database import engine  # noqa: E402
from sqlalchemy import text  # noqa: E402

CHECK_SQL = """
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ext_macroeconomie'
      AND COLUMN_NAME  = 'integration_regionale_rank'
"""

ALTER_SQL = """
    ALTER TABLE ext_macroeconomie
    ADD COLUMN integration_regionale_rank SMALLINT NULL
"""

def main() -> int:
    with engine.connect() as conn:
        result = conn.execute(text(CHECK_SQL)).fetchone()
        col_count = result[0]
        print(f"Column existence check: {col_count}")

        if col_count == 0:
            print("Adding column integration_regionale_rank to ext_macroeconomie ...")
            conn.execute(text(ALTER_SQL))
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column already present, no action needed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
