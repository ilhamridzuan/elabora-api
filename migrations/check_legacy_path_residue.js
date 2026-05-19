/**
 * Legacy Path Residue Guard
 * Feature: azure-blob-storage-migration
 * Requirements: 6.5, 7.7
 *
 * Queries pendaftaran and pemeriksaan_file for rows that still have a legacy
 * path column set but no blob_name yet. If any such rows exist, the drop
 * migration MUST NOT run — this script exits with code 1 to block it.
 *
 * Exported function:
 *   assertNoLegacyResidue(connection?) → Promise<void>
 *     Throws if residue found. Accepts optional existing connection; if omitted,
 *     opens and closes its own connection.
 *
 * Standalone usage:
 *   node migrations/check_legacy_path_residue.js
 *
 * Exit codes:
 *   0 = no residue — safe to drop legacy columns
 *   1 = residue found OR fatal DB error — refuse drop
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// ============================================================================
// Core check logic
// ============================================================================

/**
 * Count residue rows in pendaftaran (path set, blob_name null).
 * @param {import('mysql2/promise').Connection} conn
 * @returns {Promise<number>}
 */
async function countPendaftaranResidue(conn) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM pendaftaran
     WHERE surat_rujukan_path IS NOT NULL
       AND surat_rujukan_blob_name IS NULL`
  );
  return Number(row.cnt);
}

/**
 * Count residue rows in pemeriksaan_file (path set, blob_name null).
 * @param {import('mysql2/promise').Connection} conn
 * @returns {Promise<number>}
 */
async function countPemeriksaanFileResidue(conn) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM pemeriksaan_file
     WHERE file_path IS NOT NULL
       AND blob_name IS NULL`
  );
  return Number(row.cnt);
}

// ============================================================================
// Exported guard function
// ============================================================================

/**
 * Assert no legacy path residue exists in either table.
 *
 * If an existing `connection` is passed, uses it (does NOT close it).
 * If omitted, opens a new connection and closes it after the check.
 *
 * Throws an Error (with descriptive message) if residue is found.
 * Resolves void if all clear.
 *
 * @param {import('mysql2/promise').Connection} [existingConnection]
 * @returns {Promise<void>}
 */
export async function assertNoLegacyResidue(existingConnection) {
  const ownConnection = !existingConnection;
  let conn = existingConnection;

  if (ownConnection) {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
  }

  try {
    const [pendaftaranCount, pemeriksaanCount] = await Promise.all([
      countPendaftaranResidue(conn),
      countPemeriksaanFileResidue(conn),
    ]);

    const total = pendaftaranCount + pemeriksaanCount;

    if (total > 0) {
      const msg =
        `[check_legacy_path_residue] RESIDUE DETECTED — legacy path columns still in use.\n` +
        `  pendaftaran (surat_rujukan_path set, blob_name null):  ${pendaftaranCount} row(s)\n` +
        `  pemeriksaan_file (file_path set, blob_name null):      ${pemeriksaanCount} row(s)\n` +
        `  Total: ${total} row(s)\n` +
        `  ACTION REQUIRED: Run migration 004 (migrate_files_to_blob) and verify all rows\n` +
        `  have blob_name populated before dropping legacy path columns.`;
      throw new Error(msg);
    }

    console.log(
      '[check_legacy_path_residue] OK — no residue found. Safe to drop legacy path columns.'
    );
  } finally {
    if (ownConnection && conn) {
      await conn.end();
    }
  }
}

// ============================================================================
// Standalone entry point
// ============================================================================

async function main() {
  let conn;

  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    console.log('[check_legacy_path_residue] DB connection established');
  } catch (err) {
    console.error('[check_legacy_path_residue] FATAL: DB connection failed:', err.message);
    process.exit(1);
  }

  try {
    await assertNoLegacyResidue(conn);
    // assertNoLegacyResidue logs success itself
    process.exit(0);
  } catch (err) {
    console.error('\n[check_legacy_path_residue] ERROR:\n' + err.message);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
      console.log('[check_legacy_path_residue] DB connection closed');
    }
  }
}

// Run only when invoked directly (not imported)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
