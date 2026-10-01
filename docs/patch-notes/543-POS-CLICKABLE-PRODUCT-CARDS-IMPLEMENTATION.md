# 543 — POS clickable product cards (IMPLEMENTATION)

## Summary

Product / Divers / Pourboire cards are fully clickable to add to the cart.
« Ajouter » and product→cart drag-and-drop are removed. Quantity `+`/`−`
controls are larger. Floor and split-payment DnD are unchanged.

## Files

- `ProductGrid.tsx` / `ProductGrid.css` — click/keyboard add; bigger qty buttons
- `OrderSummary.tsx`, `POSOrderPanel.tsx`, `POSContainer.tsx` — drop wiring removed
- Deleted: `posProductDnD.ts`, `posProductDrop.ts`, `useOrderSummaryProductDrop.ts`,
  `PosTouchDraggable.tsx`

## Fiscal impact

MINOR (UI only).
