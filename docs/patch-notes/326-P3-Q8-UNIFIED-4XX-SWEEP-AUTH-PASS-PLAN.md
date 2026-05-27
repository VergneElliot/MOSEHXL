# 326 — P3-Q8 unified 4xx sweep (auth pass) plan

## Objective

Start `P3-Q8` by migrating ad-hoc auth-route `res.status(4xx).json(...)` branches to typed error classes with centralized handling.

## Scope

### In scope

- Convert auth-route 4xx branches in:
  - `authLogin.ts`
  - `authRegister.ts`
  - `authPassword.ts`
- Ensure typed errors are not swallowed by route-level catch blocks.
- Update affected tests to assert centralized error envelope.

### Out of scope

- Full `P3-Q8` sweep across legal/invitations/products/printing/setup in this pass.
- 5xx route error strategy changes.

## Design decisions

1. Use `ValidationError`, `AuthenticationError`, `AuthorizationError`, and `NotFoundError` where semantics match.
2. Preserve custom auth codes (`ADMIN_2FA_SETUP_REQUIRED`, `INVALID_2FA_CODE`) with `AppError`.
3. In route-level catch blocks, rethrow existing `AppError` instances before generic 500 fallback.

## Verification plan

- Backend type-check.
- Targeted auth route tests.
- Full backend test suite.
