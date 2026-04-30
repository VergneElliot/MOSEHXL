# 201 - P1-S7 (Order Audit Log Identity + Permission Gate) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/200-P1-S7-ORDER-AUDIT-LOG-IDENTITY-GATE-PLAN.md`

## What was implemented

This patch closes P1-S7 by hardening `POST /api/orders/audit/log` against
actor spoofing and adding a granular permission requirement.

## 1) Route hardening

Updated:
- `MuseBar/backend/src/routes/orders/orderAudit.ts`

Changes:
- Added `requirePermission(P.access_pos)` to POST `/log`.
- Removed body-driven actor assignment (`userId` from `req.body`).
- Bound audit actor to authenticated session:
  - `user_id: String(req.user!.id)`.

Result:
- callers can no longer forge audit entries for another user by passing arbitrary `userId`.
- only users with POS access permission can hit this write endpoint.

## 2) Regression tests added

New:
- `MuseBar/backend/src/routes/orders/orderAudit.log.permissions.test.ts`

Coverage:
- deny-path: `403` without `access_pos`,
- allow-path with `access_pos`,
- assertion that body `userId` is ignored and session user id is used in `AuditTrailModel.logAction(...)`.

Also validated:
- existing read endpoints remain functional via:
  - `src/routes/orders/orderAudit.reads.test.ts`.

## Verification

Executed:

1. `npm run test -- src/routes/orders/orderAudit.log.permissions.test.ts src/routes/orders/orderAudit.reads.test.ts`
   - Result: 2 files passed, 5 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-S7 is complete:
- audit identity is now session-bound,
- POST audit route has granular permission control (`access_pos`),
- spoofing vector described in the audit is removed.
