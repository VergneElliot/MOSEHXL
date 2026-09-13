# 515 — Plan de salle table DnD + click focus (IMPLEMENTATION)

## Summary

Plan de salle: last clicked table is the page « table active » (incl. libre).
Drag table→table opens Transférer / Fusionner. Transfer/merge tabs show after any
table focus.

## Files changed

- `FloorCanvasView.tsx`, `FloorCanvasTableNode.tsx`, `floorSelectDropHit.ts`
- `TableDropActionDialog.tsx`
- `floorPlanTableOps.ts`, `useFloorPlanManagement.ts`
- `FloorPlanConsultPanel.tsx`
- Baseline: `FloorCanvasView` dropped under 400-line cap

## Verification

- [x] `tsc` / module-size
- [ ] Manual: click libre → banner + highlight; drag occupied→libre → Transférer;
      occupied→occupied → Fusionner; modes Transférer/Fusionner after focus
