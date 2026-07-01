import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_07_01_10_00_00_add_product_option_groups.sql'
);

describe('product option groups migration', () => {
  it('creates option group tables with expected columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS product_option_groups');
    expect(sql).toContain('is_required BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).toContain('allow_free_text BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS product_option_choices');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS product_option_group_products');
    expect(sql).toContain('PRIMARY KEY (product_id, group_id)');
  });

  it('enables tenant RLS policies for all option tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('ALTER TABLE product_option_groups FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY product_option_groups_tenant_select');
    expect(sql).toContain('ALTER TABLE product_option_choices FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY product_option_choices_tenant_select');
    expect(sql).toContain('ALTER TABLE product_option_group_products FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY product_option_group_products_tenant_select');
  });
});
