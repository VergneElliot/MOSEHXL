# 254 - P2-Q11 (`orderCRUD` POST service extraction) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (Q11)

## Why this patch exists

`routes/orders/orderCRUD.ts` currently holds multiple concerns inline in
`POST /api/orders`:

1. order/entity persistence (`OrderModel`, `OrderItemModel`, `SubBillModel`),
2. legal journal SALE write and compensating delete policy,
3. audit trail side-effect logging.

This makes route maintenance harder and blurs route-vs-service boundaries.

## Scope

### In scope

1. Extract POST create flow into a dedicated service module.
2. Keep route behavior and responses unchanged (especially legal fail-safe 500).
3. Keep existing tests green; add/adjust only if needed.

### Out of scope

- Re-architecting refund/change/tip-reversal routes in this pass.
- Changing legal compliance policy semantics.

## Design choices

1. **Route becomes thin orchestrator**
   - route validates/authenticates and delegates core flow.

2. **Service owns domain workflow**
   - compute totals,
   - create order/items/sub-bills,
   - perform legal-journal hardening policy,
   - trigger audit best-effort logging.

3. **Preserve existing API contract**
   - if legal journal SALE write fails:
     - compensating delete attempt still runs,
     - response remains status `500` with existing compliance safety message.

## Strategy

### Step 1 - Create service module

Add `backend/src/services/orders/orderCreationService.ts` with:
1. input contract for body + request metadata,
2. success vs legal-fail-safe result union,
3. extracted implementation of current route logic.

### Step 2 - Refactor route to delegate

Update `routes/orders/orderCRUD.ts` POST handler to:
1. gather request context,
2. call service,
3. send 201 success or 500 compliance-fail-safe response.

### Step 3 - Verify

Run:
1. targeted fail-safe tests for `orderCRUD`,
2. backend type-check,
3. lint diagnostics on touched files.

## Acceptance criteria

1. `orderCRUD` POST no longer contains inline business workflow internals.
2. Legal fail-safe behavior is unchanged.
3. Existing regression tests pass.
