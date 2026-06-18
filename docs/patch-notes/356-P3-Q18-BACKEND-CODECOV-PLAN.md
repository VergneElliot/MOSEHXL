# P3-Q18 Plan - Backend Coverage Upload to Codecov

## Context

Audit item `P3-Q18` identified that frontend coverage was uploaded to Codecov, but backend coverage was not generated/uploaded in CI.

## Goal

Enable backend coverage reporting and upload to Codecov in CI.

## Scope

- Add backend coverage test script.
- Configure Vitest coverage output to produce `lcov.info`.
- Update CI backend job to run coverage command.
- Add Codecov upload step for backend coverage.

## Strategy

1. Add `test:coverage` script in backend package scripts.
2. Configure `vitest.config.ts` coverage provider/reporters for lcov.
3. Add coverage provider dependency.
4. Modify CI backend job:
   - run `npm run test:coverage`
   - upload `MuseBar/backend/coverage/lcov.info` via Codecov action with backend flag.
5. Verify locally that `coverage/lcov.info` is emitted.

## Verification Plan

- Run `npm run test:coverage` in backend.
- Confirm `coverage/lcov.info` exists.
