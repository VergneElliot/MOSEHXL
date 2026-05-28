# JWT RS256 Cutover and Rotation Runbook

This runbook explains how to move production from HS256 compatibility mode to RS256 key-based signing with safe key rotation.

## Why this exists

JWT key changes are security-sensitive and easy to break if done ad hoc.  
This runbook provides one repeatable sequence with rollback points.

## Environment variables involved

- `AUTH_JWT_SIGN_ALG=RS256`
- `AUTH_JWT_KID=<active_kid>`
- `JWT_PRIVATE_KEY=<active_private_pem>`
- `JWT_PUBLIC_KEY=<active_public_pem>`
- `AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON=<json_object>`
- `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY=<true|false>`

`AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON` format:

```json
{
  "mosehxl-rs256-2026-05": "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----",
  "mosehxl-rs256-2026-04": "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"
}
```

## Phase 0 - Preflight checks

1. Generate a new RSA key pair (2048+ bits).
2. Confirm `JWT_SECRET` is still present during migration overlap.
3. Ensure deployment can update env vars atomically (same release).
4. Verify staging first:
   - app boots cleanly,
   - `GET /api/auth/.well-known/jwks.json` returns keys in RS256 mode,
   - login + refresh work,
   - old session behavior matches expected migration policy.

## Phase 1 - RS256 cutover with temporary HS256 compatibility

Set:

- `AUTH_JWT_SIGN_ALG=RS256`
- `AUTH_JWT_KID=<new_active_kid>`
- `JWT_PRIVATE_KEY=<new_private_key>`
- `JWT_PUBLIC_KEY=<new_public_key>`
- `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY=true` (temporary only)
- `AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON={}` (or omit if no prior RS keys)

Deploy and verify:

1. New logins receive RS256 tokens with expected `kid`.
2. Refresh endpoint works with RS256-issued access tokens.
3. Legacy HS256 tokens still pass only during migration window.

## Phase 2 - Disable HS256 legacy verification

After the maximum lifetime of HS256 access tokens has elapsed, set:

- `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY=false`

Deploy and verify:

1. RS256 auth flows remain healthy.
2. HS256 tokens are rejected.
3. No authentication error spike beyond expected migration traffic.

## Phase 3 - Rotate RS256 key (no downtime)

Given existing active key `kid-old` and new key `kid-new`:

1. Generate new key pair for `kid-new`.
2. Update env:
   - `AUTH_JWT_KID=kid-new`
   - `JWT_PRIVATE_KEY=<kid-new private>`
   - `JWT_PUBLIC_KEY=<kid-new public>`
   - `AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON` includes old public key(s), for example:
     - `{ "kid-old": "<kid-old public pem>" }`
3. Deploy.
4. Verify `/.well-known/jwks.json` includes both `kid-new` and `kid-old`.
5. Wait until all tokens signed with `kid-old` expire.
6. Remove `kid-old` from `AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON`.
7. Deploy cleanup release.

## Rollback strategy

If a cutover release fails:

1. Restore previous known-good env bundle.
2. Redeploy.
3. Re-verify login + refresh + `/.well-known/jwks.json`.
4. If needed, temporarily re-enable `AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY=true` while investigating.

## Operational guardrails

- Never delete the previous verify key until its token TTL window is fully elapsed.
- Never reuse a `kid` for different key material.
- Keep private keys only in secret storage; do not commit to repository.
- Keep public keys and `kid` inventory documented by date/owner.
