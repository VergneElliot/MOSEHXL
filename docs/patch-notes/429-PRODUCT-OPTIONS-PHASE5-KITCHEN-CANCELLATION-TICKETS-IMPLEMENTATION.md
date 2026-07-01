# 429 - Product Options Phase 5 - Kitchen Cancellation Tickets - Implementation

Date: 2026-07-01  
Roadmap reference: `docs/roadmaps/2026-07-01-PRODUCT-OPTIONS-AND-KITCHEN-PRINTING.md` (Phase 5)

---

## 1) Context

Phase 5 notifies the kitchen when orders are cancelled (full or partial). Tickets
use printer snapshots and option labels from the original order lines. Change
operations (`Faire de la Monnaie`) do not produce kitchen jobs.

---

## 2) What changed

| Area | Change |
|------|--------|
| `kitchenTicketRenderer.ts` | `renderKitchenCancellationTicket` with ANNULATION header |
| `kitchenTicketDispatchService.ts` | `dispatchKitchenTicketsForCancellation` |
| `orderCancellationService.ts` | Dispatch after successful journal write (non-blocking) |

`document_type=kitchen_cancellation` jobs include `original_order_id` and
`cancellation_type` in metadata. Bridge routes them via `PRINTERS_JSON` like
`kitchen_order`.

---

## 3) Outcome

Full annulation prints on all printers that had items on the original order.
Partial annulation prints only removed lines. Monnaie cancellations are unchanged.

**Next:** Phase 6 — hardening and polish.

---

## 4) Verification

```bash
cd MuseBar/backend && npm run type-check && npm run lint && npm run test -- --run
```

Backend: 78 test files / 317 tests green.

Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```
