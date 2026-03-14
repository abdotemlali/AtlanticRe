-- Script à exécuter dans votre client MySQL (ex: phpMyAdmin, DBeaver)
-- Ce script ajoute les nouvelles colonnes nécessaires au flux de 
-- réinitialisation de mot de passe à la table existante "users".

USE reinsurance;

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(128) NULL,
  ADD COLUMN reset_token_expiry DATETIME NULL,
  ADD COLUMN token_version INT NOT NULL DEFAULT 0;

-- La colonne "token_version" permet d'invalider tous les JWT actifs
-- associés à un compte dès que le mot de passe est réinitialisé.
