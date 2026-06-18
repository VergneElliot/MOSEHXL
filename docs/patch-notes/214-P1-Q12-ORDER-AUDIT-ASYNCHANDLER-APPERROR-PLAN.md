# 214 - P1-Q12 (Order audit route to `asyncHandler` + `AppError`) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-Q12)

## Why this patch exists

`orderAudit.ts` still used raw async route handlers with manual `try/catch`
blocks and ad-hoc `res.status(500).json(...)` payloads.

Audit P1-Q12 requires converging this route onto the backend's unified error
handling model (`asyncHandler` + `AppError`) for consistency and predictable
error contracts.

## Scope

### In scope

1. Wrap order audit endpoints with `asyncHandler`.
2. Replace manual 500 JSON responses with `AppError` throws.
3. Keep existing success payloads and validation behavior intact.
4. Update tests to validate unified error payload behavior on failure path.
5. Document implementation and verification.

### Out of scope

- Permission model changes for read endpoints.
- Order audit data model changes.
- Broader route sweep outside `orderAudit.ts`.

## Design choices

1. **Minimal behavior change**
   - Keep existing 400 input validation responses in-route.
   - Change only server error path handling to centralized middleware flow.

2. **Preserve route-specific error codes**
   - Use explicit `AppError` codes per endpoint:
     - `ORDER_AUDIT_LOG_FAILED`
     - `ORDER_AUDIT_READ_FAILED`
     - `ORDER_AUDIT_SUMMARY_FAILED`

3. **Test the unified middleware contract**
   - Attach `errorHandler` middleware in order-audit route tests.
   - Add failure-path assertion for structured `{ success: false, error: ... }`.

## Strategy

### Step 1 - Route refactor

File:
- `MuseBar/backend/src/routes/orders/orderAudit.ts`

Plan:
1. Import `asyncHandler` and `AppError`.
2. Wrap `POST /log`, `GET /:orderId`, `GET /:orderId/summary` with `asyncHandler`.
3. Keep logging in catch blocks, then throw `AppError` instead of manual
   `res.status(500).json(...)`.

### Step 2 - Tests

Files:
- `MuseBar/backend/src/routes/orders/orderAudit.log.permissions.test.ts`
- `MuseBar/backend/src/routes/orders/orderAudit.reads.test.ts`

Plan:
1. Attach shared `errorHandler` middleware to test app.
2. Add a failing `logAction` test to assert unified 500 payload.

### Step 3 - Verify

Run:
- order audit route tests,
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. `orderAudit.ts` no longer returns manual ad-hoc 500 payloads.
2. Errors flow through centralized middleware using `AppError`.
3. Route tests pass and cover the structured 500 response contract.
