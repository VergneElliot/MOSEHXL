# 509 — Empty open-ticket shells vs free tables (IMPLEMENTATION)

## Summary

Free = no draft/validated lines (`has_active_items`). Empty open-ticket shells are
cancelled on discard / last retour / transfer onto target; open reuses empty shells;
Plan de salle transfer/merge and resume dialog follow the same rule.

## Files changed

- Backend: `openTicketEmptyCleanup.ts`, `openTicketTransferService.ts`,
  `openTicketOpenService.ts`, `openTicketDiscardService.ts`; `floorModel.listStatus`
  adds `has_active_items`; floor routes wired to services.
- Frontend: `tableOccupancy.ts`, `floorStatusApi.ts`, Plan de salle + Caisse map,
  `floorMoveToTable.ts` / `floorMoveTarget.ts`.

## Verification results

- Unit: `tableOccupancy`, `openTicketTransferService`
- Route: floor open reuse / conflict
- Module size check passed

## Follow-ups

None for occupancy; kitchen envoyé/servi statuses remain separate (507 follow-up).
