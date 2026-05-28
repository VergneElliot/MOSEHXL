# 382 - P3-S4 (RS256 production cutover + rotation hardening) - Plan

## Context (what this fix is about)

We already added an RS256/JWKS scaffold in the previous step:

- backend can sign JWTs with `RS256` (optional),
- backend exposes `/.well-known/jwks.json`,
- HS256 stays as default to keep compatibility during migration.

That scaffold was necessary, but not enough for a real production cutover.

Today, rotation safety is still limited because:

1. verification in RS256 mode effectively uses one public key,
2. there is no explicit key-ring strategy for "new active key + old verify keys",
3. legacy HS256 verification can stay enabled too easily during/after cutover,
4. operators do not yet have a strict runbook for safe rollout and rollback.

In simple terms: we have the engine, but we still need guard rails and operator procedure.

## Goal

Harden the RS256 path so production can rotate keys safely and intentionally:

- sign with one active key id (`kid`),
- verify against an explicit RS256 key ring (active + previous keys),
- reject unknown/missing keys in RS256 mode (fail closed),
- make legacy HS256 verification opt-in and production-safe,
- publish a practical rotation runbook for operators.

## Planned changes

1. Extend JWT runtime config with an RS256 verification key ring:
   - active signing key from `JWT_PRIVATE_KEY` + `JWT_PUBLIC_KEY` + `AUTH_JWT_KID`,
   - optional additional public keys (for verification only) from env JSON map.
2. Harden RS256 verification:
   - require RS256 header `kid` in RS256 mode,
   - resolve verification key by `kid`,
   - fail when key is unknown instead of silently trying one global key.
3. Expand JWKS output:
   - expose all currently accepted RS256 verification keys (active + previous) so clients can validate rollover periods.
4. Tighten legacy HS256 behavior:
   - keep migration compatibility path, but default to strict mode in production while preserving explicit override capability.
5. Add/extend tests:
   - verify key-ring behavior,
   - verify unknown `kid` rejection,
   - verify JWKS multi-key publication shape.
6. Add runbook documentation:
   - phased cutover steps,
   - safe rotation sequence,
   - rollback sequence and operational checks.

## Verification plan

- `npm test -- src/security/jwtConfig.test.ts src/routes/authSession.jwks.test.ts`
- `npm run type-check`

## Expected security outcome

After this patch, RS256 operation is not just "available" but "operationally safe":

- key rotation can be performed without downtime,
- old tokens remain verifiable during controlled overlap windows,
- unknown key material is rejected by default,
- production rollout has an explicit, repeatable runbook.
