# 560 — Ghost empty tables blocking PIN close (IMPLEMENTATION)

## Summary

Empty open-ticket shells (`status=open`, no draft/validated lines) looked free on
Plan de salle / Historique En cours but still blocked badge close via
`last_served_by_user_id`. Local repro: Elliot owned tables 2 and 102 with 0 lines.

## Fix

1. Before PIN close: cancel empty shells for that waiter, then block only if tickets
   with active lines remain (error lists table labels).
2. `GET /floor/status` sweeps all empty shells for the venue.
3. Badge close closes **all** open PIN rows for that user (duplicate session heal);
   first open also runs `closeDuplicatesForUser`.

## Files

- `openTicketEmptyCleanup.ts` — `abandonEmptyOpenTicketsForWaiter` / `abandonAllEmptyOpenTickets`
- `pinSessionPointage.ts` (+ tests)
- `pinSessionService.ts` (+ tests)
- `floorModel.listStatus` — venue empty-shell sweep
- `pos-and-floor-service` skill

## Fiscal impact

PATCH — floor / PIN UX only.
