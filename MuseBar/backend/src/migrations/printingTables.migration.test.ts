import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_04_24_02_00_00_printing_tables_in_migration_chain.sql'
);
const bridgeQueueMigrationPath = path.join(
  __dirname,
  'files',
  '2026_06_18_16_00_00_add_printing_jobs_bridge_queue.sql'
);

describe('printing tables migration', () => {
  it('creates printing tables with expected core columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS printing_configurations');
    expect(sql).toContain('establishment_id UUID NOT NULL');
    expect(sql).toContain('provider VARCHAR(64) NOT NULL');
    expect(sql).toContain('config JSONB NOT NULL');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS printing_history');
    expect(sql).toContain('print_type VARCHAR(64) NOT NULL');
    expect(sql).toContain('status VARCHAR(32) NOT NULL');
    expect(sql).toContain('metadata JSONB NOT NULL');
  });

  it('enables tenant RLS policies for both printing tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('ALTER TABLE printing_configurations FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY printing_configurations_tenant_select');
    expect(sql).toContain('ALTER TABLE printing_history FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY printing_history_tenant_select');
  });

  it('creates durable bridge print jobs queue with lifecycle columns and RLS', () => {
    const sql = fs.readFileSync(bridgeQueueMigrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS printing_jobs');
    expect(sql).toContain('document_type VARCHAR(64) NOT NULL');
    expect(sql).toContain('payload_format VARCHAR(32) NOT NULL');
    expect(sql).toContain('payload_base64 TEXT NOT NULL');
    expect(sql).toContain("CHECK (status IN ('pending', 'claimed', 'printed', 'failed', 'expired'))");
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_printing_jobs_establishment_status_created');
    expect(sql).toContain('ALTER TABLE printing_jobs FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY printing_jobs_tenant_select');
  });
});

