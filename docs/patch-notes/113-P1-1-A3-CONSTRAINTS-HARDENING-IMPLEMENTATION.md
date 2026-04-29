# 113 - P1-1 (A3 Constraints Hardening: NOT NULL + Closure Uniqueness) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/112-P1-1-A3-CONSTRAINTS-HARDENING-PLAN.md`

## What was implemented

## 1) New constraints-hardening migration added

Added:
- `MuseBar/backend/src/migrations/files/2026_04_29_18_00_00_a3_constraints_hardening.sql`

Migration behavior (UP):
- Resolves `establishment_id` nullability on target tables using:
  - user-linked backfill where available (`audit_trail.user_id`, `archive_exports.created_by`),
  - deterministic fallback to earliest establishment id.
- Fails closed with explicit `RAISE EXCEPTION` if unresolved nulls remain for:
  - `audit_trail.establishment_id`
  - `archive_exports.establishment_id`
  - `closure_bulletins.establishment_id`
- Detects duplicate closure key groups:
  - `(establishment_id, closure_type, period_start, period_end)`
  - fails closed if duplicates exist (no silent row deletion).
- Enforces:
  - `ALTER COLUMN establishment_id SET NOT NULL` on:
    - `audit_trail`
    - `archive_exports`
    - `closure_bulletins`
- Aligns FK behavior to `ON DELETE RESTRICT` for those three tables.
- Adds closure uniqueness index:
  - `ux_closure_bulletins_establishment_type_period` on `(establishment_id, closure_type, period_start, period_end)`.

Migration behavior (DOWN):
- Drops uniqueness index.
- Drops NOT NULL constraints on target columns.
- Restores original FK delete behavior:
  - audit/archive: `ON DELETE SET NULL`
  - closure: `ON DELETE CASCADE`

## 2) Migration regression tests added

Added:
- `MuseBar/backend/src/migrations/a3ConstraintsHardening.migration.test.ts`

Coverage:
1. Asserts fail-closed unresolved-null guards exist.
2. Asserts duplicate-closure guard exists before uniqueness enforcement.
3. Asserts NOT NULL establishment enforcement exists on all target tables.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/migrations/a3ConstraintsHardening.migration.test.ts src/migrations/tenantRls.migration.test.ts` ✅
   - Result: 2 files passed, 5 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `a3ConstraintsHardening.migration.test.ts`

## Outcome

P1-1 is complete:
- remaining A3 DB-level invariants are now enforceable by schema,
- unresolved legacy data and duplicate closure key anomalies fail migration explicitly,
- closure uniqueness is now protected at DB level.
