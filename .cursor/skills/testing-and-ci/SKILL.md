---
name: testing-and-ci
description: >-
  Run tests, coverage, lint, and CI workflows for MOSEHXL/MuseBar. Use when
  writing tests, debugging CI failures, running Vitest, or configuring GitHub Actions.
---

# Testing and CI

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

| Package | Framework |
|---------|-----------|
| Frontend | Vitest 3 + Testing Library + jsdom |
| Backend | Vitest 4 + supertest |
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

Backend: coverage configured, no thresholds yet.

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

Spin mini Express app with router under test + error handler:

```typescript
import request from 'supertest';
import express from 'express';
import router from './floor';
// mount, mock auth, assert 403 without permission
```

## Related skills

- `legal-journal-compliance` — what real-db tests protect
- `database-migrations` — migration tests in backend suite
- `patch-notes-workflow` — document test additions in IMPLEMENTATION notes
