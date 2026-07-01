# 427 - Product Options Phase 3 - Kitchen Printers Admin - Implementation

Date: 2026-07-01  
Roadmap reference: `docs/roadmaps/2026-07-01-PRODUCT-OPTIONS-AND-KITCHEN-PRINTING.md` (Phase 3)

---

## 1) Context

Phase 3 adds kitchen/bar printer definitions per establishment, product routing
assignments in menu admin, immutable printer snapshots on order lines, and a dry
test-print enqueue endpoint. Physical kitchen tickets on payment remain Phase 4.

---

## 2) What changed

### Database

Migration `2026_07_01_12_00_00_add_kitchen_printers.sql`:

| Table / column | Purpose |
|----------------|---------|
| `kitchen_printers` | Named printers (`Bar`, `Cuisine`) with slug + connection config |
| `product_kitchen_printers` | Many-to-many product ↔ printer routing |
| `order_items.kitchen_printer_ids_snapshot` | JSONB snapshot at order create |

### Backend

| Area | Change |
|------|--------|
| `models/database/kitchenPrinterModel.ts` | CRUD, product assignment |
| `services/kitchenPrinting/kitchenPrinterCatalogService.ts` | Enrich products with printer metadata |
| `services/kitchenPrinting/kitchenPrinterSnapshot.ts` | Snapshot helpers for order create |
| `services/kitchenPrinting/kitchenPrinterTestPrintService.ts` | Dry test ticket enqueue |
| `routes/kitchenPrinters.ts` | `/api/kitchen-printers` CRUD + `POST /:id/test-print` |
| `routes/products.ts` | `kitchen_printer_ids` on create/update; enriched GET |
| `services/orders/orderCreationService.ts` | Snapshot printers on each order line |
| `printing/bridgePrintJobRepo.ts` | `kitchen_test` document type (prep for Phase 4) |

### Frontend

| Area | Change |
|------|--------|
| `hooks/useKitchenPrinters.ts` | Load/create/update/delete/test printers |
| `components/Menu/KitchenPrintersSection.tsx` | List + manage printers |
| `components/Menu/KitchenPrinterDialog.tsx` | Create/edit printer form |
| `components/Menu/ProductDialog.tsx` | Printer checkboxes on products |
| API + types | `kitchenPrinters.ts`, `@mosehxl/types` |

### Tests

- `migrations/kitchenPrinters.migration.test.ts`
- `routes/kitchenPrinters.routes.test.ts`
- `services/kitchenPrinting/kitchenPrinterSnapshot.test.ts`

---

## 3) Outcome

Establishments can configure bar/cuisine printers, assign them to products, and
completed orders store printer snapshots on each line. Test print queues a
`kitchen_test` bridge job with printer metadata.

**Next:** Phase 4 — kitchen order tickets on payment + bridge slug routing.

---

## 4) Verification

```bash
cd MuseBar/backend && npm run type-check && npm run lint && npm run test -- --run
cd MuseBar && npm run type-check
```

Backend: 75 test files / 310 tests green.

Apply migration on environments:

```bash
cd MuseBar/backend && npm run migration:migrate
```

Manual UAT:

1. Menu → create `Bar` and `Cuisine` printers.
2. Assign a product to Bar only → complete an order → DB row shows snapshot on `order_items`.
3. Test print button → `printing_jobs` row with `document_type=kitchen_test`.

Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```
