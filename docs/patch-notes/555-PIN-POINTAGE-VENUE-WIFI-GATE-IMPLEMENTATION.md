# 555 — PIN open/close require venue Wi‑Fi (IMPLEMENTATION)

## Summary

Corrects the pointage network rule: **first** badge open (clock-in) and **any**
badge close (clock-out) must come from the establishment Wi‑Fi / IP allowlist.
Unlocking an already-open badge on another device and normal POS use stay
allowed off-network (terrasse / 5G).

## Files changed

- `MuseBar/backend/src/services/auth/venueNetworkGuard.ts` (+ test)
- `MuseBar/backend/src/services/auth/pinSessionService.ts` (+ test) — gate new
  open + close; reuse path skipped; `AppError` rethrown from open
- Settings copy + auth skill + CHANGELOG

## Behaviour

| Action | Network |
|--------|---------|
| First PIN open (no open session) | Venue Wi‑Fi required |
| Re-verify / unlock existing session | No Wi‑Fi check |
| Close badge (header ✕ / admin) | Venue Wi‑Fi required |
| Orders / floor while badge unlocked | No Wi‑Fi check |

Empty allowlist → open/close denied (`PIN_POINTAGE_OFF_VENUE_NETWORK`).

## Verification

- [x] `venueNetworkGuard.test.ts`, `pinSessionService.test.ts`
- [ ] Manual: open on venue Wi‑Fi; unlock on 5G OK; close on 5G blocked; close on Wi‑Fi OK

## Fiscal impact

PATCH — authorization / pointage gate only.
