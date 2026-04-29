# 107 - P0-5 (orderLegal C2 + A4 Hardening) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/106-P0-5-ORDER-LEGAL-C2-A4-HARDENING-PLAN.md`

## What was implemented

## 1) Permission registry expanded for compliance reads

Updated:
- `MuseBar/backend/src/permissions/registry.ts`

Change:
- Added canonical permission constant:
  - `P.access_compliance = 'access_compliance'`

## 2) `orderLegal` route hardened (C2 + A4)

Updated:
- `MuseBar/backend/src/routes/orders/orderLegal.ts`

Changes:
- Added imports:
  - `requirePermission` from auth middleware
  - `AppError`, `asyncHandler` from unified error middleware
  - `P` from permission registry
- Converted all handlers to `asyncHandler(...)`.
- Replaced local catch+500 response blocks with:
  - contextual `logger.error(...)`
  - `throw new AppError(...)` with route-specific error codes
- Applied explicit permission gate to legal read endpoints:
  - `GET /api/orders/legal/compliance/:orderId` -> `requirePermission(P.access_compliance)`
  - `GET /api/orders/legal/journal/:orderId` -> `requirePermission(P.access_compliance)`
- Kept `POST /journal-entry` write route as `requireEstablishmentAdmin` + authenticated.

## 3) Regression tests added for new permission gate

Added:
- `MuseBar/backend/src/routes/orders/orderLegal.permissions.test.ts`

Coverage:
1. staff token without `access_compliance` gets `403` on compliance endpoint.
2. staff token with `access_compliance` gets `200` and reaches integrity verification path.

Also re-ran existing hardening suite:
- `orderLegal.journalEntry.test.ts`

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/orders/orderLegal.journalEntry.test.ts src/routes/orders/orderLegal.permissions.test.ts` ✅
   - Result: 2 files passed, 6 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `orderLegal.ts`
     - `orderLegal.permissions.test.ts`
     - `permissions/registry.ts`

## Outcome

P0-5 is complete:
- `orderLegal` now follows C2 error-handling standards (`asyncHandler + AppError`),
- legal read surfaces are no longer `requireAuth`-only and now enforce explicit compliance permission,
- targeted tests guard the new permission gate.
