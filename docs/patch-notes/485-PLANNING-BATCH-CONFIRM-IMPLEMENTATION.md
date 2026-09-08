# 485 — Planning batch save + selective employee confirm (IMPLEMENTATION)

## Summary

Planning edits are drafted locally then flushed with **Enregistrer les modifications**. One confirmation email per affected employee lists precise changes; the public page supports confirm/refuse all or a selection with a refuse motif.

## Schema

- Migration `2026_09_03_17_55_26_planning_confirmation_batches.sql`
- `staff_shift_confirmation_batches` / `staff_shift_confirmation_items` (+ RLS)
- `staff_shifts.decline_reason`

## Backend

- `POST /admin/planning/shifts/commit` → `planningCommitService`
- Create `POST /shifts` no longer emails unless `notify: true`
- Public GET/POST `/api/public/planning/confirm/:token` batch-aware (legacy token still works)
- Email template lists changes + single “Voir et répondre” CTA (no auto-submit)

## Frontend

- `PlanningPanel` draft queue + save bar + `beforeunload` + discard dialog
- `PublicShiftConfirmPage` checkboxes, confirm/refuse selection, motif

## Behaviour notes

- Deletes apply on save and appear as informational annulations in the email/page
- Create/update stay `pending_employee` until decided; update refuse restores previous times
- Motif required on refuse

## Fiscal impact

**MINOR**
