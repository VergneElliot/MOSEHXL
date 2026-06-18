# P3-Q18 Implementation - Backend Coverage Upload to Codecov

## Implemented

Closed audit item `P3-Q18` by enabling backend coverage generation and CI upload to Codecov.

## Changes

### Backend test scripts and coverage config

- Updated `MuseBar/backend/package.json`:
  - added `test:coverage` script (`vitest run --coverage`)
  - added dev dependency `@vitest/coverage-v8`

- Updated `MuseBar/backend/vitest.config.ts`:
  - enabled coverage provider `v8`
  - added reporters `text` and `lcov`
  - output directory `coverage`
  - included backend source files and excluded tests/docs helpers from coverage targeting

### CI workflow updates

- Updated `.github/workflows/ci-cd.yml` backend job:
  - changed backend test step to run `npm run test:coverage`
  - added backend Codecov upload step using:
    - file: `MuseBar/backend/coverage/lcov.info`
    - flag: `backend`
    - name: `backend-coverage`

## Audit status update

- Updated `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`
  - `P3-Q18` marked **Fixed (2026-05-27)**.

## Verification

- Local run: `npm run test:coverage` (backend) ✅
- Confirmed file exists: `MuseBar/backend/coverage/lcov.info` ✅

## Result

Backend coverage is now generated and uploaded in CI, aligning backend and frontend coverage visibility in Codecov.
