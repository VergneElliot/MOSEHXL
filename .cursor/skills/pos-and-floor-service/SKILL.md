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

Permissions: `access_pos`, `pos_reassign_waiter`, `pos_intervene_table`, `manage_floor_plan` (editor only).

## Open tickets and orders

- Tables: `open_tickets` + `open_ticket_items` (`line_status`: draft / validated / cancelled)
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

- `ProductGrid`: `React.memo` + `react-virtuoso`
- Pricing: `usePOSCatalogLogic` → `@mosehxl/types` `calculateHappyHourPrice`

## Refinement status (living)

Update this table as you finish page-by-page polish:

| Area | Status |
|------|--------|
| Caisse (cart, payment, catalog) | **refined** |
| Historique (orders, returns, ongoing) | **refined** |
| Plan de salle tab | **in progress — major work remaining** |
| Caisse floor map dialog | follows Plan de salle / floor API |
| Administration floor editor | see `administration-space` skill |

## Related skills

- `administration-space` — Plans de tables editor, not runtime floor tab
- `legal-journal-compliance` — SALE on completed orders
- `auth-and-multi-tenancy` — PIN actor middleware
- `printing-and-receipts` — kitchen tickets
