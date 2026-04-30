# 246 - P2-S8/S9 (journal stats permission consistency) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (S8, S9)

## Why this patch exists

The audit flagged a broken and inconsistent contract in `legal/journal`:

1. `/journal/stats` was previously described as using `requireAdmin` together with
   `getEstablishmentId`, which is contradictory for normal `system_admin` usage.
2. `/journal/verify` and `/journal/entries` were described as permission-gated
   (`access_compliance`) while `/journal/stats` followed another model.

Current code already converges on the permission model for `/journal/stats`, but
the closure criteria for this audit item require explicit regression protection.

## Scope

### In scope

1. Lock the chosen access model with tests:
   - `access_compliance` governs `/journal/stats`.
   - route remains establishment-scoped via `getEstablishmentId`.
2. Document this as the S8/S9 closure pass.

### Out of scope

- Redesign of system-wide legal analytics endpoints.
- Reworking `/journal/reset` architecture (tracked separately under L10).

## Chosen contract

`/api/legal/journal/stats` is an **establishment-scoped compliance endpoint**:

1. User must be authenticated.
2. User must hold `access_compliance`.
3. User must have an active `establishment_id` context.

This matches `/journal/verify` and `/journal/entries`, giving one coherent
authorization story for the journal read surfaces.

## Strategy

### Step 1 - Add regression tests

In `legalPermissionGates.test.ts`:
1. add a positive test for `establishment_admin` + `access_compliance` on
   `/journal/stats`.
2. add a negative scope test for `system_admin` token without establishment
   context (still with `access_compliance`) returning 403.

### Step 2 - Verify

Run targeted legal-route permission tests to ensure no behavior regressions.

## Acceptance criteria

1. Journal stats route behavior is explicitly covered by tests for both role and
   establishment context.
2. S8/S9 inconsistency cannot silently reappear without failing tests.
