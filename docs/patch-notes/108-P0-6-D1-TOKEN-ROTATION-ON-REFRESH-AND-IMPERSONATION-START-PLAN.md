# 108 - P0-6 (D1 Token Rotation on Refresh + Impersonation Start) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

D1 introduced token revocation, but one lifecycle gap remained:

- `POST /api/auth/refresh` issues a new token without revoking the current one.
- `POST /api/auth/support/impersonation/start` issues impersonation token without revoking the caller's current admin token.

This allows parallel valid tokens for the same actor/session window.

## Scope

### In scope

1. Revoke current bearer token during successful `POST /api/auth/refresh`.
2. Revoke current bearer token during successful `POST /api/auth/support/impersonation/start`.
3. Keep logout and impersonation stop behavior unchanged.
4. Add regression tests for both rotation paths.
5. Document implementation + verification.

### Out of scope

- Full multi-device session management strategy.
- Refresh-token architecture redesign.

## Design choices

- Keep existing blocklist model (`token_blocklist`) and `revokeTokenOrThrow`.
- Rotate only on successful path:
  - generate new token,
  - persist audit entry,
  - revoke current token,
  - return new token.
- Fail closed on revocation failures (500, no new token response).

## Step-by-step plan

### Step 1 - Refresh rotation
- In `/auth/refresh`:
  - parse current bearer token from Authorization header,
  - after audit log, revoke current token with reason `TOKEN_REFRESH_ROTATED`,
  - return new token only after successful revocation.

### Step 2 - Impersonation start rotation
- In `/auth/support/impersonation/start`:
  - parse current bearer token,
  - after audit log, revoke current token with reason `SUPPORT_IMPERSONATION_STARTED`,
  - return support token only after successful revocation.

### Step 3 - Regression tests
- Extend/support existing impersonation tests for start-path revocation.
- Add dedicated refresh rotation test:
  - successful refresh issues new token and inserts old token in blocklist.

### Step 4 - Verification
- Run targeted auth tests and backend type-check.

## Acceptance criteria

- Refresh no longer leaves old bearer token active on successful rotation.
- Impersonation start no longer leaves old admin bearer token active.
- Route tests pass and validate blocklist insertions.
- Backend type-check passes.
