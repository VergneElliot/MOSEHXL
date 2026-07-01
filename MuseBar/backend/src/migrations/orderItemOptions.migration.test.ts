import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_07_01_11_00_00_add_order_item_options.sql'
);

describe('order item options migration', () => {
  it('creates order_item_options with snapshot columns and RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS order_item_options');
    expect(sql).toContain('group_name_snapshot VARCHAR(100) NOT NULL');
    expect(sql).toContain('choice_label_snapshot VARCHAR(100)');
    expect(sql).toContain('free_text VARCHAR(120)');
    expect(sql).toContain('ALTER TABLE order_item_options FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY order_item_options_tenant_select');
  });
});
