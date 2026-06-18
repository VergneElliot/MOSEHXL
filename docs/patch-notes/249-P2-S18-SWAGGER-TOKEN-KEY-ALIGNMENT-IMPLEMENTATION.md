# 249 - P2-S18 (Swagger token key alignment) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/248-P2-S18-SWAGGER-TOKEN-KEY-ALIGNMENT-PLAN.md`

## What was validated first

1. Frontend auth storage remains `auth_token`:
   - `MuseBar/src/hooks/useAuth.ts`
   - `MuseBar/src/services/authHelper.ts`
2. Swagger request interceptor already reads `auth_token`:
   - `MuseBar/backend/src/routes/docs.ts`

So the runtime behavior was already aligned; this pass closes S18 by adding
explicit regression protection.

## What changed

Updated:
- `MuseBar/backend/src/routes/docs.test.ts`

Added tests:
1. **Positive path**
   - request interceptor reads `localStorage['auth_token']`
   - sets `Authorization: Bearer <token>`
2. **Negative path**
   - when `auth_token` is missing, interceptor leaves `Authorization` unset

These tests execute the interceptor logic directly, which means a future drift
back to `authToken` will fail test coverage immediately.

## Verification

Executed:
1. `npm run test -- src/routes/docs.test.ts`
   - Result: pass (`1` file, `4` tests)
2. Lint diagnostics on touched files:
   - Result: no issues

## Result

P2-S18 is now fully closed (not partial): token key alignment is both correct at
runtime and protected by direct regression tests.
