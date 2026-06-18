import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_04_24_02_00_00_printing_tables_in_migration_chain.sql'
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
});

