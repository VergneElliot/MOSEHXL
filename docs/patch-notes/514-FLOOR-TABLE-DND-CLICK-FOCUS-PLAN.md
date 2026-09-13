# 514 — Plan de salle table DnD + click focus (PLAN)

## Context

On Plan de salle, staff want a fast way to move additions between tables, and the
« table active » banner should follow the last clicked table (including libre),
not only the last POS-bound ticket.

## Scope

1. Drag a table onto another in select mode → dialog Transférer / Fusionner.
2. Page focus (`focusTableId`) = latest clicked table; canvas highlight + banner.
3. Transfer / merge mode toggles available once a table is focused.
4. Existing click modes (transfer / merge) and resume dialog unchanged in intent.

## Approach

- `FloorCanvasView` select-drop drag + hit-test; `TableDropActionDialog`.
- `useFloorPlanManagement`: focus, prime source, confirm drop transfer/merge.
- Consult panel wires `onTableDrop`, focus-based `isActive`, banner.

## Fiscal impact

MINOR (non-ISCA UX / existing floor transfer-merge APIs).
