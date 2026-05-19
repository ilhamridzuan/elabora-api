/**
 * Migration Runner Script
 * Features: patient-search-optimization, azure-blob-storage-migration
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.5, 7.7
 *
 * Applies database migrations in sequence with idempotency checks.
 *
 * Usage:
 *   node migrations/run-migration.js up    # Apply all migrations
 *   node migrations/run-migration.js down  # Rollback all migrations
 *   node migrations/run-migration.js up 001   # Apply specific migration
 *   node migrations/run-migration.js up 002   # Apply specific migration
 *   node migrations/run-migration.js up 003   # Apply specific migration
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { assertNoLegacyResidue } from './check_legacy_path_residue.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Migration configuration
const INDEXES = [
  {
    name: 'idx_pasien_nama',
    table: 'pasien',
    column: 'nama',
    description: 'Index for case-insensitive partial name search'
  },
  {
    name: 'idx_pasien_nik',
    table: 'pasien',
    column: 'nik',
    description: 'Index for NIK prefix search'
  },
  {
    name: 'idx_pasien_no_telepon',
    table: 'pasien',
    column: 'no_telepon',
    description: 'Index for phone number prefix search'
  },
  {
    name: 'idx_pasien_tgl_lahir',
    table: 'pasien',
    column: 'tgl_lahir',
    description: 'Index for date of birth range filtering'
  },
  {
    name: 'idx_pasien_created_at',
    table: 'pasien',
    column: 'created_at',
    description: 'Index for registration date range filtering'
  }
];

// ============================================================================
// Migration 002: Blob metadata columns
// Feature: azure-blob-storage-migration
// Requirements: 6.1, 6.2, 6.3
// ============================================================================

const BLOB_COLUMNS_REGISTRASI = [
  { column: 'surat_rujukan_blob_name',    definition: 'VARCHAR(512) NULL' },
  { column: 'surat_rujukan_container',    definition: 'VARCHAR(128) NULL' },
  { column: 'surat_rujukan_content_type', definition: 'VARCHAR(128) NULL' },
  { column: 'surat_rujukan_size_bytes',   definition: 'BIGINT NULL' },
  { column: 'surat_rujukan_sha256',       definition: 'CHAR(64) NULL' }
];

const BLOB_COLUMNS_PEMERIKSAAN_FILE = [
  { column: 'blob_name',    definition: 'VARCHAR(512) NULL' },
  { column: 'container',    definition: 'VARCHAR(128) NULL' },
  { column: 'content_type', definition: 'VARCHAR(128) NULL' },
  { column: 'size_bytes',   definition: 'BIGINT NULL' },
  { column: 'sha256',       definition: 'CHAR(64) NULL' }
];

/**
 * Check if a column exists on a table via INFORMATION_SCHEMA
 */
async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

/**
 * Add a column to a table if it does not already exist (idempotent)
 */
async function addColumnIfMissing(connection, tableName, columnName, definition) {
  const exists = await columnExists(connection, tableName, columnName);
  if (exists) {
    console.log(`✓ Column ${tableName}.${columnName} already exists - skipping`);
    return false;
  }
  console.log(`Adding column ${columnName} to ${tableName}...`);
  await connection.query(`ALTER TABLE ?? ADD COLUMN ${columnName} ${definition}`, [tableName]);
  console.log(`✓ Column ${tableName}.${columnName} added`);
  return true;
}

/**
 * Drop a column from a table if it exists (idempotent)
 */
async function dropColumnIfExists(connection, tableName, columnName) {
  const exists = await columnExists(connection, tableName, columnName);
  if (!exists) {
    console.log(`✓ Column ${tableName}.${columnName} does not exist - skipping`);
    return false;
  }
  console.log(`Dropping column ${columnName} from ${tableName}...`);
  await connection.query(`ALTER TABLE ?? DROP COLUMN ??`, [tableName, columnName]);
  console.log(`✓ Column ${tableName}.${columnName} dropped`);
  return true;
}

/**
 * Apply migration 002: add blob metadata columns + index
 */
async function migrate002Up(connection) {
  console.log('\n========================================');
  console.log('Applying Migration 002: Add Blob Metadata Columns');
  console.log('========================================\n');

  let addedCount = 0;

  // registrasi table
  for (const { column, definition } of BLOB_COLUMNS_REGISTRASI) {
    const added = await addColumnIfMissing(connection, 'registrasi', column, definition);
    if (added) addedCount++;
  }

  // pemeriksaan_file table
  for (const { column, definition } of BLOB_COLUMNS_PEMERIKSAAN_FILE) {
    const added = await addColumnIfMissing(connection, 'pemeriksaan_file', column, definition);
    if (added) addedCount++;
  }

  // Index on blob_name for fast lookup
  const idxExists = await indexExists(connection, 'pemeriksaan_file', 'idx_pemfile_blob_name');
  if (idxExists) {
    console.log('✓ Index idx_pemfile_blob_name already exists - skipping');
  } else {
    console.log('Creating index idx_pemfile_blob_name on pemeriksaan_file(blob_name)...');
    await connection.query('CREATE INDEX idx_pemfile_blob_name ON pemeriksaan_file (blob_name)');
    console.log('✓ Index idx_pemfile_blob_name created');
    addedCount++;
  }

  console.log('\n========================================');
  console.log(`Migration 002 Complete: ${addedCount} change(s) applied`);
  console.log('========================================\n');
}

/**
 * Rollback migration 002: drop blob metadata columns + index
 */
async function migrate002Down(connection) {
  console.log('\n========================================');
  console.log('Rolling Back Migration 002: Remove Blob Metadata Columns');
  console.log('========================================\n');

  let droppedCount = 0;

  // Drop index first
  const idxExists = await indexExists(connection, 'pemeriksaan_file', 'idx_pemfile_blob_name');
  if (!idxExists) {
    console.log('✓ Index idx_pemfile_blob_name does not exist - skipping');
  } else {
    console.log('Dropping index idx_pemfile_blob_name...');
    await connection.query('DROP INDEX idx_pemfile_blob_name ON pemeriksaan_file');
    console.log('✓ Index idx_pemfile_blob_name dropped');
    droppedCount++;
  }

  // pemeriksaan_file columns (reverse order)
  for (const { column } of [...BLOB_COLUMNS_PEMERIKSAAN_FILE].reverse()) {
    const dropped = await dropColumnIfExists(connection, 'pemeriksaan_file', column);
    if (dropped) droppedCount++;
  }

  // registrasi columns (reverse order)
  for (const { column } of [...BLOB_COLUMNS_REGISTRASI].reverse()) {
    const dropped = await dropColumnIfExists(connection, 'registrasi', column);
    if (dropped) droppedCount++;
  }

  console.log('\n========================================');
  console.log(`Migration 002 Rollback Complete: ${droppedCount} change(s) reverted`);
  console.log('========================================\n');
}

// ============================================================================
// Migration 003: Drop legacy path columns
// Feature: azure-blob-storage-migration
// Requirements: 6.5, 7.7
// ============================================================================

/**
 * Apply migration 003: drop legacy path columns after blob migration verified.
 * Calls assertNoLegacyResidue() first — aborts if any residue found.
 */
async function migrate003Up(connection) {
  console.log('\n========================================');
  console.log('Applying Migration 003: Drop Legacy Path Columns');
  console.log('========================================\n');

  // Guard: refuse to drop if any rows still have path set but no blob_name
  console.log('Checking for legacy path residue...');
  try {
    await assertNoLegacyResidue(connection);
  } catch (err) {
    console.error('✗ Residue check failed — aborting migration 003:');
    console.error(err.message);
    throw err;
  }

  let droppedCount = 0;

  // Drop surat_rujukan_path from registrasi
  const dropped1 = await dropColumnIfExists(connection, 'registrasi', 'surat_rujukan_path');
  if (dropped1) droppedCount++;

  // Drop file_path from pemeriksaan_file
  const dropped2 = await dropColumnIfExists(connection, 'pemeriksaan_file', 'file_path');
  if (dropped2) droppedCount++;

  console.log('\n========================================');
  console.log(`Migration 003 Complete: ${droppedCount} column(s) dropped`);
  console.log('========================================\n');
}

/**
 * Rollback migration 003: re-add legacy path columns (schema only, no data).
 */
async function migrate003Down(connection) {
  console.log('\n========================================');
  console.log('Rolling Back Migration 003: Restore Legacy Path Columns');
  console.log('========================================\n');

  console.log('NOTE: Column structure restored but path data is permanently lost.');

  let addedCount = 0;

  // Re-add surat_rujukan_path to registrasi
  const added1 = await addColumnIfMissing(connection, 'registrasi', 'surat_rujukan_path', 'VARCHAR(512) NULL');
  if (added1) addedCount++;

  // Re-add file_path to pemeriksaan_file
  const added2 = await addColumnIfMissing(connection, 'pemeriksaan_file', 'file_path', 'VARCHAR(512) NULL');
  if (added2) addedCount++;

  console.log('\n========================================');
  console.log(`Migration 003 Rollback Complete: ${addedCount} column(s) restored`);
  console.log('========================================\n');
}

// ============================================================================
// Migration 001: Patient search indexes
// ============================================================================

/**
 * Check if an index exists on a table
 */
async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.query(
    'SHOW INDEX FROM ?? WHERE Key_name = ?',
    [tableName, indexName]
  );
  return rows.length > 0;
}

/**
 * Create an index on a table (idempotent)
 */
async function createIndex(connection, indexConfig) {
  const { name, table, column, description } = indexConfig;
  
  const exists = await indexExists(connection, table, name);
  
  if (exists) {
    console.log(`✓ Index ${name} already exists on ${table}(${column}) - skipping`);
    return false;
  }
  
  console.log(`Creating index ${name} on ${table}(${column})...`);
  console.log(`  Description: ${description}`);
  
  await connection.query(
    `CREATE INDEX ?? ON ?? (??)`,
    [name, table, column]
  );
  
  console.log(`✓ Index ${name} created successfully`);
  return true;
}

/**
 * Drop an index from a table (idempotent)
 */
async function dropIndex(connection, indexConfig) {
  const { name, table, column } = indexConfig;
  
  const exists = await indexExists(connection, table, name);
  
  if (!exists) {
    console.log(`✓ Index ${name} does not exist on ${table}(${column}) - skipping`);
    return false;
  }
  
  console.log(`Dropping index ${name} from ${table}(${column})...`);
  
  await connection.query(
    `DROP INDEX ?? ON ??`,
    [name, table]
  );
  
  console.log(`✓ Index ${name} dropped successfully`);
  return true;
}

/**
 * Apply migrations
 */
async function migrateUp(connection, filter) {
  if (!filter || filter === '001') {
    console.log('\n========================================');
    console.log('Applying Migration 001: Add Patient Search Indexes');
    console.log('========================================\n');

    let createdCount = 0;

    for (const indexConfig of INDEXES) {
      try {
        const created = await createIndex(connection, indexConfig);
        if (created) createdCount++;
      } catch (error) {
        console.error(`✗ Error creating index ${indexConfig.name}:`, error.message);
        throw error;
      }
    }

    console.log('\n========================================');
    console.log(`Migration 001 Complete: ${createdCount} index(es) created`);
    console.log('========================================\n');
  }

  if (!filter || filter === '002') {
    try {
      await migrate002Up(connection);
    } catch (error) {
      console.error('✗ Error in migration 002:', error.message);
      throw error;
    }
  }

  if (!filter || filter === '003') {
    try {
      await migrate003Up(connection);
    } catch (error) {
      console.error('✗ Error in migration 003:', error.message);
      throw error;
    }
  }
}

/**
 * Rollback migrations (reverse order: 003 → 002 → 001)
 */
async function migrateDown(connection, filter) {
  if (!filter || filter === '003') {
    try {
      await migrate003Down(connection);
    } catch (error) {
      console.error('✗ Error rolling back migration 003:', error.message);
      throw error;
    }
  }

  if (!filter || filter === '002') {
    try {
      await migrate002Down(connection);
    } catch (error) {
      console.error('✗ Error rolling back migration 002:', error.message);
      throw error;
    }
  }

  if (!filter || filter === '001') {
    console.log('\n========================================');
    console.log('Rolling Back Migration 001: Remove Patient Search Indexes');
    console.log('========================================\n');

    let droppedCount = 0;

    // Reverse order for rollback
    for (const indexConfig of [...INDEXES].reverse()) {
      try {
        const dropped = await dropIndex(connection, indexConfig);
        if (dropped) droppedCount++;
      } catch (error) {
        console.error(`✗ Error dropping index ${indexConfig.name}:`, error.message);
        throw error;
      }
    }

    console.log('\n========================================');
    console.log(`Migration 001 Rollback Complete: ${droppedCount} index(es) dropped`);
    console.log('========================================\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const direction = process.argv[2];
  const filter = process.argv[3]; // optional: '001', '002', or '003'

  if (!direction || !['up', 'down'].includes(direction)) {
    console.error('Usage: node migrations/run-migration.js [up|down] [migration_number]');
    console.error('  up   - Apply migrations (all, or specific number)');
    console.error('  down - Rollback migrations (all, or specific number)');
    console.error('');
    console.error('Examples:');
    console.error('  node migrations/run-migration.js up         # Apply all migrations');
    console.error('  node migrations/run-migration.js up 001     # Apply migration 001 only');
    console.error('  node migrations/run-migration.js up 002     # Apply migration 002 only');
    console.error('  node migrations/run-migration.js up 003     # Apply migration 003 only (drop legacy paths)');
    console.error('  node migrations/run-migration.js down       # Rollback all migrations');
    console.error('  node migrations/run-migration.js down 003   # Rollback migration 003 only');
    console.error('  node migrations/run-migration.js down 002   # Rollback migration 002 only');
    console.error('  node migrations/run-migration.js down 001   # Rollback migration 001 only');
    process.exit(1);
  }

  if (filter && !['001', '002', '003'].includes(filter)) {
    console.error(`Unknown migration number: ${filter}. Valid values: 001, 002, 003`);
    process.exit(1);
  }
  
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✓ Database connection established');
    
    // Execute migration
    if (direction === 'up') {
      await migrateUp(connection, filter);
    } else {
      await migrateDown(connection, filter);
    }
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✓ Database connection closed');
    }
  }
}

// Run migration
main();
