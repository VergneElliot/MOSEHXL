import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_04_29_18_00_00_a3_constraints_hardening.sql'
);

describe('A3 constraints hardening migration', () => {
  it('fails closed when unresolved establishment_id NULL rows remain', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('unresolved audit_trail.establishment_id NULL rows');
    expect(sql).toContain('unresolved archive_exports.establishment_id NULL rows');
    expect(sql).toContain('unresolved closure_bulletins.establishment_id NULL rows');
    expect(sql).toContain('RAISE EXCEPTION');
  });

  it('does not enforce closure key uniqueness because corrective bulletins are retained', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('forced replacement bulletins intentionally');
    expect(sql).not.toContain('duplicate closure key groups found');
    expect(sql).not.toContain('CREATE UNIQUE INDEX IF NOT EXISTS ux_closure_bulletins_establishment_type_period');
  });

  it('enforces NOT NULL on legal/audit closure target tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('ALTER TABLE audit_trail');
    expect(sql).toContain('ALTER TABLE archive_exports');
    expect(sql).toContain('ALTER TABLE closure_bulletins');
    expect(sql).toContain('ALTER COLUMN establishment_id SET NOT NULL');
  });
});
