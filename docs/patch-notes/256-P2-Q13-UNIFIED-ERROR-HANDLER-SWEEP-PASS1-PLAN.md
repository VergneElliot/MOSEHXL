# 256 - P2-Q13 (unified error handler sweep, pass 1) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (Q13)

## Why this patch exists

Multiple routes still returned ad-hoc `res.status(500).json(...)` payloads,
outside the shared `asyncHandler` + `AppError` error path.

This pass focuses on core JSON API routes where migration risk is low and
benefit is immediate.

## Scope

### In scope (Q13 pass 1)

Refactor the following route files to use `asyncHandler` + `AppError` for server
errors:

1. `routes/settings.ts`
2. `routes/legal/businessDayStats.ts`
3. `routes/adminDashboard.ts`
4. `routes/enhancedEstablishments.ts`
5. `routes/setup.ts`
6. `routes/establishmentSearch.ts`
7. `routes/orders/orderCRUD.ts` (remaining ad-hoc 500 branch)
8. `routes/orders/orderChange.ts`
9. `routes/orders/orderCancel.ts`
10. `routes/emailTest.ts`

### Out of scope (deferred to Q13 pass 2)

1. `routes/printing.ts`
2. `routes/printingCompat.ts`
3. `routes/establishmentAccountCreation/middleware/*.ts`

These remain intentionally separate in pass 1 because they include compatibility
paths and middleware-layer contracts that need a narrower hardening pass.

## Strategy

### Step 1 - Convert handlers

1. Wrap async route handlers with `asyncHandler`.
2. Replace ad-hoc 500 responses with `throw new AppError(...)`.
3. Preserve existing non-500 branches (e.g., 400/404 business responses).

### Step 2 - Keep behavior where legally sensitive

For order payment/cancellation fail-safe flows:
1. keep compensating delete logic,
2. convert final failure response to thrown `AppError` only.

### Step 3 - Verify

Run backend type-check, targeted tests, and lint diagnostics.

## Acceptance criteria (pass 1)

1. No ad-hoc `res.status(500).json(...)` remains in the pass-1 route files.
2. Core route error handling now flows through unified middleware.
