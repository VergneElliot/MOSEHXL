# 478 — Planning series edit + reset all (PLAN)

## Context

Recurring shifts (`series_id`) are created in bulk (e.g. 26 weekly), but PATCH/DELETE only touch one row. Admins who mistype a recurring vacation must edit each occurrence. There is also no way to wipe an establishment’s planning in one action.

## Scope

- Backend `StaffShiftModel`: update/delete by `series_id`; delete-all for establishment
- Routes under `/api/admin/planning`
- `PlanningPanel`: dialog “cette vacation / toute la série” on save & delete; “Réinitialiser le planning” with confirmation
- Client helpers in `adminSpace.ts`

## Approach

1. On edit of a shift with `series_id`, ask scope: `one` | `series`.
2. Series update: apply the **time delta** of the edited occurrence to every sibling (same duration), plus shared `user_id` / `label` / `note`.
3. Series delete: delete all rows with that `series_id`.
4. Reset: `DELETE` all `staff_shifts` for the establishment after explicit confirm payload.

## Verification

- [ ] Unit/model tests for series update delta and delete-all
- [ ] Manual: edit one weekly shift → “toute la série” updates siblings
- [ ] Manual: reset clears planning after confirmation
- [ ] Fiscal impact: MINOR (non-ISCA admin UX)

## Risks

- Past confirmed shifts in a series are rewritten — intentional; admin must confirm.
- Leave overlap checks on series bulk update: check first occurrence only vs each — prefer each sibling against approved leave and fail closed if any conflict.
