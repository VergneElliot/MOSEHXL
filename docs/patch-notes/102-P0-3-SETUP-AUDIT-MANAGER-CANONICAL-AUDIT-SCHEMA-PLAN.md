# 102 - P0-3 (SetupAuditManager Canonical Audit Schema Alignment) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

The full repo audit flagged a critical mismatch:

- `SetupAuditManager` writes legacy `audit_trail` columns (`action`, `entity_type`, `old_values`, `new_values`, `metadata`) that do not match the canonical schema used by `AuditTrailModel` (`action_type`, `resource_type`, `resource_id`, `action_details`, etc.).

This can cause setup audit writes to fail silently and undermines pillar-S traceability.

## Scope

### In scope

1. Align `SetupAuditManager` insert/query behavior to canonical `audit_trail` schema.
2. Keep existing setup flow behavior non-blocking (audit write failures should not crash setup).
3. Add regression test coverage for canonical column usage and setup-history query filter.
4. Document implementation + verification.

### Out of scope

- Full setup flow refactor to exclusively call `AuditTrailModel.logAction`.
- Broad setup module redesign outside audit schema alignment.

## Design choices

- Preserve `SetupAuditManager` API surface (call sites unchanged), but map emitted payload to canonical audit fields.
- Keep writes on the provided `PoolClient` to preserve existing setup transaction context.
- Normalize invalid `establishment_id` values to `null` to avoid UUID-type insert crashes.
- Fix setup-history query to use `action_type` and proper tenant-safe predicate grouping.

## Step-by-step plan

### Step 1 - Canonical write mapping
- Update `SetupAuditManager` and wizard `SetupAuditEntry` type to canonical fields.
- Change SQL insert columns to canonical `audit_trail` schema.

### Step 2 - Query hardening
- Update `getSetupAuditHistory()`:
  - use `action_type` filters,
  - keep `establishment_id = $1` scoped with grouped `OR` predicates,
  - sort by canonical `timestamp`.

### Step 3 - Regression tests
- Add `SetupAuditManager.test.ts` that verifies:
  - canonical columns are used in insert SQL,
  - setup-history query uses `action_type` filters and tenant-scoped parameters.

### Step 4 - Verification and docs
- Run targeted setup audit tests and backend type-check.
- Write implementation patch note with test outputs.

## Acceptance criteria

- No legacy audit column names remain in `SetupAuditManager` SQL.
- Setup audit history query uses canonical field names and correct tenant filter grouping.
- Regression tests pass.
- Backend type-check passes.
