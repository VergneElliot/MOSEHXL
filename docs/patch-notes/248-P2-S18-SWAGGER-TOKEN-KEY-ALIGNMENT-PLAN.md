# 248 - P2-S18 (Swagger token key alignment) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (S18)

## Why this patch exists

The audit flagged a token-key mismatch risk:

- Swagger UI request interceptor using `localStorage.getItem('authToken')`
- application auth storage using `localStorage.getItem('auth_token')`

Current runtime code already reads `auth_token`, but we need regression
protection so this does not drift back silently.

## Scope

### In scope

1. Confirm app token storage key remains `auth_token`.
2. Add targeted regression test that executes Swagger request interceptor and
   verifies it reads `auth_token` and applies `Authorization` header.
3. Document closure pass for S18.

### Out of scope

- Global auth storage redesign (cookies/session architecture).
- Swagger production exposure policy (already handled by P2-S11).

## Strategy

### Step 1 - Baseline confirmation

Validate:
1. `useAuth` persists token under `auth_token`.
2. Swagger request interceptor reads `auth_token`.

### Step 2 - Add regression coverage

In `backend/src/routes/docs.test.ts`:
1. invoke `buildSwaggerUiOptions('development')`
2. call `requestInterceptor` with a mock request
3. assert `Authorization` header is set from `auth_token`
4. assert no header is added when `auth_token` is absent

### Step 3 - Verify

Run targeted tests and lints on touched files.

## Acceptance criteria

1. Regression test fails if key is changed back to `authToken`.
2. S18 is no longer "partially addressed"; behavior is explicit and tested.
