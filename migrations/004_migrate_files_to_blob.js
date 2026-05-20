/**
 * Legacy File Migration Script
 * Feature: azure-blob-storage-migration
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 6.5
 *
 * Migrates legacy disk files to Azure Blob Storage.
 *
 * Tables:
 *   pendaftaran      → Container_Rujukan  (surat_rujukan_path → blob)
 *   pemeriksaan_file → Container_Hasil    (file_path → blob)
 *
 * Blob naming: legacy/{entity_id}/{basename}
 * Guard UPDATE: WHERE id=? AND <blob_name_col> IS NULL  (idempotent)
 *
 * Exit codes (standalone mode only):
 *   0 = all ok
 *   1 = fatal init error (DB connect fail / blobService.init() fail)
 *   2 = any per-file failure
 *
 * Usage (standalone):
 *   node migrations/004_migrate_files_to_blob.js
 *
 * Usage (orchestrated by run-migration.js):
 *   import { runMigration004 } from './004_migrate_files_to_blob.js';
 *   await runMigration004(connection);
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, basename, extname } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Load .env from project root (same pattern as run-migration.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import blob service singleton AFTER dotenv loaded
import { blobService } from '../src/services/blob.service.js';

// ============================================================================
// MIME guessing from extension
// ============================================================================

function guessMime(filePath) {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':  return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png':  return 'image/png';
    default:      return 'application/octet-stream';
  }
}

// ============================================================================
// File reading — try as-is, then relative to project root
// ============================================================================

const PROJECT_ROOT = join(__dirname, '..');

async function readFileSafe(filePath) {
  if (existsSync(filePath)) {
    return readFile(filePath);
  }
  const fromRoot = join(PROJECT_ROOT, filePath);
  if (existsSync(fromRoot)) {
    return readFile(fromRoot);
  }
  throw new Error(`File not found: ${filePath} (also tried ${fromRoot})`);
}

// ============================================================================
// Detect "file not present on disk" errors specifically
// (readFileSafe throws this exact prefix; fs ENOENT also covered defensively)
// ============================================================================

function isFileMissingError(err) {
  if (!err || !err.message) return false;
  if (err.code === 'ENOENT') return true;
  return err.message.startsWith('File not found:');
}

// ============================================================================
// Migrate pendaftaran table
// ============================================================================

async function migratePendaftaran(conn) {
  console.log('\n========================================');
  console.log('Migrating table: pendaftaran');
  console.log('========================================\n');

  const [rows] = await conn.query(
    `SELECT id, surat_rujukan_path
     FROM pendaftaran
     WHERE surat_rujukan_path IS NOT NULL
       AND surat_rujukan_blob_name IS NULL`
  );

  console.log(`Found ${rows.length} row(s) to migrate.`);

  let ok = 0;
  let fail = 0;
  let missing = 0;

  for (const row of rows) {
    const { id, surat_rujukan_path } = row;
    try {
      const buffer = await readFileSafe(surat_rujukan_path);
      const sha256 = blobService.constructor.sha256(buffer);
      const base = basename(surat_rujukan_path);
      const blobName = `legacy/${id}/${base}`;
      const contentType = guessMime(surat_rujukan_path);
      const container = blobService.containerReferrals;

      await blobService.upload({
        container,
        blobName,
        buffer,
        contentType,
        originalFilename: base,
      });

      const [result] = await conn.query(
        `UPDATE pendaftaran
         SET surat_rujukan_blob_name    = ?,
             surat_rujukan_container    = ?,
             surat_rujukan_content_type = ?,
             surat_rujukan_size_bytes   = ?,
             surat_rujukan_sha256       = ?
         WHERE id = ?
           AND surat_rujukan_blob_name IS NULL`,
        [blobName, container, contentType, buffer.length, sha256, id]
      );

      if (result.affectedRows === 0) {
        console.log(`  [SKIP] pendaftaran id=${id} already migrated (guard hit)`);
      } else {
        console.log(`  [OK]   pendaftaran id=${id} → ${container}/${blobName}`);
      }
      ok++;
    } catch (err) {
      if (isFileMissingError(err)) {
        // Source file gone from disk — unrecoverable. Mark blob_name with a
        // sentinel so the residue check (blob_name IS NULL) passes and
        // migration 003 can drop the path column. Path stays as-is (NOT NULL).
        const sentinelBlobName = `__missing__/${id}/${basename(surat_rujukan_path)}`;
        await conn.query(
          `UPDATE pendaftaran
           SET surat_rujukan_blob_name    = ?,
               surat_rujukan_container    = ?,
               surat_rujukan_content_type = NULL,
               surat_rujukan_size_bytes   = NULL,
               surat_rujukan_sha256       = NULL
           WHERE id = ?
             AND surat_rujukan_blob_name IS NULL`,
          [sentinelBlobName, '__missing__', id]
        );
        console.warn(`  [MISSING] pendaftaran id=${id} path=${surat_rujukan_path} (file absent on disk — sentinel set)`);
        missing++;
      } else {
        console.error(`  [FAIL] pendaftaran id=${id} path=${surat_rujukan_path}: ${err.message}`);
        fail++;
      }
    }
  }

  console.log(`\npendaftaran summary: ok=${ok} missing=${missing} fail=${fail}`);
  return { ok, fail, missing };
}

// ============================================================================
// Migrate pemeriksaan_file table
// ============================================================================

async function migratePemeriksaanFile(conn) {
  console.log('\n========================================');
  console.log('Migrating table: pemeriksaan_file');
  console.log('========================================\n');

  const [rows] = await conn.query(
    `SELECT id, pemeriksaan_id, file_path
     FROM pemeriksaan_file
     WHERE file_path IS NOT NULL
       AND blob_name IS NULL`
  );

  console.log(`Found ${rows.length} row(s) to migrate.`);

  let ok = 0;
  let fail = 0;
  let missing = 0;

  for (const row of rows) {
    const { id, pemeriksaan_id, file_path } = row;
    try {
      const buffer = await readFileSafe(file_path);
      const sha256 = blobService.constructor.sha256(buffer);
      const base = basename(file_path);
      const blobName = `legacy/${pemeriksaan_id}/${base}`;
      const contentType = guessMime(file_path);
      const container = blobService.containerExams;

      await blobService.upload({
        container,
        blobName,
        buffer,
        contentType,
        originalFilename: base,
      });

      const [result] = await conn.query(
        `UPDATE pemeriksaan_file
         SET blob_name    = ?,
             container    = ?,
             content_type = ?,
             size_bytes   = ?,
             sha256       = ?
         WHERE id = ?
           AND blob_name IS NULL`,
        [blobName, container, contentType, buffer.length, sha256, id]
      );

      if (result.affectedRows === 0) {
        console.log(`  [SKIP] pemeriksaan_file id=${id} already migrated (guard hit)`);
      } else {
        console.log(`  [OK]   pemeriksaan_file id=${id} pemeriksaan_id=${pemeriksaan_id} → ${container}/${blobName}`);
      }
      ok++;
    } catch (err) {
      if (isFileMissingError(err)) {
        // Source file gone — sentinel blob_name to clear residue
        const sentinelBlobName = `__missing__/${pemeriksaan_id}/${basename(file_path)}`;
        await conn.query(
          `UPDATE pemeriksaan_file
           SET blob_name    = ?,
               container    = ?,
               content_type = NULL,
               size_bytes   = NULL,
               sha256       = NULL
           WHERE id = ?
             AND blob_name IS NULL`,
          [sentinelBlobName, '__missing__', id]
        );
        console.warn(`  [MISSING] pemeriksaan_file id=${id} path=${file_path} (file absent on disk — sentinel set)`);
        missing++;
      } else {
        console.error(`  [FAIL] pemeriksaan_file id=${id} path=${file_path}: ${err.message}`);
        fail++;
      }
    }
  }

  console.log(`\npemeriksaan_file summary: ok=${ok} missing=${missing} fail=${fail}`);
  return { ok, fail, missing };
}

// ============================================================================
// Exported entry point — used by run-migration.js
// Caller owns the DB connection. Throws on any per-file failure.
// ============================================================================

export async function runMigration004(connection) {
  if (!blobService.client) {
    await blobService.init();
    console.log('[004] blobService initialized');
  }

  let anyFailure = false;

  const regResult = await migratePendaftaran(connection);
  if (regResult.fail > 0) anyFailure = true;

  const pemResult = await migratePemeriksaanFile(connection);
  if (pemResult.fail > 0) anyFailure = true;

  console.log('\n========================================');
  console.log('MIGRATION 004 COMPLETE');
  console.log(`  pendaftaran:      ok=${regResult.ok} missing=${regResult.missing} fail=${regResult.fail}`);
  console.log(`  pemeriksaan_file: ok=${pemResult.ok} missing=${pemResult.missing} fail=${pemResult.fail}`);
  console.log('========================================\n');

  if (anyFailure) {
    throw new Error('[004] One or more files failed to migrate (real errors, not missing files). Check logs above.');
  }
}

// ============================================================================
// Standalone entry point — only fires when invoked directly
// ============================================================================

async function main() {
  let connection;
  let anyFailure = false;

  try {
    await blobService.init();
    console.log('[004] blobService initialized');
  } catch (err) {
    console.error('[004] FATAL: blobService.init() failed:', err.message);
    process.exit(1);
  }

  try {
    connection = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl:      { rejectUnauthorized: true },
    });
    console.log('[004] DB connection established');
  } catch (err) {
    console.error('[004] FATAL: DB connection failed:', err.message);
    process.exit(1);
  }

  try {
    const regResult = await migratePendaftaran(connection);
    if (regResult.fail > 0) anyFailure = true;

    const pemResult = await migratePemeriksaanFile(connection);
    if (pemResult.fail > 0) anyFailure = true;

    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log(`  pendaftaran:      ok=${regResult.ok} missing=${regResult.missing} fail=${regResult.fail}`);
    console.log(`  pemeriksaan_file: ok=${pemResult.ok} missing=${pemResult.missing} fail=${pemResult.fail}`);
    console.log('========================================\n');

  } catch (err) {
    console.error('[004] FATAL: unexpected error during migration:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('[004] DB connection closed');
    }
  }

  process.exit(anyFailure ? 2 : 0);
}

// Only run main() when invoked directly, not when imported as a module
const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main();
}
