-- =============================================================================
-- Atlantic Re — Migration : Ajout colonne integration_regionale_rank
-- =============================================================================
-- À exécuter sur les bases existantes (bases déjà créées via create_external_tables.sql).
-- Idempotent : ne fait rien si la colonne existe déjà (MySQL 8+).
-- Exécution : mysql -u <user> -p <dbname> < add_integration_rank_to_macroeconomie.sql
-- =============================================================================

-- Ajouter la colonne si elle n'existe pas déjà
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ext_macroeconomie'
      AND COLUMN_NAME  = 'integration_regionale_rank'
);

SET @alter_stmt = IF(
    @col_exists = 0,
    'ALTER TABLE ext_macroeconomie
       ADD COLUMN integration_regionale_rank SMALLINT NULL
       COMMENT ''Rang intégration régionale africaine (1 = mieux intégré, source : africa_eco_integration_FINAL.csv)''
       AFTER inflation_rate_pct',
    'SELECT ''Colonne integration_regionale_rank déjà présente — aucune action.'' AS info'
);

PREPARE stmt FROM @alter_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
