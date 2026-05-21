# 314 — P3-S10 order audit read permission gate (plan)

## Objective

Require explicit permission checks for `GET /api/orders/audit/:orderId` so authenticated users cannot read order audit trails without POS/compliance access.

## Scope

### In scope

- Add a permission gate to the order-audit read endpoint.
- Allow access with either `access_pos` or `access_compliance`.
- Update endpoint tests to validate deny/allow behavior.

### Out of scope

- Changing write permissions on `POST /api/orders/audit/log`.
- Changing permission behavior for `GET /api/orders/audit/:orderId/summary`.

## Design decisions

1. Use `requireAnyPermission([P.access_pos, P.access_compliance])` to support both operator and compliance-only roles.
2. Keep existing 403 payload (`{ error: 'Permission denied' }`) for consistency with existing middleware.
3. Keep route business behavior unchanged when permission passes.

## Verification plan

- Backend type-check.
- Targeted tests:
  - `src/routes/orders/orderAudit.reads.test.ts`
  - `src/routes/orders/orderAudit.log.permissions.test.ts`
