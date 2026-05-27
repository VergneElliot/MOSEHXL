# 371 - P3-S5 (refresh-token reuse family revoke follow-up) - Implementation

Plan reference: `docs/patch-notes/370-P3-S5-REFRESH-TOKEN-REUSE-FAMILY-REVOKE-PLAN.md`

## What changed

### 1) Added refresh-family revocation helper

Updated `MuseBar/backend/src/models/refreshToken.ts`:

- Added `revokeFamily(familyId, reason)` to revoke all non-revoked tokens in a refresh family.

### 2) Reuse-detection response now revokes family and cuts off access JWTs

Updated `MuseBar/backend/src/routes/authLogin.ts` (`POST /auth/refresh`):

- Tracks `refreshFamilyId` and `refreshUserId` during refresh flow.
- On `REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED`:
  - revokes refresh family with reason `REUSE_DETECTED`,
  - revokes all access JWTs issued before current instant with reason `REFRESH_REUSE_DETECTED`,
  - clears refresh and CSRF cookies,
  - returns standard `Invalid or expired refresh token` auth response.

If family revocation fails, server logs error and still fails closed for the request.

### 3) Added regression test

Updated `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`:

- Added test case asserting that when `rotate(...)` raises reuse-detection error, `revokeFamily(...)` is called with the session family id.

## Verification run

- `npm test -- src/routes/authLogin.refreshRotation.test.ts` -> pass
- `npm run type-check` (backend) -> pass

## Security outcome

Refresh-token reuse events now trigger active containment (family revoke + JWT cutoff) instead of a passive 401 response, reducing window for session replay after token theft/reuse.
