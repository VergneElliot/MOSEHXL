# 424 - Product Options & Kitchen Printing - Plan

Date: 2026-07-01  
Scope: Planning / product options, POS capture, kitchen ticket printing

---

## 1) Context

MOSEHXL POS needs restaurant-grade ordering metadata and kitchen printing:

1. **Preset parameters** — reusable groups (e.g. Cuisson) with mandatory preset choices.
2. **Free-text notes** — ad-hoc messages at order time (e.g. sans citron) without pre-programming every product.
3. **Kitchen printer routing** — per-product assignment to one or more named printers (bar, cuisine, or none).
4. **Kitchen-only display** — options appear on order tickets, not on receipts or invoices.

Locked decisions:

- Print kitchen tickets **on payment** (direct sale v1).
- Print **cancellation** slips to kitchen on annulation.
- Table number and waiter ID deferred to future open-table work.
- No prices on kitchen tickets.

---

## 2) Deliverable

Full step-by-step implementation plan:

`docs/roadmaps/2026-07-01-PRODUCT-OPTIONS-AND-KITCHEN-PRINTING.md`

Covers:

- Domain model and migrations
- API surface
- Backend hook points (`orderCreationService`, `OrderCancellationService`)
- POS and menu UI changes
- Bridge multi-printer routing
- Six delivery phases with acceptance criteria
- Fiscal boundary (operational only, not ISCA evidence)
- Testing strategy and PR sequence

---

## 3) Next step

Begin **Phase 1** — schema + option group admin API + menu UI.

No code changes in this patch note.

---

## 4) Verification

Documentation-only. Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```
