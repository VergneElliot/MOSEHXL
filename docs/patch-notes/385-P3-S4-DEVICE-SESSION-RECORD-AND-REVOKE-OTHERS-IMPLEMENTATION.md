# 385 - P3-S4 (device/session record + revoke other devices) - Implementation

Plan reference: `docs/patch-notes/384-P3-S4-DEVICE-SESSION-RECORD-AND-REVOKE-OTHERS-PLAN.md`

## What was implemented

This patch completes the next token-hardening roadmap step by adding durable session/device metadata and user-level session management controls.

### 1) Database migration for session/device metadata

Added migration:

- `MuseBar/backend/src/migrations/files/2026_05_28_17_10_00_add_refresh_token_device_session_fields.sql`

Changes:

- Added columns on `auth_refresh_tokens`:
  - `client_id VARCHAR(128)`
  - `ip_subnet INET`
- Added indexes for active session listing and per-family revoke flows:
  - `idx_auth_refresh_tokens_user_active_issued`
  - `idx_auth_refresh_tokens_user_family_active`

### 2) RefreshToken model extended

Updated `MuseBar/backend/src/models/refreshToken.ts`:

- `create(...)` now persists:
  - `ip_subnet`
  - `client_id`
- `rotate(...)` now persists:
  - `ip_subnet`
  - `client_id`
- Added `listActiveSessionsByUser(userId)` for authenticated session listing.
- Added `revokeAllForUserExceptFamily(userId, familyId, reason)` for "log out other devices".

### 3) Stable client-session id + subnet fingerprint in auth routes

Updated `MuseBar/backend/src/routes/authLogin.ts`:

- Added client-session id resolver:
  - accepts `x-client-session-id` header (validated),
  - falls back to `musebar_client_session_id` cookie,
  - mints and sets cookie when missing.
- Added IP subnet derivation helper:
  - IPv4 -> `/24` subnet string
  - IPv6 -> `/64` subnet string
- Login and refresh now pass `clientId` + `ipSubnet` into refresh-token persistence.

### 4) New authenticated session-management endpoints

Added in `authLogin.ts`:

- `GET /api/auth/sessions`
  - returns active refresh sessions for current user,
  - includes `isCurrent` flag by matching current refresh family.
- `POST /api/auth/sessions/revoke-others`
  - requires current refresh cookie,
  - revokes active sessions for the user except current family,
  - writes audit event `REVOKE_OTHER_SESSIONS`.

### 5) Baseline anomaly signal on refresh reuse context drift

Added best-effort security signal in refresh flow:

- compares prior active token metadata in current family against current request context:
  - `client_id`
  - `ip_subnet`
  - `user_agent`
- emits `REFRESH_SESSION_ANOMALY_SIGNAL` when drift is detected.
- signal is non-blocking (never breaks refresh issuance).

### 6) Test coverage updates

Added:

- `MuseBar/backend/src/routes/authLogin.sessions.test.ts`
  - session listing with current-family marking,
  - revoke-others success path,
  - revoke-others missing-cookie guard.

Updated:

- `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`
  - adjusted cookie assertion to support additional client-session cookie.

### 7) Audit state sync

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

to reflect that session/device record baseline landed and to narrow remaining token roadmap items.

## Verification executed

From `MuseBar/backend`:

- `npm test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.sessions.test.ts` -> pass
- `npm run type-check` -> pass

## Outcome

The platform now has first-class refresh session records per device context, user-visible active session introspection, and a safe "revoke other sessions" control. This unlocks stronger anomaly scoring and endpoint-specific response policies in the next hardening pass.
