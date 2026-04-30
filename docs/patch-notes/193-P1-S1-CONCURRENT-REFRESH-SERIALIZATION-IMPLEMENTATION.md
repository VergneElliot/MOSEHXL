# 193 - P1-S1 (Concurrent Refresh Serialization) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/192-P1-S1-CONCURRENT-REFRESH-SERIALIZATION-PLAN.md`

## What was implemented

This patch hardens refresh-token rotation against same-user concurrency races.

## 1) Refresh route serialized per user

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Changes in `POST /api/auth/refresh`:

1. Open dedicated DB client transaction (`BEGIN`).
2. Acquire user-scoped transaction advisory lock:
   - `SELECT pg_advisory_xact_lock($1::bigint)` with authenticated `userId`.
3. Execute existing refresh flow (role re-fetch, token issue, audit log, current token revoke).
4. Commit transaction on success.
5. Rollback on failure.
6. Release lock client in `finally`.

Important behavior notes:
- Lock scope is per user id, so different users can still refresh in parallel.
- Lock is transaction-scoped, so it auto-releases on COMMIT/ROLLBACK.

## 2) Regression test coverage extended

Updated:
- `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`

Changes:
- Added mocks for `pool.connect()` and lock-client query/release lifecycle.
- Added assertions that refresh path executes:
  - `BEGIN`
  - `SELECT pg_advisory_xact_lock($1::bigint)`
  - `COMMIT`
  - client `release()`
- Preserved existing assertion that current bearer token is revoked.

## Verification

Executed:

1. `npm run test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts`
   - Result: 2 files passed, 4 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-S1 audit requirement is now implemented: refresh rotation for a given user is serialized through `pg_advisory_xact_lock` to reduce race-condition risk under concurrent refresh calls.
