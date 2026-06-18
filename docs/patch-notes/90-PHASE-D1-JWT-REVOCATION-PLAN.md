# 90 - Phase D1 (JWT Revocation) - Plan

Date: 2026-04-23  
Phase: D1 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

Current auth tokens can live up to 7 days (`rememberMe`) and there is no server-side revocation list.
If a token is leaked, it remains valid until natural expiration.

D1 hardens this by introducing revocation controls while preserving existing login/refresh behavior.

## Scope

### In scope

1. Add a `token_blocklist` table in migration chain.
2. Add backend model/utilities to:
   - hash tokens,
   - store revoked tokens with expiry metadata,
   - check whether a token is revoked.
3. Integrate revocation check into `requireAuth`.
4. Revoke current token on `POST /api/auth/logout`.
5. Add tests covering revocation-enforced deny path.

### Out of scope (future D1 follow-up)

- Full refresh-token rotation architecture.
- Admin UI/API for manual token revocation management.
- Automatic scheduled cleanup process (table stores expiry for future cleanup policy).

## Design choices

- **Hash storage only**: store SHA-256 hash of token, never raw token.
- **Deny-first auth check**: `requireAuth` checks blocklist before accepting token.
- **Backward compatibility**: existing token format remains valid; revocation does not require immediate client changes.
- **Stable auditability**: logout keeps existing audit trail behavior and now additionally invalidates the token.

## Step-by-step plan

### Step 1 - Database migration
- Create migration for `token_blocklist`:
  - `token_hash` primary key,
  - `user_id` (nullable),
  - `reason`,
  - `revoked_at`,
  - `expires_at`,
  - supporting index on `expires_at`.

### Step 2 - Backend model/service
- Add `TokenBlocklistModel` with:
  - `hashToken(...)`,
  - `isTokenRevoked(...)`,
  - `revokeToken(...)`.

### Step 3 - Middleware integration
- In `requireAuth`, deny with `401` when token hash is found in blocklist and not expired.

### Step 4 - Logout integration
- In `POST /api/auth/logout`, parse current bearer token and revoke it with reason `LOGOUT`.

### Step 5 - Tests and verification
- Add/adjust tests for revoked token denial and logout path behavior.
- Run backend:
  - `npm run type-check`
  - `npm test`

### Step 6 - Documentation
- Add D1 implementation note with final behavior and verification results.

## Acceptance criteria

- `token_blocklist` migration exists and is reversible.
- Revoked tokens cannot pass `requireAuth`.
- Logout revokes the current token.
- Backend typecheck/tests pass.
- D1 plan + implementation documents are recorded.
