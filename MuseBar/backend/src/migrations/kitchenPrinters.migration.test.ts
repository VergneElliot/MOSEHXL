import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_07_01_12_00_00_add_kitchen_printers.sql'
);

describe('kitchen printers migration', () => {
  it('creates kitchen printer tables and order item snapshot column', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS kitchen_printers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS product_kitchen_printers');
    expect(sql).toContain('kitchen_printer_ids_snapshot JSONB');
    expect(sql).toContain('PRIMARY KEY (product_id, kitchen_printer_id)');
  });

  it('enables tenant RLS policies for kitchen printer tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('ALTER TABLE kitchen_printers FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY kitchen_printers_tenant_select');
    expect(sql).toContain('ALTER TABLE product_kitchen_printers FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY product_kitchen_printers_tenant_select');
  });
});
