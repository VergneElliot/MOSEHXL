# 91 - Phase D1 (JWT Revocation) - Implementation

Date: 2026-04-23  
Related plan: `docs/patch-notes/90-PHASE-D1-JWT-REVOCATION-PLAN.md`

## What was implemented

## 1) Migration: token blocklist table

Added migration:
- `MuseBar/backend/src/migrations/files/2026_04_23_22_00_00_token_blocklist.sql`

Schema added:
- `token_blocklist.token_hash` (`CHAR(64)`) as primary key.
- Optional `user_id` reference to `users(id)`.
- `reason`, `revoked_at`, `expires_at`.
- Index on `expires_at` for cleanup/query efficiency.

## 2) Token blocklist model

Added:
- `MuseBar/backend/src/models/tokenBlocklist.ts`

Capabilities:
- SHA-256 token hashing (`hashToken`).
- Revocation lookup (`isTokenRevoked`) with active-window check (`expires_at IS NULL OR expires_at > NOW()`).
- Idempotent revocation insert/update (`revokeToken`) that stores hash only (never raw JWT).

## 3) Auth middleware enforcement

Updated:
- `MuseBar/backend/src/middleware/auth.ts`

Behavior:
- `requireAuth` now checks blocklist before accepting token payload.
- Revoked token returns `401` (`Token has been revoked`).
- JWT generation now includes a `jti` when absent (random UUID), preserving compatibility with current payload usage.

## 4) Logout and impersonation stop revocation

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Behavior:
- `POST /api/auth/logout` now revokes the current bearer token with reason `LOGOUT`.
- `POST /api/auth/support/impersonation/stop` now revokes current impersonation token with reason `SUPPORT_IMPERSONATION_ENDED`.
- Revocation persistence failures are logged and surfaced via `AppError`.

## 5) Tests updated/added

Updated:
- `MuseBar/backend/src/routes/authLogin.supportImpersonation.test.ts`
- `MuseBar/backend/src/routes/orders/orderCRUD.establishmentIsolation.test.ts`

Coverage additions:
- Assert blocklist insert occurs on impersonation stop.
- Assert revoked token is denied (`401`) before route execution.
- Maintain compatibility for existing establishment-isolation test by accounting for blocklist query.

## Verification run

Executed in `MuseBar/backend`:

- `npm run type-check` ✅
- `npm test` ✅ (7 files, 19 tests passed)

## Notes

- This D1 step introduces immediate revocation for token-based sessions without changing client login flows.
- Refresh-token rotation and administrative revocation tooling remain explicit follow-up work in later D-phase hardening.
