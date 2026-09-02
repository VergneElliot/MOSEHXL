---
name: pos-and-floor-service
description: >-
  POS cart, PIN sessions, floor plan, open tickets, and kitchen printing for
  MOSEHXL/MuseBar. Use when modifying Caisse, table service, open tickets,
  floor map, waiter assignment, or kitchen ticket dispatch.
---

# POS and Floor Service

## Architecture

```
PinSessionsContext (multi-tab carts, sessionStorage)
  → POSContainer (orchestrator)
    → usePOSState / usePOSLogic / usePOSAPI
    → useFloorService (table sync, open tickets)
    → ProductGrid (virtualized, React.memo)
```

Floor API: `services/api/floor.ts` — sends `x-pin-actor-token` header.

Backend: `routes/floor.ts` (large — split when touching), `models/database/openTicketModel.ts`, `services/floor/floorTicketAuth.ts`.

## PIN session rules

- Order creation requires active PIN session (`usePOSAPI`)
- Sensitive actions: `StepUpAuthContext.ensurePermission()` — one-shot grant until session switch
- PIN actor token on API calls for POS mutations

## Open tickets / floor

- `open_tickets` + `open_ticket_items` with `line_status` (draft/validated/cancelled)
- Waiter snapshot on orders: `waiter_user_id`, `waiter_display_name`, `table_label`
- Permissions: `pos_reassign_waiter`, `pos_intervene_table`, `manage_floor_plan`

## Kitchen printing

After order completion:

```
dispatchKitchenTicketsForCompletedOrder
  → kitchenTicketDispatchService
  → kitchenFollowUpDispatchService / kitchenRetourDispatchService
  → kitchenTicketRenderer
```

Config: `routes/kitchenPrinters.ts`, `product_kitchen_printers` table.

## Known large files (split opportunistically)

| File | Lines | Notes |
|------|------:|-------|
| `routes/floor.ts` | ~922 | Candidate for route modules |
| `useFloorService.ts` | ~842 | Split into smaller hooks |
| `POSContainer.tsx` | ~914 | Extract payment/floor/dialog hooks |

## Hot path (ProductGrid)

- `React.memo` + `react-virtuoso` virtualization
- `useMemo`/`useCallback` for filtered products
- Price via `usePOSCatalogLogic.calculateProductPrice` → `@mosehxl/types` `calculateHappyHourPrice`

## Related skills

- `legal-journal-compliance` — completed orders write SALE
- `auth-and-multi-tenancy` — PIN actor middleware
- `printing-and-receipts` — kitchen tickets
