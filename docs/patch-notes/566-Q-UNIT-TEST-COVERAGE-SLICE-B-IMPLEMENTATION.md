# 566 — Q — Unit test coverage Slice B: admin API routes (IMPLEMENTATION)

## Summary

Colocated Vitest permission + happy-path tests for `MuseBar/backend/src/routes/admin/*` (excluding `index.ts`). PIN-gated routes assert JWT-alone → `403 PIN_ACTOR_REQUIRED`, wrong permission → `403`, correct permission → `200` with mocked models. `emailStatus` uses JWT `requireEstablishmentAdmin` (no PIN).

Fiscal impact: **PATCH** — tests only.

## Tests added (7 files, 21 tests)

| File | Gate | Happy path |
|------|------|------------|
| `documents.permissions.test.ts` | `P.access_documents` | `GET /admin/documents/categories` |
| `inbox.permissions.test.ts` | `P.access_inbox` | `GET /admin/inbox` (`listInboxConversations` mocked) |
| `reservations.permissions.test.ts` | `P.access_reservations` | `GET /admin/reservations` |
| `planning.permissions.test.ts` | `P.access_planning` | `GET /admin/planning/shifts` |
| `leaves.permissions.test.ts` | `P.access_planning` | `GET /admin/leaves` |
| `timeClock.permissions.test.ts` | mixed | Open: `GET /status` (membership only); gated: `GET /compliance` (`access_planning`) |
| `emailStatus.permissions.test.ts` | JWT `establishment_admin` | Staff JWT → 403; admin JWT → 200 (no PIN) |

Helpers: `pinActorTokenFor` / `withPinActor` from `src/test/pinActorTestUtils.ts`. Pattern: `businessDayStats.permissions.test.ts`. Pool mocked for `token_blocklist`.

## Verification results

```bash
cd MuseBar/backend && npx vitest run src/routes/admin
```

- **7** files / **21** tests passed
- Fiscal impact: PATCH

## Caveats

- Happy paths cover one representative GET per router; mutating admin flows (upload, reply, shift commit, leave approve) remain untested.
- Wrong-permission responses reuse `PIN_ACTOR_REQUIRED` (same as missing PIN) — matches production `requirePermission`.
- `timeClock` clock-in/out/punch return 410 by design; not asserted here.
- Index regeneration (`docs:patch-notes-index`) left for the integrating commit.

## Follow-ups

Slices C–E (services/models, FE policies, CI ratchet) — PLAN 564.
