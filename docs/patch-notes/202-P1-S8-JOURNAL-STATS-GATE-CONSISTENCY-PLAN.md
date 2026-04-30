# 202 - P1-S8 (Journal Stats Gate Consistency) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-S8)

## Why this patch exists

`GET /api/legal/journal/stats` currently combines:

- `requireAdmin` (system_admin role), and
- `getEstablishmentId` (requires non-null establishment scope).

This is inconsistent and practically broken for normal system_admin tokens
(`establishment_id` is usually null unless impersonating).

## Scope

### In scope

1. Align `/journal/stats` with legal route permission model (`access_compliance`).
2. Remove role/scope mismatch for this endpoint.
3. Update regression tests to reflect new gate behavior.
4. Document implementation and verification.

### Out of scope

- Broader redesign of `/journal/reset` policy.
- Multi-endpoint role model refactor beyond `/journal/stats`.

## Design choices

1. **Use `requirePermission(P.access_compliance)`**
   - Matches `/journal/verify`, `/journal/entries`, `/compliance/*`, `/stats/monthly-live`.

2. **Keep establishment scope**
   - Stats remain tenant-scoped via `getEstablishmentId`.

## Strategy

### Step 1 - Route alignment

File:
- `MuseBar/backend/src/routes/legal/journal.ts`

Plan:
- Replace `requireAdmin` on `/stats` with `requirePermission(P.access_compliance)`.
- Keep `getEstablishmentId` behavior unchanged.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

Plan:
- Replace old admin-only denial expectation for `/journal/stats`.
- Add:
  - deny-path without `access_compliance`,
  - allow-path with `access_compliance`.

### Step 3 - Verify

Run:
- legal permission test suite,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. `/journal/stats` is permission-consistent with legal routes.
2. Endpoint is usable by establishment-scoped users holding `access_compliance`.
3. Tests cover deny/allow behavior.
