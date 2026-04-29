# 112 - P1-1 (A3 Constraints Hardening: NOT NULL + Closure Uniqueness) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

A3 introduced establishment scoping for legal surfaces, but key DB constraints remain incomplete:

- `audit_trail.establishment_id` is still nullable.
- `archive_exports.establishment_id` is still nullable.
- `closure_bulletins` lacks strict uniqueness on `(establishment_id, closure_type, period_start, period_end)`.

This patch completes the DB-level hardening so tenant/legal invariants are enforced by schema, not convention.

## Scope

### In scope

1. Add one migration that:
   - safely backfills null `establishment_id` values for target tables,
   - fails closed if unresolved rows remain,
   - enforces `NOT NULL` on `audit_trail.establishment_id`, `archive_exports.establishment_id`, `closure_bulletins.establishment_id`,
   - adds closure uniqueness guard on `(establishment_id, closure_type, period_start, period_end)`,
   - checks for duplicate closure rows before uniqueness enforcement and raises explicit exception if found.
2. Keep migration non-destructive (no silent row deletion).
3. Add migration regression test assertions.
4. Document implementation and verification.

### Out of scope

- Runtime closure scheduler redesign.
- Broader legal table redesign beyond these constraints.

## Design choices

- **Fail closed**: if unresolved nulls or duplicate closure keys exist, migration raises exception.
- **No implicit data loss**: duplicates are not auto-merged or deleted.
- **FK behavior alignment**: switch target table establishment FKs to `ON DELETE RESTRICT` to align with `NOT NULL`.

## Step-by-step plan

### Step 1 - Migration creation
- Add migration file with:
  - first-establishment fallback id lookup,
  - targeted backfills from `users` for audit/export rows,
  - fallback fill for remaining null rows,
  - unresolved-null guards (raise),
  - duplicate closure-key guard (raise),
  - `NOT NULL` + unique index/constraint enforcement.

### Step 2 - Regression test
- Add migration content test asserting:
  - unresolved-null guard exists,
  - duplicate closure guard exists,
  - NOT NULL alters exist,
  - closure uniqueness enforcement exists.

### Step 3 - Verification
- Run migration tests and backend type-check.

### Step 4 - Documentation
- Add implementation patch note with exact migration behavior and verification outputs.

## Acceptance criteria

- DB schema enforces non-null establishment scope for audit/archive/closures.
- Closure bulletins uniqueness is enforced at DB level.
- Migration fails closed on unresolved data anomalies.
- Regression tests and type-check pass.
