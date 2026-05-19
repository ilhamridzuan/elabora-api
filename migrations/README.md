# Database Migrations

This directory contains database migration scripts for the eLabora API.

## Migration 001: Add Patient Search Indexes

**Feature:** patient-search-optimization  
**Requirements:** 1.1, 1.2, 1.3, 1.4, 1.5

This migration adds database indexes to the `pasien` table to optimize patient search queries.

### Indexes Created

| Index Name | Table | Column | Purpose |
|------------|-------|--------|---------|
| `idx_pasien_nama` | pasien | nama | Case-insensitive partial name search |
| `idx_pasien_nik` | pasien | nik | NIK prefix search |
| `idx_pasien_no_telepon` | pasien | no_telepon | Phone number prefix search |
| `idx_pasien_tgl_lahir` | pasien | tgl_lahir | Date of birth range filtering |
| `idx_pasien_created_at` | pasien | created_at | Registration date range filtering |

---

## Migration 002: Add Blob Metadata Columns

**Feature:** azure-blob-storage-migration  
**Requirements:** 6.1, 6.2, 6.3

Adds Azure Blob Storage metadata columns to `registrasi` and `pemeriksaan_file` tables. Existing path columns (`surat_rujukan_path`, `file_path`) are preserved for two-phase migration safety. All new columns are nullable to support gradual backfill.

### Columns Added

**Table: `registrasi`**

| Column | Type | Purpose |
|--------|------|---------|
| `surat_rujukan_blob_name` | VARCHAR(512) NULL | Blob path in Azure container |
| `surat_rujukan_container` | VARCHAR(128) NULL | Azure container name |
| `surat_rujukan_content_type` | VARCHAR(128) NULL | MIME type of uploaded file |
| `surat_rujukan_size_bytes` | BIGINT NULL | File size in bytes |
| `surat_rujukan_sha256` | CHAR(64) NULL | SHA-256 hex digest for integrity |

**Table: `pemeriksaan_file`**

| Column | Type | Purpose |
|--------|------|---------|
| `blob_name` | VARCHAR(512) NULL | Blob path in Azure container |
| `container` | VARCHAR(128) NULL | Azure container name |
| `content_type` | VARCHAR(128) NULL | MIME type of uploaded file |
| `size_bytes` | BIGINT NULL | File size in bytes |
| `sha256` | CHAR(64) NULL | SHA-256 hex digest for integrity |

**Index:** `idx_pemfile_blob_name` on `pemeriksaan_file(blob_name)` — fast lookup during migration and download flows.

---

## Migration 003: Drop Legacy Path Columns

**Feature:** azure-blob-storage-migration  
**Requirements:** 6.5, 7.7

Drops the legacy local-disk path columns (`surat_rujukan_path`, `file_path`) from `registrasi` and `pemeriksaan_file` after all files have been migrated to Azure Blob Storage.

> ⚠️ **WARNING: IRREVERSIBLE.** Data stored in path columns is permanently lost after this migration runs. Rollback restores column structure only — path values cannot be recovered.

### Columns Dropped

| Table | Column | Reason |
|-------|--------|--------|
| `registrasi` | `surat_rujukan_path` | Replaced by `surat_rujukan_blob_name` |
| `pemeriksaan_file` | `file_path` | Replaced by `blob_name` |

### Prerequisites

**MUST run after migration 004 (`migrate_files_to_blob`) is verified complete.**

Before running migration 003:
1. Run `node migrations/004_migrate_files_to_blob.js` and confirm `fail=0`
2. Run `node migrations/check_legacy_path_residue.js` — must exit 0
3. The runner calls `assertNoLegacyResidue()` automatically as a final guard — migration aborts if any residue found

### Residue Guard

Migration 003 calls `assertNoLegacyResidue()` from `check_legacy_path_residue.js` **before** executing any SQL. If any rows still have a path set but no `blob_name`, the migration refuses to run and exits with an error.

---

## Running Migrations

### Option 1: Using JavaScript Runner (Recommended)

Idempotent runner with INFORMATION_SCHEMA checks — safe to run multiple times.

```bash
# Apply all migrations (001 + 002 + 003)
node migrations/run-migration.js up

# Apply a specific migration only
node migrations/run-migration.js up 001
node migrations/run-migration.js up 002
node migrations/run-migration.js up 003   # drops legacy path columns (run after 004 verified)

# Rollback all migrations (003 first, then 002, then 001)
node migrations/run-migration.js down

# Rollback a specific migration only
node migrations/run-migration.js down 003
node migrations/run-migration.js down 002
node migrations/run-migration.js down 001
```

**Features:**
- Idempotent: safe to run multiple times
- 001: checks if indexes already exist before creating
- 002: checks INFORMATION_SCHEMA before adding columns or index
- 003: calls `assertNoLegacyResidue()` before dropping — aborts if residue found
- Detailed output for each operation
- Uses environment variables from `.env` file

### Option 2: Using SQL Files Directly

```bash
# Apply migration 001
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/001_add_patient_search_indexes.sql

# Apply migration 002
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/002_add_blob_metadata.sql

# Apply migration 003 (verify residue manually first — no guard in raw SQL mode)
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/003_drop_legacy_paths.sql
```

> Note: SQL files use `IF NOT EXISTS` / `DROP COLUMN IF EXISTS` for idempotency. When running 003 via raw SQL, manually run `check_legacy_path_residue.js` first — the residue guard only runs automatically via the JS runner.

---

## Verification

After running migration 001:

```sql
SHOW INDEX FROM pasien;
```

After running migration 002:

```sql
SHOW COLUMNS FROM registrasi LIKE 'surat_rujukan_%';
SHOW COLUMNS FROM pemeriksaan_file LIKE 'blob_%';
SHOW COLUMNS FROM pemeriksaan_file LIKE 'container';
SHOW INDEX FROM pemeriksaan_file WHERE Key_name = 'idx_pemfile_blob_name';
```

After running migration 003:

```sql
-- Both queries should return empty result set (columns dropped)
SHOW COLUMNS FROM registrasi LIKE 'surat_rujukan_path';
SHOW COLUMNS FROM pemeriksaan_file LIKE 'file_path';
```

---

## Rollback

```bash
# Rollback migration 003 (restore legacy path columns — schema only, data lost)
node migrations/run-migration.js down 003

# Rollback migration 002 (blob columns)
node migrations/run-migration.js down 002

# Rollback migration 001 (search indexes)
node migrations/run-migration.js down 001

# Rollback all (003 → 002 → 001)
node migrations/run-migration.js down
```

---

## Notes

- Migration 002 preserves existing `surat_rujukan_path` and `file_path` columns — phase-2 drop handled by `003_drop_legacy_paths.sql`
- Migration 003 MUST run only after migration 004 (`migrate_files_to_blob`) is verified complete with `fail=0`
- Migration 003 is guarded by `assertNoLegacyResidue()` — refuses to drop if any rows still have path set but no blob_name
- ⚠️ Migration 003 is **irreversible** — path column data is permanently lost after drop; rollback restores schema only
- All other migrations are non-destructive on `up` (no data modified, only schema additions)
- Safe to run on production databases (MySQL 8+ / MariaDB — uses `DROP COLUMN IF EXISTS`)
