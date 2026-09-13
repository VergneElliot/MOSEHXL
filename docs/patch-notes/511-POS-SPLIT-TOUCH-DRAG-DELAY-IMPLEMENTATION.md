# 511 — POS / Split touch drag delay (IMPLEMENTATION)

## Summary

Touch drag arms after **500 ms** idle press (10 px scroll tolerance) via shared
`attachPosTouchDrag` / `usePosTouchDrag`. Product cards and split pool rows use it;
cart and split bills listen via `data-pos-drop`. Split context menu delay **800 ms**.

## Files changed

- `posTouchDnD.ts`, `attachPosTouchDrag.ts`, `usePosTouchDrag.ts`, `usePosDropTarget.ts`
- `posDragGhostChip.ts`, `PosTouchDraggable.tsx`, `posProductDrop.ts`
- `ProductGrid.tsx`, `useOrderSummaryProductDrop.ts`, `OrderSummary.tsx`
- `SplitPoolItemRow.tsx`, `SplitBillDropPaper.tsx`, `splitDnD.ts`, `SplitBoard.tsx`

## Verification

- Unit: touch delay constants + product drop parse
- `check:module-size` / `tsc` pass
- Manual: tablet hold ~0.5s then drag to cart / split bill; scroll still works

## Follow-ups

None for delay; bill-to-bill drag still deferred (452).
