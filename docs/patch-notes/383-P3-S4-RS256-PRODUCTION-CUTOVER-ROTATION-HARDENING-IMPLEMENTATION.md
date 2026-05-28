# 383 - P3-S4 (RS256 production cutover + rotation hardening) - Implementation

Plan reference: `docs/patch-notes/382-P3-S4-RS256-PRODUCTION-CUTOVER-ROTATION-HARDENING-PLAN.md`

## What was implemented

This patch turns the previous RS256 scaffold into a production-ready cutover/rotation path with explicit key-ring behavior and a concrete operator runbook.

### 1) RS256 key-ring verification support

Updated `MuseBar/backend/src/security/jwtConfig.ts`:

- Added RS256 runtime key-ring model:
  - `activeKid` (current signing key id),
  - `privateKey` for signing,
  - `verifyPublicKeysByKid` map for verification.
- Added support for `AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON`:
  - JSON object of `{ "<kid>": "<pem>" }`,
  - parsed and normalized (`\\n` to real newlines),
  - validated as non-empty keys and values.
- Prevented ambiguous config:
  - throws if additional key map tries to redefine the active `AUTH_JWT_KID`.

### 2) Hardened RS256 verification semantics

Updated `verifyJwtToken(...)` in `jwtConfig.ts`:

- In RS256 mode, token must provide a `kid`.
- Verification key is resolved by `kid` from explicit key-ring map.
- Unknown `kid` now fails closed (`Unknown JWT key id`), instead of implicit single-key behavior.
- Added explicit guard for missing key material in JWKS derivation path.

### 3) Production-default strict legacy behavior

Updated legacy verification policy in `jwtConfig.ts`:

- `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY` behavior now defaults to:
  - `false` in production when `AUTH_JWT_SIGN_ALG=RS256`,
  - `true` otherwise unless explicitly overridden.
- This keeps migration compatibility available, but makes production RS256 mode strict by default.

### 4) JWKS now publishes rotation window keys

Updated `getJwtJwks()` in `jwtConfig.ts`:

- JWKS payload now includes all RS256 verification keys:
  - active key first,
  - additional verify-only keys after.
- Each key derives `n/e` from PEM and emits standard JWK fields (`kty`, `use`, `kid`, `alg`, `n`, `e`).

### 5) Environment validation hardening

Updated `MuseBar/backend/src/config/environment.ts`:

- Added validation for `AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON`:
  - must be valid JSON,
  - must be a JSON object,
  - entries must be non-empty `kid -> pem` strings.

### 6) `.env.example` operational clarity

Updated `MuseBar/backend/.env.example` with RS256 cutover/rotation variables:

- `AUTH_JWT_SIGN_ALG`
- `AUTH_JWT_KID`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON`
- `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY`

### 7) Tests expanded for cutover and rotation

Updated `MuseBar/backend/src/security/jwtConfig.test.ts`:

- verifies RS256 token validation through additional verify-only key entries,
- rejects unknown RS256 `kid`,
- verifies production default strictness for legacy HS256 in RS256 mode.

Updated `MuseBar/backend/src/routes/authSession.jwks.test.ts`:

- verifies JWKS route publishes both active and additional rotation keys.

### 8) Runbook added

Added `docs/runbooks/JWT-RS256-CUTOVER-AND-ROTATION.md`:

- phased production cutover sequence,
- no-downtime key rotation sequence,
- rollback steps,
- operational guardrails for key lifecycle.

## Verification executed

From `MuseBar/backend`:

- `npm test -- src/security/jwtConfig.test.ts src/routes/authSession.jwks.test.ts` -> pass
- `npm run type-check` -> pass

## Result

The RS256 path now supports production-safe `kid`-based verification and overlapping key windows for rotation, with default-strict production behavior and an explicit operator runbook for cutover and rollback.
