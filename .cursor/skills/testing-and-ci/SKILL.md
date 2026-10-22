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

## Current coverage floors (Oct 2026 — PLAN 564 campaign)

Ratchets are **never lowered**. Raise only when measured % is safely above the
new floor (~3–5 pts margin). Prefer meaningful colocated tests over chasing %.

| Workspace | Measured (post-564) | CI floors |
|-----------|---------------------|-----------|
| Backend | ~47% lines (excl. setup/storage/userInvitation/migrations) | lines/stmts **43%**, branches **62%**, funcs **52%** (`backend/vitest.config.ts`) |
| Frontend (business-logic include; no UI `.tsx`) | ~20% lines | lines/stmts **18%**, branches/funcs **60%** (`vite.config.ts`) |
| Frontend pure globs (utils, *Policy*, pinSessions*, *Draft*, *Totals*, split*, …) | ≥80% on scoped keys | **80%** lines/stmts (see `vite.config.ts` glob thresholds) |

Aspirational next targets (do not jump CI to these until measured): backend
**≥70%**, FE overall **≥40%** on the business-logic include.

Do **not** mount full Administration / POS MUI trees for coverage points.

## Commands (repo root)

```bash
npm test --workspace MuseBar              # frontend Vitest (watch)
npm run test:ci --workspace MuseBar       # frontend + coverage thresholds
npm test --workspace MuseBar/backend      # backend Vitest
npm run test:coverage --workspace MuseBar/backend  # backend + coverage thresholds
npm run test:coverage                     # root: FE test:ci + backend test:coverage
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

**Never lower** `coverage.thresholds` in `MuseBar/vite.config.ts` or
`MuseBar/backend/vitest.config.ts`. After adding tests, remeasure and raise
floors only with margin under the new measured %.

Frontend (`vite.config.ts`):

- Overall lines/stmts on the **business-logic include** (utils/hooks/contexts/services + `components/**/*.ts`; excludes UI `.tsx`)
- Additional **glob keys** for pure modules (≥80% lines/stmts)
- Flat Vitest shape (not Jest `global`)

Backend (`vitest.config.ts`):

- Thresholds on include that excludes deferred setup/storage/userInvitation/migrations
- Prefer colocated behaviour tests; exclude only paths the PLAN explicitly defers

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
