# 550 — Cross-device PIN Slice A: always step-up for specific rights (IMPLEMENTATION)

## Summary

Specific permissions always open the PIN pad, even when the focused badge already
holds the right. Basic permissions may still use the focused actor without
re-entry. Page-scoped `ensureAccess` may reuse an open scope after a successful
PIN for that visit.

## Files changed

- `MuseBar/src/contexts/stepUpElevationPolicy.ts` — `canSkipPinForActiveActor`
- `MuseBar/src/contexts/stepUpElevationPolicy.test.ts` — unit coverage
- `MuseBar/src/contexts/StepUpAuthContext.tsx` — use policy; JSDoc updated
- `CHANGELOG.md` — MINOR note
- `docs/patch-notes/549-…-PLAN.md` — plan (prior)

## Behaviour

| Case | PIN pad? |
|------|----------|
| `ensurePermission(specific)` and active badge has it | **Yes** |
| `ensurePermission` / `ensureAccess` basic only, active has it | No |
| `ensureAccess(specific)` first entry | **Yes** |
| `ensureAccess(specific)` again while scope open | No (reuse scope) |

## Verification results

- [x] `npx vitest run src/contexts/stepUpElevationPolicy.test.ts` — pass
- [x] `npm run type-check --workspace MuseBar` — pass
- [ ] Manual: as manager badge, remise / cancel / open Settings → PIN every time

## Follow-ups

- Slice B (551): reuse one open `staff_pin_sessions` per user (no double clock-in)
- Slice C (552): shared tabs across devices + focus-requires-PIN

## Fiscal impact

MINOR — authorization UX only; journal actor rules unchanged.
