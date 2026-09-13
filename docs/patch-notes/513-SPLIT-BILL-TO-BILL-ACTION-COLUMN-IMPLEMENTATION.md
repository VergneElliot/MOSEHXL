# 513 — Split board bill-to-bill DnD + action column (IMPLEMENTATION)

## Summary

Split board is three columns (pool | Actions | payments). Bill lines are draggable
(HTML5 + shared touch DnD) onto other bills or back to the pool. Actions host Parts
égales, → Paiement N, and Répartir….

## Files changed

- `SplitActionPanel.tsx`, `SplitBillItemRow.tsx`, `SplitPoolDropPaper.tsx`
- `SplitBoard.tsx` — layout + wiring
- `splitDnD.ts` — `SPLIT_POOL_DROP_ID`
- `splitAssignment.ts` — `moveItemsToBill` clears by `sourceItemId`

## Verification

- Module size / `tsc` pass
- Manual: pool→bill, bill→bill, bill→pool; middle buttons with selection
