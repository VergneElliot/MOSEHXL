# 479 — Planning series edit + reset all (IMPLEMENTATION)

## Summary

Admins can update or delete an entire recurring shift series in one action, and wipe all establishment shifts via a confirmed reset.

## Behaviour

- Editing a shift with `series_id` opens a scope dialog: **Cette vacation seulement** / **Toute la série**.
- Series update applies the **time delta** of the edited occurrence to every sibling (spacing preserved) plus shared employee / label.
- Deleting a series shift offers the same scope choice.
- **Réinitialiser le planning** → confirmation → `POST /admin/planning/shifts/reset` with `{ confirm: true }`.

## Files changed

- `MuseBar/backend/src/models/staffShift.ts` — `listBySeries`, `updateSeriesFromAnchor`, `deleteSeries`, `deleteAll`, `applySeriesTimeDelta`
- `MuseBar/backend/src/models/staffShift.series.test.ts` — delta unit tests
- `MuseBar/backend/src/routes/admin/planning.ts` — `apply_to` on PATCH/DELETE; `POST /shifts/reset`
- `MuseBar/src/services/api/adminSpace.ts` — client helpers
- `MuseBar/src/components/Administration/PlanningPanel.tsx` — dialogs + reset button

## Verification results

- [x] `vitest` `staffShift.series.test.ts` — pass
- [x] frontend + backend `tsc --noEmit` — pass
- [ ] Manual: edit weekly series → “Toute la série”; reset with confirm

## Fiscal impact

**MINOR** — planning admin UX only; no ISCA / journal changes.
