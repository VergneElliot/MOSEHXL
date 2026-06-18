# 234 - P2-S11 (Swagger production try-it-out guard) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S11)

## Why this patch exists

Swagger docs are currently gated by `swaggerEnabled`, but route config always
sets `tryItOutEnabled: true`. That means production docs (if enabled by env
override) still allow interactive request execution.

Audit requirement for S11:
- force-disable Swagger "try it out" in production regardless env override.

## Scope

### In scope

1. Add explicit production guard for Swagger UI "try it out".
2. Keep development behavior unchanged (interactive docs allowed).
3. Add regression tests for route option policy.
4. Document implementation and verification.

### Out of scope

- Full docs access-control redesign (VPN/mTLS policy handled at deployment level).
- OpenAPI spec content changes.

## Design choices

1. **Single policy helper**
   - Build Swagger UI options through a dedicated function in `routes/docs.ts`.
   - Makes policy testable and prevents silent drift.

2. **Production hard lock**
   - `NODE_ENV === 'production'` always disables try-it-out,
   - independent of `SWAGGER_ENABLED`.

3. **Token auto-injection only when interactive mode is enabled**
   - Keep request interceptor in development,
   - omit it in production where try-it-out is off.

## Strategy

### Step 1 - Route hardening

File:
- `MuseBar/backend/src/routes/docs.ts`

Plan:
1. Add `buildSwaggerUiOptions(nodeEnv)` helper.
2. Derive `allowTryItOut = nodeEnv !== 'production'`.
3. Set `tryItOutEnabled` from this guard and conditionally include interceptor.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/routes/docs.test.ts` (new)

Plan:
1. Assert production options set `tryItOutEnabled` to `false`.
2. Assert non-production options set it to `true`.
3. Assert request interceptor exists only in non-production mode.

### Step 3 - Verify

Run:
- targeted docs route tests,
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. Production Swagger UI options always disable interactive try-it-out.
2. Development Swagger keeps interactive testing behavior.
3. Tests cover and lock this policy.
