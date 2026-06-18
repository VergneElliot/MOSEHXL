# 315 — P3-S10 order audit read permission gate (implementation)

## What changed

### 1) Added permission gate on order-audit read endpoint

Updated:

- `MuseBar/backend/src/routes/orders/orderAudit.ts`

Changes:

- Added `requireAnyPermission` import from `routes/auth`.
- Updated `GET /api/orders/audit/:orderId` middleware chain to:
  - `requireAuth`
  - `requireAnyPermission([P.access_pos, P.access_compliance])`
- Kept route logic and response payload unchanged once authorized.

### 2) Extended read-endpoint tests for permission behavior

Updated:

- `MuseBar/backend/src/routes/orders/orderAudit.reads.test.ts`

Changes:

- Added `UserModel.getUserPermissions` mock wiring to support permission middleware.
- Added regression case that denies access with no relevant permissions.
- Added regression case that allows access with `access_compliance`.
- Preserved existing happy-path and invalid-order-id assertions.

## Verification

- `npm run type-check` ✅
- `npm test -- src/routes/orders/orderAudit.reads.test.ts src/routes/orders/orderAudit.log.permissions.test.ts` ✅

## Notes

- This closes `P3-S10` by ensuring order-audit reads are not exposed to auth-only users.
