import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_04_24_00_00_00_row_level_security_tenant_isolation.sql'
);

describe('tenant RLS migration', () => {
  it('enables and forces RLS on high-risk tenant tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.legal_journal FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.archive_exports FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.audit_trail FORCE ROW LEVEL SECURITY;');
  });

  it('uses app.establishment_id context and bypass flag in policies', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain("current_setting('app.establishment_id', true)");
    expect(sql).toContain("current_setting('app.bypass_rls', true)");
    expect(sql).toContain('app_current_establishment_id() IS NOT NULL');
    expect(sql).toContain('app_rls_bypass()');
  });
});

