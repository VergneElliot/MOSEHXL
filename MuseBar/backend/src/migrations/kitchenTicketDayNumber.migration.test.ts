import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_07_01_14_00_00_add_kitchen_ticket_day_number.sql'
);

describe('kitchen ticket day number migration', () => {
  it('creates sequence table and order snapshot columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('kitchen_ticket_daily_sequences');
    expect(sql).toContain('kitchen_ticket_day_number INTEGER');
    expect(sql).toContain('kitchen_ticket_day_period_start TIMESTAMPTZ');
  });
});
