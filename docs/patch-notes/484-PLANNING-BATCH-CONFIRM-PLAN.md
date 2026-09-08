# 484 — Planning batch save + selective employee confirm (PLAN)

## Context

Today every shift **create** emails the employee immediately; updates/deletes never notify. Employees get either too many emails or miss changes. Admins need to draft several planning edits, then save once and notify each employee with a single summary they can confirm selectively.

## Scope

- Admin Planning: local draft queue + **Enregistrer les modifications** + unsaved-changes guard
- On save: persist creates/updates/deletes; one confirmation email per affected employee
- Email: list of precise changes + link to public page (no one-click auto-submit)
- Public page: confirm all / refuse all / per-shift checkboxes + motif on refuse
- Stop per-create emails from the admin UI path

## Approach

1. Migration: `staff_shift_confirmation_batches` + `staff_shift_confirmation_items`; `staff_shifts.decline_reason`
2. `POST /admin/planning/shifts/commit` applies ops, opens one batch per employee, sends emails
3. Existing `POST /shifts` no longer sends mail when used (commit is the notify path); create still can set pending for legacy
4. Public GET/POST keyed by batch `token`; decisions per item; update decline restores previous snapshot
5. Deletes: applied on commit; listed in email as annulées (informational, not decidable)
6. Frontend: dirty ops, save bar, `beforeunload` + discard confirm
7. Rewrite shift email template for change list + single CTA

## Verification

- [ ] Commit with multi-employee multi-ops → one email each
- [ ] Public selective confirm/refuse + motif persisted
- [ ] Unsaved leave warning
- [ ] Fiscal: MINOR

## Risks

- Large series creates still materialize many rows on commit (same as today)
- In-flight old confirm tokens remain valid until responded; new save mints a new batch for new pending rows
