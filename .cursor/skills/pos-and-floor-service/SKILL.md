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
  → useFloorPlanManagement (focus on click, transfer / merge / open / abandon)
  → TableResumeDialog (select mode: resume before Caisse)
  → TableDropActionDialog (drag table→table → transfer / merge)
  → FloorCanvasView (shared with admin editor; select-mode table DnD)
```

In **Ouvrir / charger** (`mode === 'select'`), table click sets page focus
(including libre), opens `TableResumeDialog`, then « Ouvrir en caisse » calls
`openTableInSession`. Dragging a table onto another opens transfer/merge confirm.
Transfer / merge click modes stay available after focus.

Floor API: `services/api/floor.ts` — always send `x-pin-actor-token` on mutations.

Backend: `routes/floor.ts`, `models/database/openTicketModel.ts`, `services/floor/floorTicketAuth.ts`.

## PIN session rules

- Comptoir order create: account login enough; optional PIN → that waiter’s Z
- Table order create / floor mutations: active PIN session required
- Step-up: `StepUpAuthContext.ensurePermission()` for HH / offert / cancel / sensitive nav
- PIN actor token on all floor mutations

Permissions: `access_pos`, `pos_reassign_waiter`, `pos_intervene_table`, `orders_cancel`
(validated retour / paid cancel), `manage_floor_plan` (editor only).

## Delete / retour matrix

| Context | Line state | Gate |
|---------|------------|------|
| Comptoir cart | no table status | **basic** — account session (PIN optional) |
| Table | `draft` (not validated) | **basic** (+ intervene if not owner) |
| Table | `validated` (cuisine) | **`orders_cancel`** (+ intervene if not owner) |
| Table abandon | only drafts | **basic** (+ intervene) |
| Table abandon | has validated | **`orders_cancel`** (+ intervene) |
| Historique | paid / completed | **`orders_cancel`** |

Backend: `PUT .../items` replaces **drafts only**; `POST .../cancel-lines` and abandon-with-validated
require `orders_cancel`. Sync never deletes validated lines.

## Table occupancy (free vs occupied)

| Signal | Meaning |
|--------|---------|
| `has_active_items` | Draft **or** validated lines — table has an order |
| `has_validated_items` | At least one validated line (service en cuisine) |
| Free / transfer target | `!has_active_items` (empty open-ticket shells count as free) |

Empty shells (open ticket, 0 lines) are cancelled on « Laisser ouverte » (discard
drafts), after last retour, and when transferring onto that table. `POST /floor/tickets`
reuses an empty shell instead of conflicting.


## Historique cancel + reopen table

Full `cancel-unified` with `reopen_table: true` (after REFUND):
`reopenTableFromCancelledOrder` opens a **new** ticket and copies lines as validated.
Does not mutate the SALE or flip the closed ticket to open.

## Historique « En cours » fulfillment

Service pipeline after validation (not kitchen print):

| Stage | Storage | UI |
|-------|---------|-----|
| Draft | `line_status = draft` | Not listed on En cours; no « En attente » badge in POS |
| Validé | `validated_at`; `kitchen_sent_at` / `served_at` null | **Validé** |
| Envoyé | `kitchen_sent_at` | **Envoyé** |
| Servi | `served_at` | **Servi** |

Validate must **not** set `kitchen_sent_at`. Advance via
`POST /floor/tickets/:id/items/:itemId/fulfillment` (`sent` | `served`) + PIN.
UI: `OngoingOrdersPanel` / `OngoingOrderTableCard`.
Plan de salle resume (`TableResumeDialog`): same status chips + integer `N×` qty +
grouped identical lines (`tableResumeDisplay.ts`).

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
- Touch DnD (catalog to cart and split pool to bills): shared attachPosTouchDrag —
  500 ms idle press, 10 px move tolerance (scroll wins); desktop HTML5 unchanged
  (posTouchDnD.ts). Split context menu long-press 800 ms.
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
| Comptoir + PIN | `table_label` null + `waiter_user_id` = PIN → individual Z |
| Comptoir no PIN | `waiter_user_id` null → **Total comptoir** (bar caisse) |
| Traceability | Always `account_user_id`; `pin_session_id` when PIN present |
| Activity | `touchActivity` / à suivre — `updated_at` only |

Key modules: `floorTicketAuth.ts` (`requireOpenTicketForActor`), `floorOrderAttribution.ts`,
`orderWaiterDayReport.ts`, `useTableInterventionGate.ts`.

## Related skills

- `administration-space` — Plans de tables editor, not runtime floor tab
- `legal-journal-compliance` — SALE on completed orders
- `auth-and-multi-tenancy` — PIN actor middleware
- `printing-and-receipts` — kitchen tickets
