# 384 - P3-S4 (device/session record + revoke other devices) - Plan

## Context

Token hardening has already delivered:

- short-lived access tokens,
- DB-backed rotating opaque refresh tokens,
- cookie transport + CSRF protection,
- refresh-family revoke on reuse,
- absolute refresh session cap,
- RS256/JWKS cutover/rotation hardening.

The next remaining roadmap step is session/device visibility and control:

- keep a stable per-device session identifier,
- expose active sessions to the authenticated user,
- allow revoking "other devices" without forcing full account logout.

## Goal

Implement a practical session-management baseline that is safe in production and easy for junior developers to reason about:

1. Persist a stable client/session identifier on refresh-token rows.
2. Track minimal request fingerprint context for anomaly signals (client id + IP subnet + user agent drift).
3. Expose authenticated endpoints to list active refresh sessions and revoke other sessions.

## Planned changes

1. **Database**
   - Add migration to extend `auth_refresh_tokens` with:
     - `client_id` (stable client/session id),
     - `ip_subnet` (masked IP network for safer change detection).
2. **Refresh token model**
   - Accept/store `clientId` and `ipSubnet` in create/rotate paths.
   - Add read path for active sessions per user.
   - Add revoke path that revokes all active sessions except the current family.
3. **Auth route behavior**
   - Introduce stable client id resolution:
     - read from `x-client-session-id` header or cookie,
     - mint/set cookie if missing.
   - Populate `client_id` and `ip_subnet` on login and refresh session writes.
   - Add new authenticated endpoints:
     - `GET /api/auth/sessions` (active sessions for current user),
     - `POST /api/auth/sessions/revoke-others` (revoke all except current session family).
4. **Anomaly baseline signal**
   - During refresh, detect drift in fingerprint fields from prior active token in the same family:
     - `client_id`,
     - `ip_subnet`,
     - `user_agent`.
   - Emit security log event (best-effort) for operational review.
5. **Tests**
   - Expand auth route tests for:
     - session listing and revoke-others behavior,
     - refresh-session metadata persistence expectations.

## Verification plan

- `npm test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.sessions.test.ts`
- `npm run type-check`

## Expected outcome

After this patch, users (and support flows) can reason about active sessions per device and safely terminate other devices without forcing complete account lockout. This also establishes the data foundation needed for stronger anomaly scoring in follow-up hardening.
