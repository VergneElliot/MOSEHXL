# 272 - P3-S1 (Production DB TLS certificate verification by default) - Plan

Date: 2026-05-20  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-S1)

## Why this patch exists

Current backend environment config defaults production DB SSL to:

- `ssl: true`
- `sslRejectUnauthorized: false` unless `DB_SSL_REJECT_UNAUTHORIZED=true` is set.

That means production DB connections can run with certificate chain verification
disabled by default, creating a MITM risk on the database channel.

P3-S1 requires the secure default:

- **production must verify certificates by default**.

## Scope

### In scope

1. Change production default so `sslRejectUnauthorized` is `true` unless
   explicitly overridden.
2. Keep an explicit escape hatch for self-signed provider chains:
   - `DB_SSL_REJECT_UNAUTHORIZED=false`, or
   - `DB_SSL_ALLOW_SELF_SIGNED=true` (compatibility alias).
3. Validate boolean env values for the SSL toggles.
4. Update `.env.example` so operators can discover/configure these flags.

### Out of scope

- Certificate pinning / custom CA bundle wiring.
- Runtime certificate rotation mechanics.

## Strategy

### Step 1 - Harden environment config defaults

In `config/environment.ts`:

1. Parse two optional flags:
   - `DB_SSL_REJECT_UNAUTHORIZED`
   - `DB_SSL_ALLOW_SELF_SIGNED`
2. Resolve effective value with precedence:
   - if `DB_SSL_REJECT_UNAUTHORIZED` is provided, use it;
   - else if `DB_SSL_ALLOW_SELF_SIGNED=true`, set rejectUnauthorized to `false`;
   - else default to `true` in production.
3. Keep non-production behavior unchanged (`true` when SSL used in test/dev).

### Step 2 - Validation and documentation

1. Extend env validation to ensure both SSL flags, when provided, are strict
   booleans (`true|false`).
2. Add commented entries to `.env.example` describing secure defaults and when
   to use self-signed fallback.

### Step 3 - Verify

1. Backend type-check.
2. Full backend tests (config changes can affect startup paths).
3. Lint diagnostics on touched files.

## Acceptance criteria

1. Production config resolves to `sslRejectUnauthorized=true` by default.
2. Operators can intentionally opt into self-signed mode via explicit env flags.
3. Invalid boolean values for DB SSL toggles fail environment validation.
4. Existing app and migration CLI still compile and test cleanly.

