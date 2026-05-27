# 369 - P3-S5 (JWT verify algorithm pin follow-up) - Implementation

Plan reference: `docs/patch-notes/368-P3-S5-JWT-VERIFY-ALGORITHM-PIN-PLAN.md`

## What changed

Explicit JWT verification algorithm pinning (`HS256`) was added across backend runtime verification paths:

- `MuseBar/backend/src/middleware/auth.ts`
  - Added `JWT_VERIFY_OPTIONS` and applied to `verifyToken(...)`.
- `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.ts`
  - Added `JWT_VERIFY_OPTIONS` and applied in refresh rate-limit key resolver token decode.
- `MuseBar/backend/src/middleware/security/RateLimitMiddleware.ts`
  - Added class-level `JWT_VERIFY_OPTIONS` and applied when decoding bearer token for user-sharded limits.
- `MuseBar/backend/src/services/setup/wizard/SetupAuthManager.ts`
  - Added class-level `JWT_VERIFY_OPTIONS` and applied to both setup-token verification methods.

## Why this matters

Pinning the accepted algorithm list removes ambiguity in token verification behavior and closes the algorithm-confusion class for current symmetric-signing phase.

This also makes the later `RS256`/JWKS migration explicit and controlled (single options update per verifier path).

## Verification run

- `npm test -- src/middleware/auth.permission.test.ts src/middleware/security/AuthEndpointRateLimit.test.ts` -> pass
- `npm run type-check` (backend) -> pass
