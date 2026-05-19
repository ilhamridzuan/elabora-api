-- Migration: Add indexes for patient search optimization
-- Feature: patient-search-optimization
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
-- Description: Creates indexes on pasien table columns to optimize search queries

-- ============================================================================
-- UP MIGRATION: Create indexes
-- ============================================================================

-- Index on nama column for case-insensitive partial name search
CREATE INDEX IF NOT EXISTS idx_pasien_nama ON pasien(nama);

-- Index on nik column for NIK prefix search
CREATE INDEX IF NOT EXISTS idx_pasien_nik ON pasien(nik);

-- Index on no_telepon column for phone number prefix search
CREATE INDEX IF NOT EXISTS idx_pasien_no_telepon ON pasien(no_telepon);

-- Index on tgl_lahir column for date of birth range filtering
CREATE INDEX IF NOT EXISTS idx_pasien_tgl_lahir ON pasien(tgl_lahir);

-- Index on created_at column for registration date range filtering
CREATE INDEX IF NOT EXISTS idx_pasien_created_at ON pasien(created_at);

-- ============================================================================
-- DOWN MIGRATION: Drop indexes (rollback)
-- ============================================================================

-- Uncomment the following lines to rollback this migration:

-- DROP INDEX IF EXISTS idx_pasien_nama ON pasien;
-- DROP INDEX IF EXISTS idx_pasien_nik ON pasien;
-- DROP INDEX IF EXISTS idx_pasien_no_telepon ON pasien;
-- DROP INDEX IF EXISTS idx_pasien_tgl_lahir ON pasien;
-- DROP INDEX IF EXISTS idx_pasien_created_at ON pasien;
