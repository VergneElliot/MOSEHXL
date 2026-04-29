# 111 - P0-7 (App Exposure Hardening: CORS + Docs + Client Error Ingestion) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/110-P0-7-APP-EXPOSURE-HARDENING-PLAN.md`

## What was implemented

## 1) CORS policy made environment-aware and fail-closed

Updated:
- `MuseBar/backend/src/app.ts`

Changes:
- Replaced static CORS origin array with callback-based origin validation.
- Added environment split:
  - **development**:
    - localhost + loopback,
    - LAN regex origins (192.168 / 10 / 172.16-31) for local POS workflows,
    - configured `CORS_ORIGIN` entries.
  - **production/test**:
    - configured `CORS_ORIGIN` entries only.
- Non-browser requests without `Origin` remain allowed.
- Denied origins now fail via CORS callback error.

## 2) Swagger route now respects feature flag

Updated:
- `MuseBar/backend/src/app.ts`

Change:
- `/api/docs` is now mounted only when `config.features.swaggerEnabled` is true.

This aligns runtime behavior with `config/environment.ts`.

## 3) `/api/client-errors` hardened

Updated:
- `MuseBar/backend/src/app.ts`

Changes:
- **Development**: endpoint remains available for DX.
- **Production/test path**:
  - endpoint mounts only if `CLIENT_ERROR_REPORT_KEY` is configured (length >= 16),
  - requests must provide matching `x-client-error-key` header,
  - otherwise return 403.
- If key is absent in non-dev mode, endpoint is disabled and warning is logged.

This removes the previous unauthenticated-open ingestion surface in non-dev environments.

## 4) Express fingerprinting header disabled

Updated:
- `MuseBar/backend/src/app.ts`

Change:
- Added `app.disable('x-powered-by')`.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

2. Lints check (edited files) ✅
   - No linter errors on:
     - `app.ts`

## Outcome

P0-7 is complete:
- production CORS is now constrained to explicit configured origins,
- docs endpoint is feature-gated,
- client error ingestion is no longer open by default in non-dev environments,
- `x-powered-by` is disabled.
