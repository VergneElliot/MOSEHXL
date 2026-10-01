# 554 — PIN one-tab-per-user + PIN-gated close (IMPLEMENTATION)

## Summary

Follow-up to PLAN **549**: collapse duplicate open badges to **one tab per PIN
user**, allow closing from any device after that user's PIN, and clarify that
pointage via PIN is **not** gated on the venue Wi‑Fi allowlist. Focused tab
remains device-local.

## Files changed

- `MuseBar/backend/src/models/staffPinSession.ts` — `closeDuplicateOpens`,
  `listActive` `DISTINCT ON (user_id)`
- `MuseBar/backend/src/routes/pinSessions.ts` — heal duplicates on list; close
  allowed when PIN actor `id` matches badge `user_id`
- `MuseBar/src/contexts/pinSessionsMerge.ts` (+ test) — dedupe by `user_id`,
  rebase local unlock onto canonical `sid`
- `MuseBar/src/contexts/PinSessionsContext.tsx` — `closeSessionAsPinUser` /
  `dismissLocalSession`
- `MuseBar/src/components/common/usePinSessionHeaderActions.ts` — ✕ → PIN then close
- `MuseBar/src/services/api/pin.ts` — optional `pinActorToken` on close
- `MuseBar/src/components/Settings/Settings/TimeClockNetworkSettings.tsx` — copy
- `.cursor/skills/auth-and-multi-tenancy/SKILL.md`
- `CHANGELOG.md` — PATCH

## Behaviour

| Case | Result |
|------|--------|
| Several open rows for same PIN user | Healed on list; one header tab |
| ✕ on any tab (locked or unlocked) | PIN of that profile → close + clock-out |
| Wrong PIN on close | Error; tab stays |
| Close with open tables | 409; tab stays; message shown |
| Focused tab | Per-device; list shared |
| Wi‑Fi allowlist | Does not block PIN open/close or POS |

## Verification

- [x] Merge unit tests (dedupe + rebase)
- [x] Type-check musebar + backend
- [ ] Manual: multiple Elliot tabs → refresh → one; close locked tab with PIN from other device

## Fiscal impact

PATCH — session UX / authz; journal unchanged.

## Correction

See **555** — first open + close require venue Wi‑Fi; unlock/POS may be off-network.
