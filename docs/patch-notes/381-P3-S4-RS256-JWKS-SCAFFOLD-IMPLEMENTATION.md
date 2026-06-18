# 381 - P3-S4 (RS256/JWKS scaffold follow-up) - Implementation

Plan reference: `docs/patch-notes/380-P3-S4-RS256-JWKS-SCAFFOLD-PLAN.md`

## What changed

Implemented an opt-in RS256/JWKS scaffold while preserving HS256 as the default runtime mode.

### 1) Centralized JWT runtime config

Added `MuseBar/backend/src/security/jwtConfig.ts`:

- Supports `AUTH_JWT_SIGN_ALG=HS256|RS256` (`HS256` default).
- Supports optional migration guard:
  - `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY` (default `true`).
- In RS256 mode:
  - requires `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`,
  - sets token header `kid` from `AUTH_JWT_KID` (default `mosehxl-rs256-1`),
  - derives JWKS `n/e` from the configured public key.
- Exposes shared methods:
  - `signJwtToken(...)`,
  - `verifyJwtToken(...)`,
  - `getJwtSigningAlgorithm()`,
  - `getJwtJwks()`.

### 2) Auth + setup + security middleware wiring

Updated call paths to use shared JWT config:

- `middleware/auth.ts`
  - token generation now goes through `signJwtToken`,
  - token verification now goes through `verifyJwtToken`.
- `services/setup/wizard/SetupAuthManager.ts`
  - setup token sign/verify now uses the same shared JWT config.
- `middleware/security/RateLimitMiddleware.ts`
  - bearer-token user bucketing now verifies through shared JWT config.
- `middleware/security/AuthEndpointRateLimit.ts`
  - refresh/login auth key resolver verification now uses shared JWT config.

### 3) JWKS endpoint

Updated `routes/authSession.ts`:

- Added `GET /.well-known/jwks.json`.
- Returns `404` when RS256 mode is not enabled.
- Returns active JWKS payload when RS256 mode is enabled.

### 4) Environment validation

Updated `config/environment.ts`:

- Validates `AUTH_JWT_SIGN_ALG` (`HS256|RS256` only).
- Validates `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY` as boolean if set.
- Requires `JWT_PRIVATE_KEY` + `JWT_PUBLIC_KEY` when `AUTH_JWT_SIGN_ALG=RS256`.

### 5) Tests

Added:

- `src/security/jwtConfig.test.ts`
  - HS256 default sign/verify path,
  - RS256 sign/verify + JWKS derivation path.
- `src/routes/authSession.jwks.test.ts`
  - JWKS endpoint disabled behavior (`404`),
  - JWKS endpoint enabled behavior (`200` + key payload).

## Verification run

- `npm test -- src/security/jwtConfig.test.ts src/routes/authSession.jwks.test.ts` -> pass
- `npm test -- src/routes/authLogin.refreshRotation.test.ts` -> pass
- `npm run type-check` (backend) -> pass

## Security outcome

The backend now has a production-safe migration scaffold for asymmetric JWT signing and public-key distribution without forcing immediate cutover. This unblocks staged RS256/JWKS rollout and key rotation planning while maintaining current compatibility during transition.
