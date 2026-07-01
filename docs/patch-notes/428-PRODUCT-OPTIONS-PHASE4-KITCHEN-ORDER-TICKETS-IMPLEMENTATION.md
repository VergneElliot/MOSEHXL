# 428 - Product Options Phase 4 - Kitchen Order Tickets on Payment - Implementation

Date: 2026-07-01  
Roadmap reference: `docs/roadmaps/2026-07-01-PRODUCT-OPTIONS-AND-KITCHEN-PRINTING.md` (Phase 4)

---

## 1) Context

Phase 4 prints kitchen/bar command tickets when a sale is completed (payment).
Tickets include product lines and captured options, omit prices, and route to the
correct LAN printer via the print bridge. Order completion and fiscal flows are
unchanged if kitchen enqueue fails.

---

## 2) What changed

### Backend

| Area | Change |
|------|--------|
| `services/kitchenPrinting/kitchenTicketGrouping.ts` | Group order lines by printer snapshot |
| `services/kitchenPrinting/kitchenTicketRenderer.ts` | ESC/POS kitchen ticket (no prices) |
| `services/kitchenPrinting/kitchenTicketDispatchService.ts` | Enqueue `kitchen_order` bridge jobs |
| `services/orders/orderCreationService.ts` | Dispatch after legal journal success (non-blocking) |
| `printing/bridgePrintJobRepo.ts` | `kitchen_order` document type |
| `services/legal/softwareEventJournal.ts` | `KITCHEN_TICKET_ENQUEUE_FAILED` event |

### Bridge

| Area | Change |
|------|--------|
| `bridge/src/config.ts` | Optional `PRINTERS_JSON` slug → host/port map |
| `bridge/src/printers/networkEscpos.ts` | Route kitchen jobs by `metadata.kitchen_printer_slug` |
| `bridge/src/cloudClient.ts` | Poll response includes `metadata` |

### Docs

- `docs/runbooks/PRINT-BRIDGE-V1.md` — multi-printer `PRINTERS_JSON` setup

### Tests

- `kitchenTicketGrouping.test.ts`
- `kitchenTicketRenderer.test.ts`
- `kitchenTicketDispatchService.test.ts`
- `bridge/test/printerRouting.test.js`

---

## 3) Outcome

Paying a completed order enqueues one `kitchen_order` job per printer with lines
and options. Products without printer assignment produce no kitchen job. Receipt
printing is unchanged.

**Next:** Phase 5 — kitchen cancellation tickets.

---

## 4) Verification

```bash
cd MuseBar/backend && npm run type-check && npm run lint && npm run test -- --run
cd MuseBar/bridge && npm test
```

Backend: 78 test files / 315 tests green.

Bridge `.env` example for two kitchen printers:

```env
PRINTERS_JSON=[{"slug":"bar","host":"192.168.0.95","port":9100},{"slug":"cuisine","host":"192.168.0.96","port":9100}]
```

Manual UAT (with bridge running):

1. Assign products to Bar / Cuisine printers.
2. Complete a POS order with options.
3. Confirm bridge logs show `kitchen_order` jobs with correct slugs.
4. Confirm receipt print still works via `PRINTER_HOST`.

Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```
