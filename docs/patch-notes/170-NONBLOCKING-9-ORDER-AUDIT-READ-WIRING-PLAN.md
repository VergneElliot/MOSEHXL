# 170 - Non-Blocking #9 - Order Audit GET Wiring Plan

Date: 2026-04-29  
Source: `DEVELOPMENT-STATE.md` (Known Non-Blocking Issues #9)

## Why this patch exists

`routes/orders/orderAudit.ts` still returns stubbed empty payloads for:

- `GET /api/orders/audit/:orderId`
- `GET /api/orders/audit/:orderId/summary`

This creates reporting drift: audit data is written, but read endpoints cannot surface it.

## Scope

### In scope

1. Wire order-audit read endpoints to real `audit_trail` queries.
2. Enforce establishment scoping for read endpoints.
3. Add route-level regression tests for:
   - successful read path,
   - summary path,
   - invalid id validation.
4. Run targeted tests + backend type-check + lints.
5. Add implementation patch note.

### Out of scope

- Full reporting UI integration.
- Permission model changes for order audit routes.

## Design choices

- Keep existing `AuditTrailModel.logAction` behavior untouched.
- Add dedicated read helpers in `AuditTrailModel` for order-specific audit lookups.
- Compute summary in route from fetched entries to keep implementation simple and transparent.

## Step-by-step plan

### Step 1 - Data access helpers
- Add model methods to fetch order audit entries scoped by `establishment_id` + `resource_id`.

### Step 2 - Route wiring
- Replace stub responses in `orderAudit.ts` with real model data.
- Add establishment guard using existing auth helper.

### Step 3 - Regression tests
- Add tests to verify non-empty read behavior and summary shape.

### Step 4 - Verify and document
- Run targeted tests + type-check + lints.
- Add implementation note with results.

## Acceptance criteria

- `GET /orders/audit/:orderId` returns real entries + total.
- `GET /orders/audit/:orderId/summary` returns computed summary from real entries.
- Endpoint behavior remains scoped to caller establishment.
