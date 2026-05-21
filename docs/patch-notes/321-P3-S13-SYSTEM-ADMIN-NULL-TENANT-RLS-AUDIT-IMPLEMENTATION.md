# 321 — P3-S13 system-admin null-tenant RLS audit (implementation)

## What changed

### 1) Added null-context RLS assertions in real-db compliance suite

Updated:

- `MuseBar/backend/src/integration/real-db/compliance.real-db.test.ts`

Changes:

- Added test proving null tenant context cannot read tenant-owned `orders` rows.
- Added test proving null tenant context cannot insert tenant-scoped `orders` rows (RLS denial).
- Reused existing superuser/BYPASSRLS guard to skip assertions when the database role bypasses policy evaluation.

## Verification

- `npm run type-check` ✅
- `npm run test:real-db` ✅
- `npm test` ✅

## Notes

- This closes `P3-S13` by demonstrating that `system_admin`-style null tenant context remains constrained by RLS unless the runtime DB role explicitly bypasses RLS.
