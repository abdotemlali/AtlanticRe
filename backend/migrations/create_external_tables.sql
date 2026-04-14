-- =============================================================================
-- Atlantic Re — Migration : Tables données externes (marché africain)
-- =============================================================================
-- Crée 1 table de référence (ref_pays) + 4 tables de données externes.
-- Exécution : mysql -u <user> -p <dbname> < create_external_tables.sql
-- Idempotent : CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ref_pays : table de référence des 34 pays africains
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_pays (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nom_pays            VARCHAR(100) NOT NULL,
    code_iso3           CHAR(3),
    region              VARCHAR(50),
    pays_risque_match   VARCHAR(100),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ref_pays_nom (nom_pays),
    KEY ix_ref_pays_iso3 (code_iso3),
    KEY ix_ref_pays_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ext_marche_non_vie : marché assurance non-vie
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ext_marche_non_vie (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    pays                    VARCHAR(100) NOT NULL,
    annee                   SMALLINT NOT NULL,
    primes_emises_mn_usd    FLOAT NULL,
    croissance_primes_pct   FLOAT NULL,
    taux_penetration_pct    FLOAT NULL,
    ratio_sp_pct            FLOAT NULL,
    densite_assurance_usd   FLOAT NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ext_non_vie_pays_annee (pays, annee),
    KEY ix_ext_non_vie_annee (annee),
    CONSTRAINT fk_ext_non_vie_pays
        FOREIGN KEY (pays) REFERENCES ref_pays(nom_pays)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ext_marche_vie : marché assurance vie
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ext_marche_vie (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    pays                    VARCHAR(100) NOT NULL,
    annee                   SMALLINT NOT NULL,
    primes_emises_mn_usd    FLOAT NULL,
    croissance_primes_pct   FLOAT NULL,
    taux_penetration_pct    FLOAT NULL,
    densite_assurance_usd   FLOAT NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ext_vie_pays_annee (pays, annee),
    KEY ix_ext_vie_annee (annee),
    CONSTRAINT fk_ext_vie_pays
        FOREIGN KEY (pays) REFERENCES ref_pays(nom_pays)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ext_gouvernance : indicateurs WGI + kaopen (ouverture financière)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ext_gouvernance (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    pays                 VARCHAR(100) NOT NULL,
    annee                SMALLINT NOT NULL,
    fdi_inflows_pct_gdp  FLOAT NULL,
    political_stability  FLOAT NULL,
    regulatory_quality   FLOAT NULL,
    kaopen               FLOAT NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ext_gouv_pays_annee (pays, annee),
    KEY ix_ext_gouv_annee (annee),
    CONSTRAINT fk_ext_gouv_pays
        FOREIGN KEY (pays) REFERENCES ref_pays(nom_pays)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ext_macroeconomie : indicateurs macroéconomiques
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ext_macroeconomie (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    pays                 VARCHAR(100) NOT NULL,
    annee                SMALLINT NOT NULL,
    gdp_growth_pct       FLOAT NULL,
    current_account_mn   FLOAT NULL,
    exchange_rate        FLOAT NULL,
    gdp_per_capita       FLOAT NULL,
    gdp_mn               FLOAT NULL,
    inflation_rate_pct   FLOAT NULL,
    integration_regionale_rank SMALLINT NULL COMMENT 'Rang intégration régionale africaine (1=mieux intégré)',
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ext_macro_pays_annee (pays, annee),
    KEY ix_ext_macro_annee (annee),
    CONSTRAINT fk_ext_macro_pays
        FOREIGN KEY (pays) REFERENCES ref_pays(nom_pays)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
