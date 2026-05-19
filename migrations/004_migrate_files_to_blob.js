/**
 * Legacy File Migration Script
 * Feature: azure-blob-storage-migration
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 6.5
 *
 * Migrates legacy disk files to Azure Blob Storage.
 *
 * Tables:
 *   registrasi       → Container_Rujukan  (surat_rujukan_path → blob)
 *   pemeriksaan_file → Container_Hasil    (file_path → blob)
 *
 * Blob naming: legacy/{entity_id}/{basename}
 * Guard UPDATE: WHERE id=? AND <blob_name_col> IS NULL  (idempotent)
 *
 * Exit codes:
 *   0 = all ok
 *   1 = fatal init error (DB connect fail / blobService.init() fail)
 *   2 = any per-file failure
 *
 * Usage:
 *   node migrations/004_migrate_files_to_blob.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
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

/**
 * Guess MIME type from file extension.
 * @param {string} filePath
 * @returns {string}
 */
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

/**
 * Read file buffer. Try path as-is first, then relative to project root.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
async function readFileSafe(filePath) {
  // Try as-is (absolute or relative to cwd)
  if (existsSync(filePath)) {
    return readFile(filePath);
  }
  // Try relative to project root
  const fromRoot = join(PROJECT_ROOT, filePath);
  if (existsSync(fromRoot)) {
    return readFile(fromRoot);
  }
  throw new Error(`File not found: ${filePath} (also tried ${fromRoot})`);
}

// ============================================================================
// Migrate registrasi table
// ============================================================================

/**
 * Migrate all registrasi rows with surat_rujukan_path set but no blob yet.
 * @param {import('mysql2/promise').Connection} conn
 * @returns {Promise<{ok: number, fail: number}>}
 */
async function migrateRegistrasi(conn) {
  console.log('\n========================================');
  console.log('Migrating table: registrasi');
  console.log('========================================\n');

  const [rows] = await conn.query(
    `SELECT id, surat_rujukan_path
     FROM registrasi
     WHERE surat_rujukan_path IS NOT NULL
       AND surat_rujukan_blob_name IS NULL`
  );

  console.log(`Found ${rows.length} row(s) to migrate.`);

  let ok = 0;
  let fail = 0;

  for (const row of rows) {
    const { id, surat_rujukan_path } = row;
    try {
      // Read file from disk
      const buffer = await readFileSafe(surat_rujukan_path);

      // Compute sha256
      const sha256 = blobService.constructor.sha256(buffer);

      // Build blob name
      const base = basename(surat_rujukan_path);
      const blobName = `legacy/${id}/${base}`;

      // Guess MIME
      const contentType = guessMime(surat_rujukan_path);

      // Upload to Azure Blob Storage
      const container = blobService.containerReferrals;
      await blobService.upload({
        container,
        blobName,
        buffer,
        contentType,
        originalFilename: base,
      });

      // UPDATE row — guarded by blob_name IS NULL (idempotent)
      const [result] = await conn.query(
        `UPDATE registrasi
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
        // Row already updated by concurrent run — idempotent, count as ok
        console.log(`  [SKIP] registrasi id=${id} already migrated (guard hit)`);
      } else {
        console.log(`  [OK]   registrasi id=${id} → ${container}/${blobName}`);
      }
      ok++;
    } catch (err) {
      console.error(`  [FAIL] registrasi id=${id} path=${surat_rujukan_path}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nregistrasi summary: ok=${ok} fail=${fail}`);
  return { ok, fail };
}

// ============================================================================
// Migrate pemeriksaan_file table
// ============================================================================

/**
 * Migrate all pemeriksaan_file rows with file_path set but no blob yet.
 * @param {import('mysql2/promise').Connection} conn
 * @returns {Promise<{ok: number, fail: number}>}
 */
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

  for (const row of rows) {
    const { id, pemeriksaan_id, file_path } = row;
    try {
      // Read file from disk
      const buffer = await readFileSafe(file_path);

      // Compute sha256
      const sha256 = blobService.constructor.sha256(buffer);

      // Build blob name
      const base = basename(file_path);
      const blobName = `legacy/${pemeriksaan_id}/${base}`;

      // Guess MIME
      const contentType = guessMime(file_path);

      // Upload to Azure Blob Storage
      const container = blobService.containerExams;
      await blobService.upload({
        container,
        blobName,
        buffer,
        contentType,
        originalFilename: base,
      });

      // UPDATE row — guarded by blob_name IS NULL (idempotent)
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
      console.error(`  [FAIL] pemeriksaan_file id=${id} path=${file_path}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\npemeriksaan_file summary: ok=${ok} fail=${fail}`);
  return { ok, fail };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  let connection;
  let anyFailure = false;

  // ── Fatal init: blobService ──────────────────────────────────────────────
  try {
    await blobService.init();
    console.log('[004] blobService initialized');
  } catch (err) {
    console.error('[004] FATAL: blobService.init() failed:', err.message);
    process.exit(1);
  }

  // ── Fatal init: DB connection ────────────────────────────────────────────
  try {
    connection = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    console.log('[004] DB connection established');
  } catch (err) {
    console.error('[004] FATAL: DB connection failed:', err.message);
    process.exit(1);
  }

  try {
    // ── Migrate registrasi ─────────────────────────────────────────────────
    const regResult = await migrateRegistrasi(connection);
    if (regResult.fail > 0) anyFailure = true;

    // ── Migrate pemeriksaan_file ───────────────────────────────────────────
    const pemResult = await migratePemeriksaanFile(connection);
    if (pemResult.fail > 0) anyFailure = true;

    // ── Final summary ──────────────────────────────────────────────────────
    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log(`  registrasi:       ok=${regResult.ok} fail=${regResult.fail}`);
    console.log(`  pemeriksaan_file: ok=${pemResult.ok} fail=${pemResult.fail}`);
    console.log('========================================\n');

  } catch (err) {
    // Unexpected fatal error during migration loop
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

main();
