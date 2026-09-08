---
name: pos-and-floor-service
description: >-
  POS cart, PIN sessions, Plan de salle tab, open tickets, floor map in Caisse,
  waiter assignment, and kitchen printing for MOSEHXL/MuseBar. Use when modifying
  Caisse, Historique ongoing orders, table service, open tickets, floor consult
  tab, or kitchen ticket dispatch.
---

# POS and Floor Service

## Three floor UIs (do not mix up)

| UI | Where | Purpose | Main code |
|----|-------|---------|-----------|
| **Caisse** floor map | POS tab → dialog | Pick table while selling; ties cart to table | `FloorMapDialog.tsx`, `useFloorService` |
| **Plan de salle** tab | Top-level tab `floor_plan` | Transfer, merge, abandon tickets; consult-only canvas | `FloorPlanConsultPanel.tsx`, `useFloorPlanManagement` |
| **Plans de tables** | Administration → Plans de tables | Edit layout (create/move tables) | `FloorPlansPanel.tsx` — see `administration-space` skill |

## Architecture

```
PinSessionsContext (multi-tab carts, sessionStorage)
  → POSContainer
    → usePOSState / usePOSLogic / usePOSAPI
    → useFloorService (Caisse ↔ open tickets sync)
    → ProductGrid, OrderSummary, payment dialogs

Plan de salle tab
  → FloorPlanConsultPanel
    → useFloorPlanManagement (transfer / merge / open / abandon modes)
    → FloorCanvasView (shared with admin editor)
```

Floor API: `services/api/floor.ts` — always send `x-pin-actor-token` on mutations.

Backend: `routes/floor.ts`, `models/database/openTicketModel.ts`, `services/floor/floorTicketAuth.ts`.

## PIN session rules

- Order creation requires active PIN session (`usePOSAPI`)
- Step-up: `StepUpAuthContext.ensurePermission()` for HH / offert / cancel / sensitive nav
- PIN actor token on all floor mutations

Permissions: `access_pos`, `pos_reassign_waiter`, `pos_intervene_table`, `orders_cancel`
(validated retour / paid cancel), `manage_floor_plan` (editor only).

## Delete / retour matrix

| Context | Line state | Gate |
|---------|------------|------|
| Comptoir cart | no table status | **basic** — any PIN session |
| Table | `draft` (not validated) | **basic** (+ intervene if not owner) |
| Table | `validated` (cuisine) | **`orders_cancel`** (+ intervene if not owner) |
| Table abandon | only drafts | **basic** (+ intervene) |
| Table abandon | has validated | **`orders_cancel`** (+ intervene) |
| Historique | paid / completed | **`orders_cancel`** |

Backend: `PUT .../items` replaces **drafts only**; `POST .../cancel-lines` and abandon-with-validated
require `orders_cancel`. Sync never deletes validated lines.

## Open tickets and orders

- Tables: `open_tickets` + `open_ticket_items` (`line_status`: draft / validated / cancelled)
- Every open ticket is created with `opened_by` = `last_served` = opening PIN (always assigned)
- Completed orders snapshot: `waiter_user_id`, `waiter_display_name`, `table_label`
- History: `OngoingOrdersPanel.tsx`, `orderHistoryEnrichment.ts` (backend)
- Migrations: `2026_08_28_14_00_00_open_ticket_item_line_status.sql`, waiter/table snapshot migrations

## Kitchen printing

```
dispatchKitchenTicketsForCompletedOrder
  → kitchenTicketDispatchService
  → kitchenFollowUpDispatchService / kitchenRetourDispatchService
  → kitchenTicketRenderer
```

## Large files (split when touching)

| File | Role |
|------|------|
| `routes/floor.ts` | All floor REST handlers |
| `useFloorService.ts` | Caisse floor sync |
| `useFloorPlanManagement.ts` | Plan de salle tab logic |
| `openTicketModel.ts` | Ticket persistence |
| `POSContainer.tsx` | POS orchestrator |

## Hot path (Caisse catalog)

- `ProductGrid`: plain DOM + static `ProductGrid.css` (no MUI Card/`sx` per card, no Virtuoso).
  ~70 cards stay in DOM; performance target is instant category switch on establishment POS.
- `POSMenuPanel`: passes `catalogView` key to remount grid on mode change; `showFavoriteBadge`
  only on **Tous** / **Favoris**.
- **Tous list keys:** `` `${index}:${product.id}` `` — favorites are duplicated at top and in
  category sections; never use `key={product.id}` alone.
- Pricing: `usePOSCatalogLogic` → `@mosehxl/types` `calculateHappyHourPrice`
- Favoris data: `useTopSellerProductIds` + `posCatalogOrdering.ts`

## Refinement status (living)

Update this table as you finish page-by-page polish:

| Area | Status |
|------|--------|
| Caisse (cart, payment, catalog) | **refined** (specific perms + ownership/Z) |
| Historique (orders, returns, ongoing) | **refined** (+ Total comptoir) |
| Plan de salle tab | **in progress** — takeover removed; abandon gated |
| Caisse floor map dialog | follows Plan de salle / floor API |
| Administration floor editor | see `administration-space` skill |

## Table ownership and Z

| Rule | Detail |
|------|--------|
| Owner moment | PIN that **opens** the table (`open_tickets` create) |
| Live owner field | `last_served_by_user_id` (gates + pay attribution) |
| Historical | `opened_by_user_id` — never updated on reassign |
| Intervene | `pos_intervene_table` — act only; **no** ownership/Z steal |
| Reassign | `pos_reassign_waiter` / Assigner à — sole transfer of ownership + future Z |
| Comptoir | `table_label` null → `waiter_user_id` null → **Total comptoir** in CA report |
| Traceability | Always `account_user_id` + `pin_session_id` (independent of Z) |
| Activity | `touchActivity` / à suivre — `updated_at` only |

Key modules: `floorTicketAuth.ts` (`requireOpenTicketForActor`), `floorOrderAttribution.ts`,
`orderWaiterDayReport.ts`, `useTableInterventionGate.ts`.

## Related skills

- `administration-space` — Plans de tables editor, not runtime floor tab
- `legal-journal-compliance` — SALE on completed orders
- `auth-and-multi-tenancy` — PIN actor middleware
- `printing-and-receipts` — kitchen tickets
