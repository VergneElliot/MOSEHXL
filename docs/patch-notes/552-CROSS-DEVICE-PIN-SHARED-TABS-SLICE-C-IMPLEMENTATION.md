# 552 — Cross-device PIN Slice C: shared tabs + focus-requires-PIN (IMPLEMENTATION)

## Summary

Header PIN tabs now mirror **establishment-wide** open badges from
`GET /api/auth/pin/sessions`. A tab without a local actor token shows locked
(· PIN); focusing it opens the pad constrained to that `user_id`. Device
`sessionStorage` keeps only unlocked actors + carts keyed by server `sid`.

## Files changed

- `MuseBar/backend/src/routes/pinSessions.ts` — list open badges for any
  authenticated venue session (not only user-management)
- `MuseBar/src/contexts/pinSessionsMerge.ts` (+ test) — merge remote list + local unlocks
- `MuseBar/src/contexts/usePinSessionsRemoteSync.ts` — poll / focus / visibility refresh
- `MuseBar/src/contexts/pinSessionsState.ts` — prefer server `sid` as tab id; refuse focus without token
- `MuseBar/src/contexts/PinSessionsContext.tsx` — v2 persist (unlocked only), sync hook
- `MuseBar/src/contexts/pinActorFromVerify.ts` — stamp `pin_session_id` on actor
- `MuseBar/src/components/common/usePinSessionHeaderActions.ts` — focus gate + expected user
- `MuseBar/src/components/common/PinSessionHeaderTabs.tsx` — locked/expired UX
- `MuseBar/src/contexts/StepUpAuthContext.tsx`, floor hooks — `pinActorFromVerify`
- `CHANGELOG.md` — MINOR

## Behaviour

| Situation | Result |
|-----------|--------|
| Badge open on device A | Appears on device B list after sync (locked) |
| Tap locked tab on B | PIN pad for that user → unlock + focus; same `sid` |
| Wrong PIN (other user) | Error; tab stays locked |
| Tap unlocked tab | Focus switch, no PIN |
| `sessionStorage` | Unlocked tokens/carts only (`mosehxl.pinSessions.v2`) |

## Verification results

- [x] Unit: `pinSessionsMerge.test.ts`, `pinSessionsState.test.ts`
- [ ] Manual: open on caisse → locked tab on tablet → PIN → basic POS; carts stay device-local

## Follow-ups

- Slice D (553): shipped — see `553-CROSS-DEVICE-PIN-POLISH-SLICE-D-IMPLEMENTATION.md`

## Fiscal impact

MINOR — authorization/session UX; journal rules unchanged.
