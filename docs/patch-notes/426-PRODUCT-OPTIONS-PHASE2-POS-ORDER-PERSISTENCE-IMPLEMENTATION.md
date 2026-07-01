# 426 - Product Options Phase 2 - POS Capture and Order Persistence - Implementation

Date: 2026-07-01  
Roadmap reference: `docs/roadmaps/2026-07-01-PRODUCT-OPTIONS-AND-KITCHEN-PRINTING.md` (Phase 2)

---

## 1) Context

Phase 2 wires menu parameters into the POS: mandatory presets (e.g. Cuisson) and
optional free text (e.g. sans citron) are captured before add-to-cart, validated
server-side, persisted as snapshots on order lines, and shown in cart and order
history. Fiscal receipts, invoices, and legal journal payloads remain unchanged.

---

## 2) What changed

### Database

Migration `2026_07_01_11_00_00_add_order_item_options.sql`:

| Table | Purpose |
|-------|---------|
| `order_item_options` | Per-line option snapshots (`group_name_snapshot`, `choice_label_snapshot`, `free_text`) |

Tenant RLS policies included.

### Backend

| Area | Change |
|------|--------|
| `models/database/orderItemOptionModel.ts` | `createMany`, `getByOrderItemIds` |
| `services/productOptions/productOptionValidationService.ts` | Validates required presets / free text per product assignment |
| `services/orders/orderItemOptionsService.ts` | Attaches options when loading orders |
| `services/orders/orderCreationService.ts` | Validates options before create; persists snapshots; strips options from legal journal |
| `routes/orders/orderCRUD.ts` | GET orders include item options; POST returns 400 on validation failure |
| `@mosehxl/types` | `OrderItemOptionRecord`, `options?` on `OrderItem` |

### Frontend

| Area | Change |
|------|--------|
| `components/POS/ProductOptionDialog.tsx` | Modal for presets + free text before add |
| `components/POS/ProductGrid.tsx` | `onRequestAddProduct` hook instead of inline add |
| `components/POS/POSContainer.tsx` | Option dialog flow; `buildOrderItem` with options |
| `components/POS/OrderSummaryItem.tsx` | Show options in cart |
| `components/History/OrderDetailsDialog.tsx` | Show options in order history |
| `utils/orderItemOptions.ts` | Label formatting and API payload mapping |
| `services/api/orders.ts` | Map options on read/create |

### Tests

- `migrations/orderItemOptions.migration.test.ts`
- `services/productOptions/productOptionValidationService.test.ts`
- `routes/orders/orderCRUD.journalFailSafe.test.ts` — mocks for option modules

---

## 3) Outcome

POS blocks add when a required parameter is missing; chosen values persist on
completed orders and appear in history. Receipt preview and legal journal omit
options (kitchen printing is Phase 4).

**Next:** Phase 3 — kitchen printers admin and product routing.

---

## 4) Verification

```bash
cd MuseBar/backend && npm run type-check && npm run lint && npm run test -- --run
cd MuseBar && npm run type-check
```

Backend: 72 test files / 303 tests green.

Apply migration on environments:

```bash
cd MuseBar/backend && npm run migration:migrate
```

Manual UAT:

1. Assign a required Cuisson parameter to a product in menu admin.
2. Tap product in POS → modal appears → confirm without selection is blocked.
3. Complete order → history shows option labels on the line.
4. Receipt preview shows product name only (no options).

Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```
