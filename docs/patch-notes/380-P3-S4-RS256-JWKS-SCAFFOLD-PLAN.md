# 380 - P3-S4 (RS256/JWKS scaffold follow-up) - Plan

## Context

Token hardening follow-ups already landed for cookie transport, CSRF, verify algorithm pinning, refresh reuse family revoke, and absolute refresh family lifetime caps.

The remaining roadmap step is asymmetric JWT signing with a JWKS publication path so key rotation can be introduced safely.

## Goal

Introduce an RS256/JWKS scaffold that is deploy-safe and backward-compatible:

- keep current HS256 behavior as default,
- allow opt-in RS256 signing via environment variables,
- expose JWKS for RS256 public key discovery,
- preserve temporary legacy HS256 verification during migration.

## Planned changes

1. Add a centralized JWT configuration utility:
   - resolve signing algorithm (`HS256` default, `RS256` optional),
   - normalize PEM key env input,
   - sign and verify through one shared API,
   - expose JWKS payload when RS256 is enabled.
2. Wire shared utility into auth/sign/verify call paths:
   - `middleware/auth.ts`,
   - setup auth manager,
   - auth-related rate-limit token decoders.
3. Add `/api/auth/.well-known/jwks.json` route:
   - return `404` when RS256 mode is disabled,
   - return active public JWK when enabled.
4. Add validation guards in environment config for RS256 mode requirements.
5. Add focused tests for JWT utility and JWKS endpoint behavior.

## Verification

- `npm test -- src/security/jwtConfig.test.ts src/routes/authSession.jwks.test.ts`
- `npm test -- src/routes/authLogin.refreshRotation.test.ts`
- `npm run type-check` (backend)
