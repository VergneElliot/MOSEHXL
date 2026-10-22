---
name: testing-and-ci
description: >-
  Run tests, coverage, lint, and CI workflows for MOSEHXL/MuseBar. Use when
  writing tests, debugging CI failures, running Vitest, or configuring GitHub Actions.
  Also the policy for when new unit tests are mandatory with feature work.
---

# Testing and CI

## Mandatory: tests ship with the feature

New behaviour is incomplete without tests. Do **not** finish a feature, fix, or
extract of pure logic with “tests later”. Read this skill whenever you add or
change application behaviour.

| Change | Required tests |
|--------|----------------|
| New / changed Express route | Colocated `*.test.ts` or `*.permissions.test.ts` — happy path + auth/permission negative (no PIN → 403 `PIN_ACTOR_REQUIRED` when gated) |
| New / changed service business rule | Unit test of the pure or service function (mock `pg` / collaborators) |
| Fiscal / journal / closure / cancel path | Extend existing suite; real-db compliance stays green when that path is touched |
| New pure helper (draft, totals, mapper, policy) | Colocated `*.test.ts` — **always**; these are the cheapest, highest-value tests |
| New frontend logic hook / policy | Unit test without full UI mount when possible |
| Bug fix | Regression test that fails before the fix |
| Doc-only / skill-only / pure rename | No new tests |

Refactor that only moves code without changing behaviour may rely on existing
tests, but **any newly extracted pure module must get its own unit tests** in
the same change (see `code-hygiene`).

Skip only when the user explicitly says not to add tests, or the change cannot
be unit-tested without a live DB and you document that in the IMPLEMENTATION
patch note (prefer a mocked unit test first).

## Current coverage reality (Oct 2026)

| Area | Approx. test files | Gap |
|------|--------------------|-----|
| Backend routes (auth, orders, legal, floor, printing) | ~35 of ~108 route modules | Strong on fiscal/auth; **admin space routes mostly untested** |
| Backend services | ~36 of ~189 | Labor / kitchen / some floor covered; many admin/email paths thin |
| Backend models | ~11 of ~95 | Mostly legal journal; user/staff/time models thin |
| Frontend | **19** files vs ~240 components + ~50 hooks | Almost all UI untested; pure helpers (split bill, planning draft, reservation hours) often lack tests after extracts |
| Bridge | 3 | Acceptable for size |

Frontend line coverage threshold is still a **1%** ratchet floor — that is a CI
safety net, not a quality target. Prefer meaningful colocated tests over chasing %.

Priority backlog when filling gaps (do not boil the ocean in one PR):

1. Pure helpers extracted in hygiene (`splitBill*`, `planningShiftDraft`,
   `closurePreviewTotals`, `publicReservationHours`, floor ticket mappers).
2. Admin API routes (`routes/admin/*`) — permission + one happy path each.
3. Frontend policies already partially covered (`pinSessions*`, `stepUp*`) —
   keep extending those rather than mounting full MUI trees.

## Commands (repo root)

```bash
npm test --workspace MuseBar              # frontend Vitest (watch)
npm run test:ci --workspace MuseBar       # frontend + coverage thresholds
npm test --workspace MuseBar/backend      # backend Vitest
npm run test:real-db --workspace MuseBar/backend   # fiscal/RLS (needs Postgres)
npm test --workspace MuseBar/bridge       # Node --test

npm run lint --workspace MuseBar
npm run type-check --workspace MuseBar/backend
```

Single test:

```bash
cd MuseBar && npx vitest run src/utils/posCatalogOrdering.test.ts
cd MuseBar/backend && npx vitest run src/routes/floor.routes.test.ts
```

## Frameworks

Exact versions live in `MuseBar/package.json` and `MuseBar/backend/package.json`.

| Package | Framework |
|---------|-----------|
| Frontend | Vitest ^3.0.5 + Testing Library + jsdom |
| Backend | Vitest ^4.1.5 + supertest |
| Bridge | Node native `--test` |

## Real-db compliance tests

`backend/src/integration/real-db/compliance.real-db.test.ts`

Asserts `legal_journal` immutability and RLS. Requires:

```bash
RUN_REAL_DB_TESTS=true npm run test:real-db
```

**Runs in CI** after migrations on Postgres 13 service.

## Coverage

Frontend thresholds in `MuseBar/vite.config.ts` (flat Vitest shape, not Jest `global`):

- Baseline ~2026-09-02: lines/statements 1%, branches/functions 60%
- Ratchet +5% lines per quarter

Backend: coverage configured, no thresholds yet. Prefer colocated behaviour
tests over raising a global % without meaning.

## CI pipeline (`.github/workflows/ci-cd.yml`)

| Job | Gates |
|-----|-------|
| frontend-test | lint, typecheck, format:check, test:ci |
| backend-test | schema drift, lint, typecheck, migrate, test:coverage, test:real-db |
| bridge-test | lint, typecheck, test |
| security-scan | Trivy + npm audit |
| docs | patch-notes index freshness |

Node version: **20** (`.nvmrc` = 20.12.0).

## Fiscal path guard

`.github/workflows/fiscal-path-guard.yml` — PRs touching fiscal paths need `CHANGELOG.md` with `Fiscal impact:` line.

## Writing backend route tests

Spin a mini Express app with the router under test + error handler.

Permission-gated routes read **PIN identity only**. Account JWT alone → `403 PIN_ACTOR_REQUIRED`.
Tests must send `x-pin-actor-token` via `MuseBar/backend/src/test/pinActorTestUtils.ts`
(`pinActorTokenFor` / `adminPinActorTokenFor` / `withPinActor`). Keep a negative case
(no PIN actor → 403) next to the positive one.

```typescript
import request from 'supertest';
import express from 'express';
import router from './floor';
import { adminPinActorTokenFor, withPinActor } from '../test/pinActorTestUtils';
// mount, mock account JWT, then:
// withPinActor(request(app).get('/...'), adminPinActorTokenFor(establishmentId))
// assert 403 without the PIN header
```

## Writing frontend / pure-helper tests

Prefer testing **pure modules** (no React) colocated next to the source:

```
splitBillTotals.ts
splitBillTotals.test.ts
```

For hooks with React state, use Testing Library + Vitest. Do not mount entire
POS/Admin trees unless the bug is layout-specific.

## Related skills

- `auth-and-multi-tenancy` — PIN actor vs account JWT
- `legal-journal-compliance` — what real-db tests protect
- `database-migrations` — migration tests in backend suite
- `patch-notes-workflow` — PLAN Verification + IMPLEMENTATION must list tests
- `frontend-feature` / `backend-api-route` — per-layer test checklist
