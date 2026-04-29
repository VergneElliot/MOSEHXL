# 171 - Non-Blocking #9 - Order Audit GET Wiring Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/170-NONBLOCKING-9-ORDER-AUDIT-READ-WIRING-PLAN.md`

## What was implemented

Updated files:

1. `MuseBar/backend/src/models/auditTrail.ts`
2. `MuseBar/backend/src/routes/orders/orderAudit.ts`
3. `MuseBar/backend/src/routes/orders/orderAudit.reads.test.ts` (new)

## 1) Added order-audit read helper in model

In `auditTrail.ts`, added:

- `AuditTrailModel.getOrderAuditEntries(establishmentId, orderId)`
  - reads from `audit_trail`,
  - filters by:
    - `establishment_id`,
    - `resource_type = 'ORDER'`,
    - `resource_id = String(orderId)`,
  - orders results by `timestamp ASC`.

This provides a canonical read path for order-specific audit retrieval.

## 2) Wired `orderAudit` GET endpoints to real data

In `orderAudit.ts`:

- `GET /api/orders/audit/:orderId`
  - now requires establishment context via `getEstablishmentId(req, res)`,
  - fetches real entries through `AuditTrailModel.getOrderAuditEntries(...)`,
  - returns `audit_entries` and computed `total_entries`.

- `GET /api/orders/audit/:orderId/summary`
  - now fetches real entries through the same model method,
  - computes and returns:
    - `total_actions`,
    - `action_types`,
    - `user_activity`,
    - `first_action`,
    - `last_action`.

This removes the prior hardcoded stub payloads (`[]`, `0`, `null`) and makes reads reflect persisted audit data.

## 3) Added regression tests for read wiring

New file: `orderAudit.reads.test.ts`

Coverage includes:

- real entries path for `GET /audit/:orderId`,
- summary computation path for `GET /audit/:orderId/summary`,
- invalid id validation (`400`).

Test fixtures also assert tenant-scoped query args (`[establishmentId, resourceId]`) to guard against regressions.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/orders/orderAudit.reads.test.ts src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 6 files passed, 70 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

Known non-blocking issue #9 is resolved for backend read endpoints:
- order audit GET routes now return real `audit_trail` data,
- summary endpoint now reflects actual order audit history,
- regression coverage exists to prevent fallback to stub behavior.
