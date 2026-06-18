import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_04_24_01_00_00_order_items_establishment_denormalization.sql'
);

describe('order_items establishment denormalization migration', () => {
  it('backfills establishment_id from parent orders', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('UPDATE order_items oi');
    expect(sql).toContain('SET establishment_id = o.establishment_id');
    expect(sql).toContain('FROM orders o');
  });

  it('fails closed instead of deleting unresolved rows', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('RAISE EXCEPTION');
    expect(sql).not.toContain('DELETE FROM order_items');
  });
});

