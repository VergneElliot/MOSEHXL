# 198 - P1-S6 (Business-Day Stats Permission Gate) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-S6)

## Why this patch exists

`GET /api/legal/business-day-stats` was only protected by `requireAuth`.
This exposes financially sensitive live totals to any authenticated user.

Audit S6 requires adding a granular permission gate consistent with legal routes.

## Scope

### In scope

1. Add explicit permission middleware to business-day-stats endpoint.
2. Use `P.access_compliance` for consistency with legal compliance surfaces.
3. Add dedicated regression tests for deny/allow paths.
4. Update routing comment to reflect new policy.

### Out of scope

- Changing endpoint response shape.
- Revisiting wider legal permission taxonomy.

## Design choices

1. **Permission key selection**
   - `access_compliance` chosen to align with `legal/journal`, `legal/compliance`, and `legal/stats`.

2. **No behavior drift beyond access control**
   - Existing business-day calculation logic remains unchanged.

## Strategy

### Step 1 - Route gate

Files:
- `MuseBar/backend/src/routes/legal/businessDayStats.ts`
- `MuseBar/backend/src/routes/legal/index.ts`

Plan:
- Add `requirePermission(P.access_compliance)` on `/business-day-stats`.
- Update route comment in index to avoid stale claim that stats are open to all authenticated establishment users.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/routes/legal/businessDayStats.permissions.test.ts` (new)

Plan:
- assert 403 without `access_compliance`,
- assert 200 with `access_compliance`.

### Step 3 - Verify

Run:
- new business-day-stats permission tests,
- existing legal permission suite sanity,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. `/api/legal/business-day-stats` is denied without `access_compliance`.
2. Existing legal permission model remains consistent.
3. Tests cover both deny and allow paths.
