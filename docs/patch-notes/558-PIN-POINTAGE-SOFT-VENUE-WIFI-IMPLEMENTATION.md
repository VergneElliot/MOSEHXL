# 558 — Soft venue Wi‑Fi: clock only on allowlist (IMPLEMENTATION)

## Summary

Badge PIN open/close is allowed from any network (e.g. home to check
reservations). Clock-in / clock-out (`time_entries`) runs **only** when the
client IP is on the establishment allowlist. Empty allowlist → no hours
recorded, but badges still work.

## Behaviour

| Action | On venue Wi‑Fi | Off venue (home / other) |
|--------|----------------|--------------------------|
| Open / reuse badge | Allowed + clock-in if not already punched | Allowed, no clock-in |
| Close badge | Allowed + clock-out (if tables clear) | Allowed, no clock-out (tables still checked) |
| POS / admin while unlocked | Unchanged | Unchanged |

Home→venue unlock of an already-open session can clock in on reuse when now
on the allowlist (`clockInOnPinOpen` no-ops if already punched).

## Files changed

- `venueNetworkGuard.ts` — `isPinPointageOnVenueNetwork` (boolean; no 403)
- `pinSessionService.ts` — open/close always; pointage gated by allowlist
- `pinSessionPointage.ts` — `recordPointage` on close; `assertNoOwnedOpenTables…`
- Settings `TimeClockNetworkSettings` copy
- Tests + auth skill + CHANGELOG

## Verification

- [x] `venueNetworkGuard`, `pinSessionService`, `pinSessionPointage` unit tests
- [ ] Manual: open at home → no hours; open/reuse on Wi‑Fi → clock-in; close at home → no clock-out; close on Wi‑Fi → clock-out

## Fiscal impact

PATCH — pointage / authorization UX only; legal journal unchanged.
