# 564 — PIN skip when badge holds right + stale table cart (IMPLEMENTATION)

## Summary

1. **PIN** — `canSkipPinForActiveActor` skips the pad whenever the focused badge
   holds any requested permission (basic or specific). Step-up only when it lacks
   the right (portal-default workflow).
2. **Validate → release** — successful kitchen `validateTicket` clears local
   `activeTable` + cart (server ticket stays open).
3. **Stale cart** — `isOpenTicketGoneError` on sync / detach / abandon / validate /
   cancel-line / close-after-pay releases the local binding instead of trapping
   the waiter. Sync extracted to `useFloorTicketCartSync`.

## Files

- `stepUpElevationPolicy.ts` (+ test), `StepUpAuthContext.tsx`, `stepUpPageEntryPolicy.ts`
- `AppRouter.tsx` comment, auth + floor skills, CHANGELOG
- `floorTicketGone.ts` (+ test), `floorValidateTableOrder.ts`, `useFloorTicketCartSync.ts`,
  `useFloorService.ts`, `useFloorPlanManagement.ts` (same gone-ticket clear on leave/abandon)

## Fiscal impact

PATCH — authorization UX + floor cart binding; legal journal unchanged.
