# 215 - P1-Q12 (Order audit route to `asyncHandler` + `AppError`) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/214-P1-Q12-ORDER-AUDIT-ASYNCHANDLER-APPERROR-PLAN.md`

## What was implemented

This patch closes P1-Q12 by migrating `orderAudit.ts` onto the backend's unified
error-handling pattern.

## 1) Route refactor to `asyncHandler` + `AppError`

Updated:
- `MuseBar/backend/src/routes/orders/orderAudit.ts`

Changes:
1. Imported `asyncHandler` and `AppError` from `middleware/errorHandler`.
2. Wrapped all order-audit endpoints with `asyncHandler`:
   - `POST /log`
   - `GET /:orderId`
   - `GET /:orderId/summary`
3. Replaced manual ad-hoc 500 responses with route-specific `AppError` throws:
   - `ORDER_AUDIT_LOG_FAILED`
   - `ORDER_AUDIT_READ_FAILED`
   - `ORDER_AUDIT_SUMMARY_FAILED`
4. Retained existing success payloads and existing 400 validation responses.

Result:
- server errors now flow through centralized error middleware contract instead of
  hand-crafted per-route JSON.

## 2) Test updates for unified error flow

Updated:
- `MuseBar/backend/src/routes/orders/orderAudit.log.permissions.test.ts`
- `MuseBar/backend/src/routes/orders/orderAudit.reads.test.ts`

Changes:
1. Added shared `errorHandler` middleware to test apps.
2. Added new failing persistence test on `POST /audit/log` asserting structured
   error payload:
   - `status = 500`
   - `success = false`
   - `error.code = ORDER_AUDIT_LOG_FAILED`

Result:
- tests now validate centralized error contract on failure path.

## Verification

Executed:

1. `npm run test -- src/routes/orders/orderAudit.log.permissions.test.ts src/routes/orders/orderAudit.reads.test.ts`
   - Result: 2 files passed, 6 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-Q12 is complete:
- `orderAudit.ts` is aligned with unified backend error handling,
- ad-hoc manual 500 responses are removed from this route,
- regression coverage confirms standardized failure payload behavior.
