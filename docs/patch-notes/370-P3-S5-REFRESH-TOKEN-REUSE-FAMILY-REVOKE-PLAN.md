# 370 - P3-S5 (refresh-token reuse family revoke follow-up) - Plan

## Context

Refresh rotation already used one-time token semantics, but on reuse detection (`REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED`) the API returned 401 without explicitly revoking the remaining token family.

That leaves part of the rotation family potentially active after suspicious reuse attempts.

## Goal

When refresh reuse is detected during rotation, revoke the whole refresh token family and invalidate access tokens for that user session window.

## Planned changes

1. `RefreshTokenModel`
   - Add `revokeFamily(familyId, reason)` helper.
2. `authLogin.ts` refresh route
   - Track refresh `family_id` and `user_id` during refresh flow.
   - On `REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED`:
     - revoke refresh family with reason `REUSE_DETECTED`,
     - cut off JWTs via `TokenBlocklistModel.revokeAllUserTokensIssuedBefore(..., 'REFRESH_REUSE_DETECTED')`,
     - clear refresh + CSRF cookies,
     - return standard 401 auth error.
3. Tests
   - Add refresh-route regression test asserting family revoke is called on reuse detection.

## Verification

- `npm test -- src/routes/authLogin.refreshRotation.test.ts`
- `npm run type-check` (backend)
