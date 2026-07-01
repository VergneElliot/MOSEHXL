import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_07_01_13_00_00_add_product_print_pickup_slip.sql'
);

describe('print pickup slip migration', () => {
  it('adds product flag and order item snapshot column', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('print_pickup_slip BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).toContain('print_pickup_slip_snapshot BOOLEAN NOT NULL DEFAULT FALSE');
  });
});
