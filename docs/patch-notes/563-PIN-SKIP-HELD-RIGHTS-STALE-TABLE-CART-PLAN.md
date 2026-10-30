# 563 — PIN skip when badge holds right + stale table cart (PLAN)

## Context

1. **PIN UX** — With the équipe portal as the default surface, managers no longer leave
   privileged badges parked on the public caisse. Always step-up for specific rights
   (549 / 550 / 557) is too heavy: if the focused badge already holds the right, skip
   the pad; step-up only when it does not.
2. **Stale table cart** — An intervener (or any badge) binds a table into the local PIN
   session cart. Another device/tab closes or pays the ticket. Returning to the first
   badge still shows the cart; sync / « vider » / leave-table call the dead ticket and
   error out without clearing local state → stuck ghost cart.
3. **Validate → release** — After kitchen validation (`Valider`), release the local cart
   and table binding (ticket stays open on the floor). Avoids holding a local copy that
   can go stale while the table is in service.

## Scope

- `stepUpElevationPolicy` (+ tests), StepUpAuth comments, auth skill, CHANGELOG
- New `floorTicketGone` helper; `useFloorService` validate / detach / sync / close paths
  (no net growth of baselined `useFloorService` — extract sync if needed)
- pos-and-floor-service skill note

## Approach

1. `canSkipPinForActiveActor`: skip when active actor holds **any** requested key
   (basic or specific).
2. Detect API messages for closed/missing open tickets; on those errors, clear
   `activeTable` + cart locally (sync, detach, abandon paths).
3. After successful `validateTicket`, clear local cart + unbind (do not discard server lines).
4. `closeActiveTicketAfterOrder` also clears cart / `setCurrentOrder([])`.

## Verification

- [ ] Unit: elevation policy + ticket-gone helper
- [ ] Manual: badge with `access_closure` opens Clôture without PIN; badge without → PIN
- [ ] Manual: intervene table → other PIN pays → return → cart auto-clears (or clear works)
- [ ] Manual: Valider table → caisse returns to empty comptoir; table still occupied on plan

## Risks

- Cross-device: privileged badge left on shared caisse can act without re-PIN — mitigated
  by portal-default workflow. Backend still enforces permissions.
- Partial validate still releases the whole local cart (drafts remain on server ticket).
