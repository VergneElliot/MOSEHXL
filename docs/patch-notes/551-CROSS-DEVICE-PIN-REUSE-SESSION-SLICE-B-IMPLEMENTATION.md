# 551 — Cross-device PIN Slice B: reuse one open session (IMPLEMENTATION)

## Summary

Re-verifying a PIN on another device reuses the existing open `staff_pin_sessions`
row for `(establishment_id, pin_user_id)`, extends TTL / `last_seen_at`, closes
duplicate open rows, and **does not** clock-in again. First open still inserts +
clocks in.

## Files changed

- `MuseBar/backend/src/models/staffPinSession.ts` — `findActiveForUser`,
  `touchAndExtend`, `closeDuplicatesForUser`
- `MuseBar/backend/src/services/auth/pinSessionService.ts` — reuse path in
  `openPinSession`
- `MuseBar/backend/src/services/auth/pinSessionService.test.ts` — unit tests
- `.cursor/skills/auth-and-multi-tenancy/SKILL.md` — one-session-per-user note
- `CHANGELOG.md` — MINOR

## Behaviour

| Situation | Result |
|-----------|--------|
| No open session for user | `INSERT` + `clockInOnPinOpen` |
| Open session exists | Same `sid`, touch+extend, skip clock-in |
| Legacy duplicate open rows | Kept latest; others closed `superseded_by_reuse` |

`POST /api/auth/pin/verify` unchanged at the route layer — still calls
`openPinSession`.

## Verification results

- [x] `npx vitest run src/services/auth/pinSessionService.test.ts` — 4 pass
- [x] `npm run type-check --workspace MuseBar/backend` — pass
- [ ] Manual: verify PIN on device A then B → one row in sessions list; one
      time_entries open; close once clocks out

## Follow-ups

- Slice C (552): shared tab UI + focus-requires-PIN on each device

## Fiscal impact

MINOR — session/pointage consistency; journal hash rules unchanged.
