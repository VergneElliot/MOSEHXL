# 235 - P2-S11 (Swagger production try-it-out guard) - Implementation

Date: 2026-05-01  
Plan reference: `docs/patch-notes/234-P2-S11-SWAGGER-PROD-TRYITOUT-GUARD-PLAN.md`

## What was implemented

This patch closes P2-S11 by hard-locking Swagger interactive execution off in
production regardless docs exposure toggle.

## 1) Added environment-aware Swagger UI options builder

Updated:
- `MuseBar/backend/src/routes/docs.ts`

Changes:
1. Added `buildSwaggerUiOptions(nodeEnv)` helper.
2. Introduced policy:
   - `allowTryItOut = nodeEnv !== 'production'`.
3. Set `tryItOutEnabled` from that policy.
4. Only include `requestInterceptor` when interactive mode is allowed.
5. Updated Swagger token key usage in interceptor to `auth_token` for alignment.

Result:
- production Swagger UI cannot execute requests via try-it-out even if docs are
  enabled by environment.

## 2) Added regression tests for policy lock

Added:
- `MuseBar/backend/src/routes/docs.test.ts`

Coverage:
1. Production options:
   - `tryItOutEnabled` is `false`,
   - no `requestInterceptor`.
2. Non-production options:
   - `tryItOutEnabled` is `true`,
   - `requestInterceptor` is present.

## Verification

Executed:

1. Targeted tests:
   - `npm run test -- src/routes/docs.test.ts`
   - Result: passed (1 file, 2 tests).
2. Backend type-check:
   - `npm run type-check`
   - Result: passed.
3. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-S11 is complete:
- production Swagger now enforces non-interactive documentation behavior,
- development keeps the expected interactive workflow,
- policy is covered by regression tests.
