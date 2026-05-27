# 379 - P3-S4 (refresh absolute session cap follow-up) - Implementation

Plan reference: `docs/patch-notes/378-P3-S4-REFRESH-ABSOLUTE-SESSION-CAP-PLAN.md`

## What changed

Implemented absolute refresh-session lifetime enforcement on top of existing rotating opaque refresh tokens.

### `MuseBar/backend/src/routes/authLogin.ts`

- Added `AUTH_REFRESH_ABSOLUTE_MAX_DAYS` support (default `30` days).
- Updated refresh expiry computation to clamp rolling expiry (`1d`/`7d`) to an absolute family cap.
- On `POST /auth/refresh`, loads refresh family start time and computes the effective next expiry.
- If the absolute cap has been reached:
  - revokes the full refresh family with reason `ABSOLUTE_SESSION_CAP_REACHED`,
  - clears refresh + CSRF cookies,
  - returns `401` with "Session expired. Please log in again."

### `MuseBar/backend/src/models/refreshToken.ts`

- Added `getFamilyIssuedAt(familyId)` to retrieve the first issuance timestamp for a refresh family using `MIN(issued_at)`.

### `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`

- Added mocks/wiring for `RefreshTokenModel.getFamilyIssuedAt`.
- Added a test that simulates an over-cap family and asserts:
  - refresh is rejected with `401`,
  - family revocation is triggered with `ABSOLUTE_SESSION_CAP_REACHED`,
  - no refresh rotation occurs.

## Verification run

- `npm test -- src/routes/authLogin.refreshRotation.test.ts` -> pass
- `npm run type-check` (backend) -> pass

## Security outcome

Refresh sessions can no longer slide forever. Even with continuous activity, each refresh family now has a hard maximum lifetime, reducing long-tail session persistence risk and aligning token lifecycle behavior with the P2-S16 hardening roadmap.
