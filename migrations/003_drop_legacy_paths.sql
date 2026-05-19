-- Migration 003: Drop legacy path columns
-- Feature: azure-blob-storage-migration
-- Requirements: 6.5, 7.7
--
-- Description: Drops legacy local-disk path columns from pendaftaran and
--              pemeriksaan_file after all files have been migrated to Azure
--              Blob Storage (migration 004 verified complete).
--
-- PREREQUISITE: Run migration 004 (migrate_files_to_blob) first and verify
--               ALL rows have blob_name populated. Use check_legacy_path_residue.js
--               to confirm zero residue before executing this migration.
--
-- WARNING: This migration is IRREVERSIBLE. Data stored in path columns will be
--          permanently lost. Ensure blob migration is fully verified before running.

-- ============================================================================
-- UP MIGRATION: Drop legacy path columns
-- ============================================================================

-- Drop legacy surat_rujukan_path from pendaftaran
-- (blob metadata columns surat_rujukan_blob_name etc. remain)
ALTER TABLE pendaftaran
  DROP COLUMN IF EXISTS surat_rujukan_path;

-- Drop legacy file_path from pemeriksaan_file
-- (blob metadata columns blob_name etc. remain)
ALTER TABLE pemeriksaan_file
  DROP COLUMN IF EXISTS file_path;

-- ============================================================================
-- DOWN MIGRATION: Restore legacy path columns (rollback)
-- ============================================================================
-- NOTE: Restoring columns does NOT restore data — path values are permanently
--       lost after this migration runs. Rollback only restores schema structure.

-- Uncomment to rollback:

-- ALTER TABLE pendaftaran
--   ADD COLUMN IF NOT EXISTS surat_rujukan_path VARCHAR(255) NOT NULL;

-- ALTER TABLE pemeriksaan_file
--   ADD COLUMN IF NOT EXISTS file_path VARCHAR(255) NOT NULL;
