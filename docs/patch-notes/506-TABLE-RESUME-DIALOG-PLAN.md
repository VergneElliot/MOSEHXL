# 506 — Plan de salle table resume dialog (PLAN)

## Context

In Plan de salle « Ouvrir / charger » mode, clicking a table jumped straight into
Caisse POS. Staff need a short resume of the open addition (line statuses and
timers) before committing to the POS session.

## Scope

- Frontend only: `useFloorPlanManagement`, new `TableResumeDialog` + timer helpers.
- Reuse existing `GET /floor/tickets/:id` (draft + validated lines).
- Transfer / merge modes unchanged.
- No migration; no change to validate timestamps (`validated_at` / `kitchen_sent_at`
  still set together today).

## Approach

1. Intercept select-mode table click → `resumeTable` state instead of immediate open.
2. Dialog: header (table, waiter, covers), ticket timers, line list with status chips
   and per-line age, totals, CTA « Ouvrir en caisse ».
3. Free table: « Table libre » + same CTA.
4. Live relative times tick every 30s.

## Verification

- [ ] Unit: timer / summary helpers
- [ ] Manual: occupied table → dialog → open POS; free table; transfer/merge unchanged
- [ ] Fiscal impact: MINOR (non-ISCA UX)

## Risks

Low — open path only delayed by an extra confirm dialog; PIN still required to open
in Caisse via existing `openTableInSession`.

## Follow-up (out of scope)

Split kitchen lifecycle (`validated` → sent / served) with distinct timestamps and
staff/kitchen actions; stop setting `kitchen_sent_at` on validate; surface those
statuses in the same resume dialog.
