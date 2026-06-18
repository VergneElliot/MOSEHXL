# 226 - P2-S4 (setup endpoint password validation) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S4)

## Why this patch exists

`POST /api/auth/setup` is protected by `requireSetupSecret`, but currently only
checks that `email` and `password` are present. It does not enforce the shared
password-strength rules used elsewhere.

This creates a policy gap: bootstrap/setup can accept weak passwords that other
account-creation flows reject.

## Scope

### In scope

1. Reuse shared `validatePassword(...)` in `POST /api/auth/setup`.
2. Return a clear `400` error when password rules fail.
3. Add route tests proving weak passwords are rejected and valid ones still pass.
4. Document implementation and verification.

### Out of scope

- Changing password policy rules themselves.
- Refactoring all auth routes to centralized request validators.

## Design choices

1. **Single source of truth**
   - Use `utils/passwordValidation.ts` directly.
   - No duplicate setup-specific regex logic.

2. **Fail fast before DB writes**
   - Validate password before calling `UserModel.bootstrapSystemAdmin(...)`.
   - Prevent unnecessary DB work and keep error intent explicit.

3. **Keep endpoint contract stable**
   - Existing missing-field behavior remains unchanged.
   - New behavior adds only one additional 400 branch for weak passwords.

## Strategy

### Step 1 - Route hardening

File:
- `MuseBar/backend/src/routes/authRegister.ts`

Plan:
1. Import `validatePassword`.
2. In `/setup` route, validate password after presence check.
3. Return `400` with validation error message when invalid.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/routes/authRegister.setup.test.ts` (new)

Plan:
1. Assert weak password gets `400` and bootstrap is not called.
2. Assert valid password still creates admin and returns `201`.

### Step 3 - Verify

Run:
- targeted auth-register tests,
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. `/api/auth/setup` rejects weak passwords with `400`.
2. Shared password rules are reused (no duplicated rule set).
3. Valid setup flow still succeeds and returns `201`.
