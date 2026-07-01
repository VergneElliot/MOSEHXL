# MOSEHXL — Product Options & Kitchen Printing

**Date:** 2026-07-01  
**Branch baseline:** `development` (HEAD `722b4df`)  
**Status:** In progress — Phase 3 done (2026-07-01)  
**Branch baseline:** `development`  
**Scope:** Reusable product parameters (presets + free text), POS capture, kitchen/bar order tickets routed to named printers, cancellation tickets. Fiscal receipts and invoices unchanged.

> Companion patch note: `docs/patch-notes/424-PRODUCT-OPTIONS-KITCHEN-PRINTING-PLAN.md`

---

## 0. Executive summary

This feature adds **operational ordering metadata** and **kitchen printing** on top of the existing direct-sale POS. It does **not** change fiscal document content (receipts, invoices, legal journal amounts).

Three capabilities, one coherent model:

| Capability | Example | Where it appears |
|------------|---------|------------------|
| **Preset parameters** | Cuisson: saignant / à point / bien cuit (mandatory) | Kitchen ticket only |
| **Free-text note** | “sans citron” on a drink (optional, on the fly) | Kitchen ticket only |
| **Printer routing** | Mojito → Bar printer; Entrecôte → Cuisine printer | Kitchen ticket dispatch |

**Locked product decisions (2026-07-01):**

1. Kitchen tickets print **on order completion (payment)** — not when items are added to cart.
2. **Cancellations** (full/partial) also produce kitchen tickets (e.g. “ANNULATION commande #20”).
3. **Table number** and **waiter/staff ID** are **out of scope** for v1 (future open-table / ongoing-order work).
4. **Receipts and invoices** exclude parameters and custom notes (same as excluding kitchen pricing).
5. Kitchen tickets exclude prices (operational slip, not fiscal).

**Future (explicitly deferred):** open tables, ongoing unpaid orders, staff attribution, fire-on-add course timing.

---

## 1. Problem inventory

| ID | Gap | Evidence today |
|----|-----|----------------|
| **O1** | No reusable product option groups | `products` has price/tax/category only |
| **O2** | No per-line option storage on orders | `order_items` has `description` for Divers only |
| **O3** | POS cannot block add until mandatory option chosen | `usePOSState.addToOrder` adds immediately |
| **O4** | Single printing destination per establishment | `printing_configurations` + one active provider |
| **O5** | No kitchen ticket document type | `BridgePrintDocumentType` = receipt/invoice/closure/test |
| **O6** | Bridge supports one printer | `BridgeConfig` has single `printerHost` |
| **O7** | No print hook on order create/cancel | `createOrderWithCompliance` / `OrderCancellationService` have no kitchen dispatch |

---

## 2. Domain model

### 2.1 Naming (code + UI)

| Concept | DB / API name | French UI label |
|---------|---------------|-----------------|
| Option group | `product_option_group` | Paramètre |
| Preset choice | `product_option_choice` | Valeur prédéfinie |
| Product ↔ group link | `product_option_group_product` | (checkbox in product form) |
| Kitchen printer | `kitchen_printer` | Imprimante commande |
| Product ↔ printer route | `product_kitchen_printer` | Imprimantes de commande |
| Line snapshot | `order_item_option` | (shown in cart / history) |

Use **“option”** in code (industry-standard) and **“paramètre”** in French UI.

### 2.2 Option group semantics

Each group belongs to one establishment and defines how the POS prompts:

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID or SERIAL | Prefer UUID for new tables (consistent with establishments) |
| `establishment_id` | UUID | RLS |
| `name` | VARCHAR(100) | e.g. `Cuisson`, `Note boisson` |
| `is_required` | BOOLEAN | If true, POS blocks add until satisfied |
| `allow_free_text` | BOOLEAN | Enables ad-hoc text instead of / in addition to presets |
| `free_text_label` | VARCHAR(100) NULL | e.g. `Note pour le bar` (placeholder) |
| `free_text_max_length` | INTEGER | Default 120 |
| `display_order` | INTEGER | Sort in POS modal |
| `is_active` | BOOLEAN | Soft hide without deleting history |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**v1 constraint:** single selection per group (radio). No multi-select.

**Modes supported by one group:**

| `is_required` | `allow_free_text` | Preset choices | POS behaviour |
|---------------|-------------------|----------------|---------------|
| true | false | ≥1 | Must pick one preset (cuisson) |
| false | true | 0+ | Optional free text; optional preset chips if choices exist |
| true | true | ≥1 | Must pick preset **or** enter text (pick one rule: **preset OR text**, not both — document in validation) |

**Recommended v1 rule for `required + allow_free_text`:** require **either** a selected preset **or** non-empty free text (useful for “Note obligatoire” products).

### 2.3 Option choices

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID/SERIAL | |
| `group_id` | FK | CASCADE on group delete (or soft-delete group only) |
| `label` | VARCHAR(100) | Display + snapshot text |
| `display_order` | INTEGER | |
| `is_active` | BOOLEAN | |

### 2.4 Product assignments

**`product_option_group_products`**

| Field | Notes |
|-------|-------|
| `product_id` | FK `products` |
| `group_id` | FK `product_option_groups` |
| UNIQUE (`product_id`, `group_id`) | |

**`product_kitchen_printers`**

| Field | Notes |
|-------|-------|
| `product_id` | FK `products` |
| `kitchen_printer_id` | FK `kitchen_printers` |
| UNIQUE (`product_id`, `kitchen_printer_id`) | Many-to-many: product can route to bar **and** cuisine |

No rows = **no kitchen print** for that product.

### 2.5 Kitchen printers

New table — separate from receipt `printing_configurations` (receipt path stays as-is).

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `establishment_id` | UUID | RLS |
| `name` | VARCHAR(100) | `Bar`, `Cuisine` |
| `slug` | VARCHAR(64) | Stable bridge routing key, e.g. `bar`, `cuisine` |
| `connection_type` | ENUM | `bridge` \| `network_escpos` (v1) |
| `connection_config` | JSONB | `{ "host": "192.168.0.95", "port": 9100 }` or `{ "bridgeTarget": "bar" }` |
| `is_active` | BOOLEAN | |
| `display_order` | INTEGER | |

Receipt printer remains the existing establishment printing config. Kitchen printers are additive.

### 2.6 Order line options (immutable snapshot)

**`order_item_options`**

| Field | Type | Notes |
|-------|------|-------|
| `id` | SERIAL | |
| `order_item_id` | FK `order_items` | |
| `group_id` | FK nullable | NULL if group deleted later |
| `group_name_snapshot` | VARCHAR(100) | e.g. `Cuisson` |
| `choice_id` | FK nullable | |
| `choice_label_snapshot` | VARCHAR(100) NULL | e.g. `Bien cuit` |
| `free_text` | VARCHAR(120) NULL | e.g. `sans citron` |
| `display_order` | INTEGER | Preserve group order on ticket |

**Fiscal rule:** these rows are **never** joined into receipt/invoice renderers or legal journal payloads.

### 2.7 Kitchen print jobs metadata

Extend `printing_jobs` usage (no schema change required if `metadata` JSONB suffices):

```json
{
  "kitchen_printer_id": "uuid",
  "kitchen_printer_slug": "bar",
  "order_id": 42,
  "ticket_kind": "order" | "cancellation",
  "cancellation_type": "full" | "partial" | "items-only",
  "original_order_id": 20,
  "lines": [
    {
      "quantity": 2,
      "product_name": "Mojito",
      "options": [
        { "group_name": "Note", "free_text": "sans citron" }
      ]
    }
  ]
}
```

New `document_type` values: `kitchen_order`, `kitchen_cancellation`.

---

## 3. Architecture overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ Menu admin                                                       │
│  Option groups CRUD → assign to products → assign printers      │
└────────────────────────────┬────────────────────────────────────┘
                             │ GET catalog includes assignments
┌────────────────────────────▼────────────────────────────────────┐
│ POS                                                              │
│  Tap product → OptionModal (if groups) → cart line + options    │
│  Pay → POST /orders (items + options)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ Backend orderCreationService                                       │
│  1. Validate options vs product assignments (server-side)        │
│  2. Persist order_items + order_item_options                       │
│  3. Legal journal (unchanged — no options)                         │
│  4. kitchenTicketDispatchService.dispatchForOrder(orderId)         │
└────────────────────────────┬───────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   kitchen_printer:bar  kitchen_printer:cuisine   (skip if no routes)
         │                   │
         └─────────┬─────────┘
                   ▼
         printing_jobs (document_type=kitchen_order)
                   ▼
         Bridge polls → routes by metadata.kitchen_printer_slug
                   ▼
         ESC/POS ticket (no prices, with options)
```

**Cancellation path:** `OrderCancellationService.cancelUnified` → after successful journal write → `dispatchForCancellation(...)`.

---

## 4. API design

### 4.1 Option groups (establishment admin / menu write)

Base: `/api/product-option-groups`  
Permission: `P.access_menu` (same as products)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List groups with nested choices |
| POST | `/` | Create group |
| PUT | `/:id` | Update group |
| DELETE | `/:id` | Soft-delete (`is_active=false`) or hard-delete if unused |
| POST | `/:id/choices` | Add choice |
| PUT | `/:id/choices/:choiceId` | Update choice |
| DELETE | `/:id/choices/:choiceId` | Remove choice |

### 4.2 Product assignment

Extend existing product endpoints (preferred) to avoid N+1 admin calls:

| Approach | Detail |
|----------|--------|
| **A (recommended)** | `GET /api/products` embeds `option_group_ids[]` and `kitchen_printer_ids[]` |
| | `PUT /api/products/:id` accepts `option_group_ids`, `kitchen_printer_ids` |
| **B** | Separate `/api/products/:id/option-groups` — more REST-pure, more round trips |

### 4.3 Kitchen printers

Base: `/api/kitchen-printers`  
Permission: `P.access_menu` for CRUD; `P.access_pos` for read-only list in POS if needed

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List printers |
| POST | `/` | Create |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Soft-delete; block if referenced |
| POST | `/:id/test-print` | Print test kitchen ticket |

### 4.4 Orders — extend create payload

`POST /api/orders` items array gains optional `options`:

```typescript
interface CreateOrderItemOptionInput {
  group_id: string;
  choice_id?: string | null;
  free_text?: string | null;
}

interface CreateOrderItemInput {
  // ...existing fields...
  options?: CreateOrderItemOptionInput[];
}
```

**Server validation (`orderOptionValidationService`):**

1. Load product’s assigned groups for each line with `product_id`.
2. For each assigned group: if `is_required`, line must include exactly one entry for that group satisfying preset OR free-text rule.
3. Reject unknown `group_id` / `choice_id` not linked to product.
4. Reject free text when `allow_free_text=false`.
5. Reject both `choice_id` and `free_text` when group is preset-only (unless rule allows OR).
6. Snapshot labels at persist time (never trust client strings for labels).

### 4.5 Catalog for POS

`GET /api/products` (and single product) returns:

```typescript
interface ProductWithOperationalMeta {
  // ...existing...
  option_groups: Array<{
    id: string;
    name: string;
    is_required: boolean;
    allow_free_text: boolean;
    free_text_label: string | null;
    free_text_max_length: number;
    display_order: number;
    choices: Array<{ id: string; label: string; display_order: number }>;
  }>;
  kitchen_printer_ids: string[];
}
```

POS caches this with products on load (same as today).

---

## 5. Backend implementation detail

### 5.1 New modules (suggested paths)

```text
MuseBar/backend/src/
  models/database/productOptionGroupModel.ts
  models/database/productOptionChoiceModel.ts
  models/database/kitchenPrinterModel.ts
  models/database/orderItemOptionModel.ts
  services/productOptions/productOptionValidationService.ts
  services/productOptions/productOptionAssignmentService.ts
  services/kitchenPrinting/kitchenTicketDispatchService.ts
  services/kitchenPrinting/kitchenTicketRenderer.ts
  services/kitchenPrinting/kitchenTicketGrouping.ts
  routes/productOptionGroups.ts
  routes/kitchenPrinters.ts
```

### 5.2 Hook points (exact)

| Event | File | Action |
|-------|------|--------|
| Order created (completed) | `services/orders/orderCreationService.ts` | After journal success, call `kitchenTicketDispatchService.dispatchForOrder` |
| Order cancelled | `services/orders/orderCancellationService.ts` | After journal success, call `dispatchForCancellation` |
| Receipt build | `printing/printDataRepo.ts` | **No change** — do not load `order_item_options` |
| Invoice build | invoice print paths | **No change** |

Kitchen dispatch must be **non-blocking for fiscal success**: if ticket enqueue fails, log + audit software event; do **not** roll back the order (same class as optional receipt print). Document this in runbook.

### 5.3 Ticket grouping algorithm

`kitchenTicketGrouping.ts`:

1. Load order items with options and each product’s `kitchen_printer_ids` (snapshot routes on order creation — see §5.4).
2. Build map `printerId → lines[]`.
3. For each printer with ≥1 line, render one ticket.
4. If one product routes to two printers, **duplicate the line** on both tickets (explicit product decision).

### 5.4 Route snapshot on order (recommended)

Add **`order_item_kitchen_printer_snapshots`** or JSONB on `order_items`:

```json
{ "kitchen_printer_ids": ["uuid-bar", "uuid-cuisine"] }
```

Snapshot at order time so later menu edits do not rewrite history or cancellation tickets.

### 5.5 Cancellation ticket content

For `cancellationType=full` on order `#20`:

```text
************************
     ANNULATION
   Commande #20
   14:32
************************
2x Mojito
   sans citron
1x Entrecôte
   bien cuit
------------------------
```

For partial: only cancelled lines (from `cancelledItems` in `OrderCancellationService`). Header references original order id.

### 5.6 Renderer

`kitchenTicketRenderer.ts` — ESC/POS via existing `BasePrintingService` helpers or dedicated slim builder:

- Large header: `COMMANDE #42` or `ANNULATION #20`
- Timestamp
- Per line: `qty x product_name`
- Indented option lines: `group: value` or free text only
- No prices, no TVA, no fiscal footer
- ASCII-safe (reuse thermal sanitization from receipt path)

### 5.7 Bridge multi-printer

**Phase 4 scope:**

1. Extend `BridgePrintDocumentType` with `kitchen_order`, `kitchen_cancellation`.
2. Job `metadata.kitchen_printer_slug` required for kitchen jobs.
3. Bridge `config.ts`: support `PRINTERS_JSON` env:

```json
[
  { "slug": "bar", "host": "192.168.0.95", "port": 9100 },
  { "slug": "cuisine", "host": "192.168.0.96", "port": 9100 }
]
```

4. `networkEscpos.ts`: select host by slug from metadata; fallback to legacy single `PRINTER_HOST` for receipt jobs.
5. Update `docs/runbooks/PRINT-BRIDGE-V1.md`.

**Alternative for v1:** one bridge process per printer (two `.env` files). Simpler but worse ops — document as fallback only; prefer slug routing.

### 5.8 Network ESC/POS without bridge

`connection_type=network_escpos` on `kitchen_printers`: backend sends directly when API is on LAN (same pattern as `NetworkEscPosPrintService`). Cloud deployments use bridge only.

---

## 6. Frontend implementation detail

### 6.1 Menu admin

| Component | Change |
|-----------|--------|
| New `Menu/OptionGroupsSection.tsx` | CRUD list for parameter groups + inline choice editor |
| New `Menu/OptionGroupDialog.tsx` | Create/edit group (required, free text, choices) |
| `Menu/ProductDialog.tsx` | Checkboxes: linked option groups; linked kitchen printers |
| `Menu/MenuContainer.tsx` | Tab or section “Paramètres” |
| New `Settings/KitchenPrintersSection.tsx` | Or under Menu/Settings — printer CRUD |

Use `P.access_menu` gating (already on menu routes).

### 6.2 POS

| Component | Change |
|-----------|--------|
| `types/orders.ts` | `OrderItemOption` type; `options?` on `OrderItem` |
| `hooks/usePOSState.ts` | `addToOrder` may receive options; line identity = product + options signature for merge logic |
| New `POS/ProductOptionDialog.tsx` | Modal: radio presets, optional text field, validate required |
| `POS/ProductGrid.tsx` | On tap: if product has option groups → open dialog; else add directly |
| `POS/OrderSummaryItem.tsx` | Show option badges under product name |
| `services/api/orders.ts` | Map `options` in create payload |
| `hooks/usePOSAPI.ts` | Pass options through |

**Cart merge rule:** same `productId` + identical options → increment qty; different options → separate lines (standard POS behaviour).

### 6.3 History

Read-only display of options on past order lines (load `order_item_options` via extended order GET). No edit.

### 6.4 i18n

Add FR strings under `MuseBar/src/i18n/` for paramètre, note, cuisson examples, kitchen printer labels, validation errors.

---

## 7. Shared types

Update `MuseBar/packages/types/src/index.ts`:

- `ProductOptionGroup`, `ProductOptionChoice`
- `KitchenPrinter`
- `OrderItemOption`
- Extend `ProductRecord`, order create DTOs

Keep backend + frontend in sync via workspace package.

---

## 8. Phased delivery plan

Each phase = one PR series + patch note + green CI before next phase.

### Phase 1 — Schema & option group admin (effort: M)

**Status:** Done on 2026-07-01. See `docs/patch-notes/425-PRODUCT-OPTIONS-PHASE1-SCHEMA-API-MENU-ADMIN-IMPLEMENTATION.md`.

**Goal:** Configure parameters in menu; no POS or printing yet.

**Steps:**

1. Migration: `product_option_groups`, `product_option_choices`, `product_option_group_products`.
2. Models + routes for option groups CRUD.
3. Extend `ProductModel` / product routes for group assignment arrays.
4. Menu UI: Option groups section + product dialog checkboxes.
5. Tests: route tests for CRUD, assignment, RLS tenant isolation.

**Acceptance:**

- [x] Create “Cuisson” with 3 choices; attach to “Entrecôte”.
- [x] API returns embedded groups on `GET /products`.
- [x] CI green; no POS behaviour change.

**Patch note:** `425-PRODUCT-OPTIONS-PHASE1-SCHEMA-API-MENU-ADMIN-IMPLEMENTATION.md`

---

### Phase 2 — POS capture & order persistence (effort: M)

**Status:** Done on 2026-07-01. See `docs/patch-notes/426-PRODUCT-OPTIONS-PHASE2-POS-ORDER-PERSISTENCE-IMPLEMENTATION.md`.

**Goal:** Mandatory cuisson works; options stored on order; fiscal docs unchanged.

**Steps:**

1. Migration: `order_item_options`.
2. `productOptionValidationService` + extend `orderCreationService`.
3. Extend `OrderItemModel.create` transaction to insert options.
4. Extend order GET to return options on items.
5. `ProductOptionDialog` + ProductGrid integration.
6. Cart display + createOrder payload mapping.
7. Tests: validation rejects missing required option; accepts free text; journal unchanged.

**Acceptance:**

- [x] Cannot complete order with meat missing cuisson.
- [x] Drink with “sans citron” persists and shows in history.
- [x] Receipt preview still shows product name only (no options).
- [x] Legal journal entry unchanged (spot-check metadata).

**Patch note:** `426-PRODUCT-OPTIONS-PHASE2-POS-ORDER-PERSISTENCE-IMPLEMENTATION.md`

---

### Phase 3 — Kitchen printers admin (effort: S–M)

**Status:** Done on 2026-07-01. See `docs/patch-notes/427-PRODUCT-OPTIONS-PHASE3-KITCHEN-PRINTERS-ADMIN-IMPLEMENTATION.md`.

**Goal:** Define bar/cuisine printers per establishment.

**Steps:**

1. Migration: `kitchen_printers`, `product_kitchen_printers`.
2. Routes + model + Settings/Menu UI.
3. Extend product dialog with printer checkboxes.
4. Migration: `order_items.kitchen_printer_ids_snapshot JSONB` (or child table).
5. Snapshot printer routes on order line create.
6. Test print endpoint (dry enqueue).

**Acceptance:**

- [x] Two printers configured; product assigned to bar only.
- [x] Snapshot stored on completed order lines.

**Patch note:** `427-PRODUCT-OPTIONS-PHASE3-KITCHEN-PRINTERS-ADMIN-IMPLEMENTATION.md`

---

### Phase 4 — Kitchen order tickets on payment (effort: M)

**Goal:** Physical ticket on completed sale.

**Steps:**

1. `kitchenTicketRenderer` + `kitchenTicketGrouping` + `kitchenTicketDispatchService`.
2. Extend `BridgePrintDocumentType`; enqueue from `orderCreationService`.
3. Bridge slug routing (`PRINTERS_JSON`).
4. Runbook update.
5. Integration test: completed order with 2 printers → 2 jobs with correct metadata.
6. Manual UAT: bar printer prints options, no prices.

**Acceptance:**

- [ ] Pay order → correct printer receives ticket with options.
- [ ] Product with no printer assignment → no kitchen job.
- [ ] Product on two printers → duplicate line on both.
- [ ] Receipt print path unaffected.

---

### Phase 5 — Kitchen cancellation tickets (effort: S)

**Goal:** Kitchen notified on annulation.

**Steps:**

1. `dispatchForCancellation` in `OrderCancellationService` after successful cancel.
2. `document_type=kitchen_cancellation` + ANNULATION header template.
3. Partial cancel: only cancelled lines, grouped by printer using snapshots from original items.
4. Tests: full cancel order 20 → job references #20.

**Acceptance:**

- [ ] Full annulation prints “ANNULATION commande #N” on affected printers.
- [ ] Partial annulation prints only removed items.
- [ ] Change operations (`Faire de la Monnaie`) do not print kitchen tickets.

---

### Phase 6 — Hardening & polish (effort: S)

**Steps:**

1. Software event logging when kitchen enqueue fails.
2. Admin: duplicate option group, reorder choices.
3. POS: keyboard-friendly option modal (large tap targets).
4. OpenAPI update (`openapi.yaml`).
5. Optional: reprint kitchen ticket from history (admin only) — **stretch**; not required for v1.

**Acceptance:**

- [ ] Failed ticket logged; order still completed.
- [ ] Docs/runbook complete.

---

## 9. Testing strategy

| Layer | What to test |
|-------|----------------|
| Unit | `productOptionValidationService`, grouping, renderer output bytes |
| Route | Option groups CRUD, order create with options, kitchen printer CRUD |
| Integration | Order create → `printing_jobs` rows; cancel → cancellation jobs |
| Fiscal regression | Receipt/invoice snapshots unchanged; journal amounts unchanged |
| Bridge | Claim job with slug → correct host (mock socket) |
| E2E manual | Cuisson flow, sans citron, bar vs cuisine routing, annulation slip |

**Explicit regression cases:**

- Divers items (no `product_id`) — options optional; no kitchen route unless configured by category later (v1: skip kitchen for null product_id).
- Split payment orders — one kitchen dispatch per order, not per sub-bill.
- Happy hour / offert lines — options still print; prices still omitted.

---

## 10. Security & permissions

| Action | Permission |
|--------|------------|
| Manage option groups / kitchen printers | `P.access_menu` |
| POS read catalog with options | `P.access_pos` |
| Create orders with options | existing order create permissions |
| Test kitchen print | `P.access_menu` or establishment admin |

All new tables: RLS policies matching `products` / `printing_jobs` patterns (`app_current_establishment_id()`).

---

## 11. Fiscal & compliance boundary

Document in patch notes and `docs/legal/self-certification/01-SCOPE.md` (adjacent note only when implementing):

- Kitchen tickets are **operational**, not part of the NF-525 / ISCA evidence chain.
- `order_item_options` are excluded from receipt, invoice, closure bulletin, and legal journal payloads.
- No change to hash chain, immutability triggers, or closure logic.

---

## 12. Future extensions (out of v1)

| Feature | Preparation in v1 |
|---------|-------------------|
| Open table / ongoing order | `orders.status=pending` + fire on add; hook dispatch at item-add instead of payment |
| Waiter / staff ID on ticket | Add `orders.server_user_id`; include in ticket header |
| Table number | Add `orders.table_label`; include in ticket header |
| Fire by course | `order_items.course` + dispatch per wave |
| Category-default printer | `category_kitchen_printers` table |
| Quick-note chips | Optional presets under free-text groups |

Schema choices in v1 (UUIDs, snapshots, slug routing) support these without breaking migrations.

---

## 13. Definition of done (full feature)

- [ ] Reusable option groups configurable in menu with minimal clicks.
- [ ] Products link to groups and kitchen printers via checkboxes.
- [ ] POS enforces required options before add/pay.
- [ ] Free-text operational notes work without pre-programming every product.
- [ ] Options persist on order lines and display in history.
- [ ] Kitchen tickets print on payment to correct printer(s) with options, without prices.
- [ ] Cancellation tickets print to affected kitchen printers.
- [ ] Receipts and invoices exclude options.
- [ ] Bridge routes multi-printer jobs by slug.
- [ ] CI green; fiscal regression tests pass.

---

## 14. Suggested PR / patch note sequence

| PR | Patch note prefix | Content |
|----|-------------------|---------|
| 1 | `424-P1` | Migrations + option group API + menu admin |
| 2 | `425-P2` | Order options validation + POS modal |
| 3 | `426-P3` | Kitchen printers admin + product routing |
| 4 | `427-P4` | Kitchen order ticket dispatch + bridge routing |
| 5 | `428-P5` | Cancellation kitchen tickets |
| 6 | `429-P6` | Hardening, docs, runbook |

---

*This roadmap is the execution plan for product options and kitchen printing. Update phase statuses as work lands.*
