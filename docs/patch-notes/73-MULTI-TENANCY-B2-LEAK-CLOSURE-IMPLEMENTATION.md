# 73 — B2: Close remaining tenant-leak holes (IMPLEMENTATION)

Date: 2026-04-24  
Status: **Implemented** (code + migration + tests).  
Plan reference: `docs/patch-notes/72-MULTI-TENANCY-B2-LEAK-CLOSURE-PLAN.md`.

---

## 1) What was implemented

### 1.1 `SubBillModel.create` now enforces tenant from parent order

File: `MuseBar/backend/src/models/database/orderModel.ts`

- `SubBillModel.create` now requires `establishmentId`.
- Insert changed from direct `VALUES(...)` to guarded `INSERT ... SELECT ... FROM orders`:
  - requires `orders.id = subBill.order_id`
  - requires `orders.establishment_id = establishmentId`
  - writes `sub_bills.establishment_id` from parent order
- If parent order is missing or not in caller tenant, it throws.

Callers updated:

- `MuseBar/backend/src/routes/orders/orderCRUD.ts`
- `MuseBar/backend/src/routes/orders/orderCancel.ts`

This closes the “sub-bill insert could miss tenant attribution” gap.

---

### 1.2 Legacy cross-tenant `BusinessSettingsModel` removed

File: `MuseBar/backend/src/models/index.ts`

- Deleted the old `BusinessSettingsModel` that used:
  - `SELECT * FROM business_settings ORDER BY id DESC LIMIT 1`
  - `UPDATE ... WHERE id = 1`
- That pattern was tenant-unsafe and unused.

---

### 1.3 Unmounted latent leak files removed

Deleted:

- `MuseBar/backend/src/routes/userManagement/roleRoutes.ts`
- `MuseBar/backend/src/routes/userManagement/teamRoutes.ts`
- `MuseBar/backend/src/routes/userManagement/users/userQueries.ts`

To keep the tree compiling after removing `users/userQueries.ts`, we also removed the dead route module that depended on it:

- `MuseBar/backend/src/routes/userManagement/userRoutes.ts`
- `MuseBar/backend/src/routes/userManagement/users/index.ts`

These modules were not mounted by `routes/userManagement/index.ts` and were a latent risk if re-mounted.

---

### 1.4 `order_items.establishment_id` added with safe backfill (no destructive delete)

Migration added:

- `MuseBar/backend/src/migrations/files/2026_04_24_01_00_00_order_items_establishment_denormalization.sql`

UP behavior:

1. Add `order_items.establishment_id` (nullable first).
2. Backfill from parent `orders.establishment_id`.
3. **Fail closed** if unresolved rows remain (`RAISE EXCEPTION`), with **no delete**.
4. Set `NOT NULL`.
5. Add index `idx_order_items_establishment_id`.

DOWN behavior:

- Drop index, then drop column.

This preserves production fiscal data safety: migration halts on unexpected data instead of silently deleting rows.

---

### 1.5 `OrderItemModel.create` now enforces parent tenant and writes denormalized tenant

File: `MuseBar/backend/src/models/database/orderModel.ts`

- `OrderItemModel.create` now requires `establishmentId`.
- Insert uses guarded `INSERT ... SELECT ... FROM orders` to:
  - verify parent order belongs to tenant
  - write `order_items.establishment_id` from parent
- Throws when parent order/tenant check fails.

Callers updated:

- `MuseBar/backend/src/routes/orders/orderCRUD.ts`
- `MuseBar/backend/src/routes/orders/orderCancel.ts`

Interfaces updated:

- `MuseBar/backend/src/models/interfaces/index.ts`:
  - `OrderItem.establishment_id?: string | null`
  - `SubBill.establishment_id?: string | null`

---

## 2) Verification

Executed during implementation:

- `npm run migration:migrate` ✅  
  - applied `2026_04_24_01_00_00_order_items_establishment_denormalization.sql`
- `npx tsc --noEmit` ✅
- `npx vitest run` ✅

Suite status after B2:

- `5` test files, `15` tests passing.

New regression test:

- `MuseBar/backend/src/migrations/orderItemsEstablishment.migration.test.ts`
  - verifies backfill SQL exists,
  - verifies migration fails closed and does **not** contain `DELETE FROM order_items`.

---

## 3) B2 outcome vs audit bullets

- `SubBillModel.create` sets tenant from parent order: **Done**
- Delete `BusinessSettingsModel` in `models/index.ts`: **Done**
- Delete unmounted `roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts`: **Done** (plus dependent dead modules for compile safety)
- Add denormalized `order_items.establishment_id` with parent enforcement: **Done** (safe non-destructive migration + guarded inserts)

