# 300 — P3-Q3 extract `orderCancel` god handler (plan)

## Objective

Extract business logic from `routes/orders/orderCancel.ts` into a dedicated service while keeping HTTP behavior and fiscal fail-safe semantics unchanged.

## Scope

### In scope

- Introduce `OrderCancellationService` under `services/orders/`.
- Move cancellation orchestration logic (change cancellation, partial/full cancellation, tip reversal, legal journal append, audit trail, compensating cleanup) into the service.
- Keep route middleware and endpoint surface unchanged (`POST /orders/payment/cancel-unified`).
- Preserve existing AppError codes/messages for legal-journal fail-closed paths.

### Out of scope

- Functional changes to cancellation business rules.
- New endpoint creation or payload shape redesign.
- Broad refactors outside `orderCancel` flow.

## Design decisions

1. Use a service that returns `{ status, body }` for normal HTTP outcomes (400/404/201), so route behavior stays stable.
2. Keep legal journal failures as thrown `AppError` values to preserve fail-closed semantics and current error codes.
3. Keep audit trail writes best-effort (log and continue), matching existing operational behavior.

## Verification plan

- Backend type-check.
- Existing order journal fail-safe tests (including cancellation path).
- Full backend test suite for regression confidence.
