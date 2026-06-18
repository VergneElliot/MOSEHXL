# 72 — B2: Close remaining tenant-leak holes (PLAN)

Date: 2026-04-24  
Branch: `development`  
Status: Plan only.

This document is the B2 plan referenced by the April 2026 audit (`docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`, section B2).

---

## 0) Scope (audit B2 items)

1. `SubBillModel.create` must set `establishment_id` from parent `orders` row.
2. Delete legacy `BusinessSettingsModel` in `models/index.ts` (cross-tenant unsafe pattern).
3. Delete unmounted `routes/userManagement/roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts`.
4. Add `establishment_id` to `order_items` as denormalized defense in depth (or enforce parent tenant in inserts).

---

## 1) Data-safety rule for production (MuseBar live fiscal data)

Because production contains ~8 months of real accounting data, B2 migration must be **non-destructive by default**:

- No automatic `DELETE` of `order_items` rows in migration.
- Backfill `order_items.establishment_id` from parent `orders.establishment_id`.
- Preflight/validation in migration:
  - if unresolved rows remain after backfill, **raise error and stop** (manual investigation),
  - only then apply `NOT NULL` + FK + index.

This prevents silent data loss and keeps fiscal traceability.

---

## 2) Planned implementation

### 2.1 Sub bills tenant attribution

- Update `SubBillModel.create` in `models/database/orderModel.ts`:
  - fetch parent order tenant and set `sub_bills.establishment_id` from it,
  - reject insert if parent order is missing or tenant mismatch.
- Update all call sites in order routes to pass establishment context.

### 2.2 Remove dead cross-tenant footguns

- Remove `BusinessSettingsModel` from `models/index.ts`.
- Delete unmounted route/helper files:
  - `routes/userManagement/roleRoutes.ts`
  - `routes/userManagement/teamRoutes.ts`
  - `routes/userManagement/users/userQueries.ts`

### 2.3 order_items denormalized tenant column

- Add migration:
  - `ALTER TABLE order_items ADD COLUMN establishment_id UUID REFERENCES establishments(id)`.
  - Backfill via `JOIN orders`.
  - Validate unresolved rows (raise exception if any).
  - `ALTER COLUMN establishment_id SET NOT NULL`.
  - Add index and (if needed) RLS policy update.
- Update `OrderItemModel.create` to write `establishment_id` from parent order (DB query or explicit arg + check).

### 2.4 Tests and verification

- Add/adjust tests for:
  - sub-bill insertion tenant attribution,
  - order-item insertion tenant attribution,
  - migration SQL guardrail behavior (non-destructive preflight).
- Run:
  - `npm run migration:migrate`
  - `npx tsc --noEmit`
  - `npx vitest run`

---

## 3) Completion artifacts

- Companion implementation note (to be created after code ships):
  - `docs/patch-notes/73-MULTI-TENANCY-B2-LEAK-CLOSURE-IMPLEMENTATION.md`

