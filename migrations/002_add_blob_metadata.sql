-- Migration: Add blob metadata columns for Azure Blob Storage migration
-- Feature: azure-blob-storage-migration
-- Requirements: 6.1, 6.2, 6.3, 6.4
-- Description: Adds Azure Blob Storage metadata columns to registrasi and
--              pemeriksaan_file tables. Existing path columns (surat_rujukan_path,
--              file_path) are kept untouched for two-phase migration safety.
--              All new columns are nullable to support gradual backfill.

-- ============================================================================
-- UP MIGRATION: Add blob metadata columns + index
-- ============================================================================

-- Add blob metadata columns to registrasi table
-- Existing surat_rujukan_path column is preserved (phase-2 drop in 003)
ALTER TABLE registrasi
  ADD COLUMN IF NOT EXISTS surat_rujukan_blob_name    VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS surat_rujukan_container    VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS surat_rujukan_content_type VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS surat_rujukan_size_bytes   BIGINT       NULL,
  ADD COLUMN IF NOT EXISTS surat_rujukan_sha256       CHAR(64)     NULL;

-- Add blob metadata columns to pemeriksaan_file table
-- Existing file_path column is preserved (phase-2 drop in 003)
ALTER TABLE pemeriksaan_file
  ADD COLUMN IF NOT EXISTS blob_name    VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS container    VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS size_bytes   BIGINT       NULL,
  ADD COLUMN IF NOT EXISTS sha256       CHAR(64)     NULL;

-- Index on blob_name for fast lookup during migration and download flows
CREATE INDEX IF NOT EXISTS idx_pemfile_blob_name ON pemeriksaan_file (blob_name);

-- ============================================================================
-- DOWN MIGRATION: Drop blob metadata columns + index (rollback)
-- ============================================================================

-- Uncomment the following lines to rollback this migration:

-- DROP INDEX IF EXISTS idx_pemfile_blob_name ON pemeriksaan_file;

-- ALTER TABLE pemeriksaan_file
--   DROP COLUMN IF EXISTS sha256,
--   DROP COLUMN IF EXISTS size_bytes,
--   DROP COLUMN IF EXISTS content_type,
--   DROP COLUMN IF EXISTS container,
--   DROP COLUMN IF EXISTS blob_name;

-- ALTER TABLE registrasi
--   DROP COLUMN IF EXISTS surat_rujukan_sha256,
--   DROP COLUMN IF EXISTS surat_rujukan_size_bytes,
--   DROP COLUMN IF EXISTS surat_rujukan_content_type,
--   DROP COLUMN IF EXISTS surat_rujukan_container,
--   DROP COLUMN IF EXISTS surat_rujukan_blob_name;
