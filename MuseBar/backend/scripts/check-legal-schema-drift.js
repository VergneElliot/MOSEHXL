#!/usr/bin/env node

/**
 * Enforce schema source-of-truth policy:
 * - migrations in src/migrations/files/ are canonical
 * - snapshot files (src/models/legal-schema.sql, src/models/multi-tenant-schema.sql)
 *   must be updated when schema-changing migrations are introduced.
 *
 * A migration can opt out by adding this marker comment:
 *   -- SCHEMA_SNAPSHOT_NOT_REQUIRED
 */

const { execSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const SNAPSHOT_FILES = new Set([
  'src/models/legal-schema.sql',
  'src/models/multi-tenant-schema.sql',
]);

const MIGRATION_PREFIX = 'src/migrations/files/';
const SKIP_MARKER = 'SCHEMA_SNAPSHOT_NOT_REQUIRED';

function gitOutput(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function resolveRange() {
  const base = process.env.GIT_BASE;
  const head = process.env.GIT_HEAD;

  if (base && head) {
    return `${base}...${head}`;
  }

  try {
    return `${gitOutput('git rev-parse HEAD~1')}...${gitOutput('git rev-parse HEAD')}`;
  } catch {
    return '';
  }
}

function getChangedFiles(range) {
  if (!range) return [];
  try {
    const out = gitOutput(`git diff --name-only ${range}`);
    return out ? out.split('\n').map((entry) => entry.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function migrationIsSnapshotExempt(repoRelativePath) {
  try {
    const absolutePath = path.resolve(process.cwd(), repoRelativePath);
    const content = readFileSync(absolutePath, 'utf8');
    return content.includes(SKIP_MARKER);
  } catch {
    return false;
  }
}

function main() {
  const range = resolveRange();
  const changedFiles = getChangedFiles(range);

  if (changedFiles.length === 0) {
    console.log('Schema drift check skipped: no comparable git diff range found.');
    return;
  }

  const backendChangedFiles = changedFiles
    .filter((file) => file.startsWith('MuseBar/backend/'))
    .map((file) => file.replace('MuseBar/backend/', ''));

  const changedMigrations = backendChangedFiles.filter((file) => file.startsWith(MIGRATION_PREFIX));
  if (changedMigrations.length === 0) {
    console.log('Schema drift check passed: no migration files changed.');
    return;
  }

  const nonExemptMigrations = changedMigrations.filter((file) => !migrationIsSnapshotExempt(file));
  if (nonExemptMigrations.length === 0) {
    console.log('Schema drift check passed: all changed migrations are explicitly snapshot-exempt.');
    return;
  }

  const snapshotTouched = backendChangedFiles.some((file) => SNAPSHOT_FILES.has(file));
  if (snapshotTouched) {
    console.log('Schema drift check passed: schema snapshots updated with migration changes.');
    return;
  }

  console.error('\nSchema drift policy violation detected.\n');
  console.error('Changed migrations without snapshot exemption:');
  for (const migration of nonExemptMigrations) {
    console.error(`  - ${migration}`);
  }
  console.error('\nExpected one of the following:');
  console.error('  1) Update schema snapshot file(s):');
  for (const snapshot of SNAPSHOT_FILES) {
    console.error(`     - ${snapshot}`);
  }
  console.error(`  2) Add marker comment in migration SQL when snapshot is not required: -- ${SKIP_MARKER}\n`);
  process.exit(1);
}

main();
