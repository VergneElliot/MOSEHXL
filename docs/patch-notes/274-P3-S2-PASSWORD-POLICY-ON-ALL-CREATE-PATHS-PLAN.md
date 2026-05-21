# 274 - P3-S2 (Password policy on all account-creation paths) - Plan

Date: 2026-05-21  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-S2)

## Why this patch exists

Audit P3-S2 flagged that not all password-setting paths were enforcing the
shared password policy from `utils/passwordValidation.ts`.

Specifically:

- `POST /api/auth/register` accepted weak passwords.
- `POST /api/auth/users` accepted weak passwords.
- direct model calls to `UserModel.createUser*` could bypass route-level checks.

This creates policy drift and a security inconsistency between setup/invitation
flows and admin-driven creation flows.

## Scope

### In scope

1. Enforce `validatePassword()` in `POST /api/auth/register`.
2. Enforce `validatePassword()` in `POST /api/auth/users`.
3. Add model-level guard in:
   - `UserModel.createUser`
   - `UserModel.createUserForEstablishment`
4. Add regression tests proving weak passwords are rejected on both endpoints.

### Out of scope

- Password reset flow redesign.
- Additional complexity rules beyond existing shared validator.

## Strategy

### Step 1 - Route-level validation

In `routes/authRegister.ts`:

1. Validate password before `UserModel.createUser` in `/register`.
2. Validate password before `UserModel.createUserForEstablishment` in `/users`.
3. Return 400 with canonical validation error message when invalid.

### Step 2 - Model-level fail-safe guard

In `models/user.ts`:

1. Add internal password-policy assertion helper.
2. Call it in both create methods to prevent future bypass by direct model use.

### Step 3 - Tests

1. Add a focused regression test file for password-policy enforcement on:
   - `POST /auth/register`
   - `POST /auth/users`
2. Update any existing tests that were using weak passwords as valid fixtures.

### Step 4 - Verify

1. Backend type-check.
2. Targeted authRegister tests.
3. Full backend test suite.
4. Lint diagnostics on touched files.

## Acceptance criteria

1. Weak passwords are rejected on both `/auth/register` and `/auth/users`.
2. Model-level user creation rejects weak passwords even if route checks are bypassed.
3. All tests pass without regressions.

