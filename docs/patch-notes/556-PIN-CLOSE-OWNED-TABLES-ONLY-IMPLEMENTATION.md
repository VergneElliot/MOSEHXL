# 556 — PIN close blocked only by owned tables (IMPLEMENTATION)

## Summary

Closing a PIN badge (clock-out) blocked when **any** ticket matched
`opened_by_user_id` **or** `last_served_by_user_id`. After a reassign, the
original opener could not clock out even with zero tables attributed to them.

Gate now uses live ownership only: `last_served_by_user_id` (same as floor Z /
intervene).

## Files changed

- `MuseBar/backend/src/services/auth/pinSessionPointage.ts` (+ test)
- `.cursor/skills/auth-and-multi-tenancy/SKILL.md`
- `CHANGELOG.md` — PATCH

## Behaviour

| Situation | Close allowed? |
|-----------|----------------|
| No open tickets | Yes |
| Open tickets owned by this PIN user | No (409) |
| Open tickets owned by another waiter | Yes |

## Verification

- [x] `npx vitest run src/services/auth/pinSessionPointage.test.ts`
- [ ] Manual: Elliot with no assigned tables can close while Xavier’s tables stay open

## Fiscal impact

PATCH — pointage gate only; journal unchanged.
