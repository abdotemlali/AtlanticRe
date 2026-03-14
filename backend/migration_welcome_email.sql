-- Script à exécuter dans votre client MySQL (ex: phpMyAdmin, DBeaver)
-- Ce script ajoute la colonne `must_change_password` nécessaire
-- au nouveau flux de création de compte.

USE reinsurance;

ALTER TABLE users
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Les utilisateurs existants auront False et ne seront pas impactés.
