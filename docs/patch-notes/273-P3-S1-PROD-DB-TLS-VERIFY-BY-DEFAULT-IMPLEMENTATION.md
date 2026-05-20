# 273 - P3-S1 (Production DB TLS certificate verification by default) - Implementation

Date: 2026-05-20  
Related plan: `docs/patch-notes/272-P3-S1-PROD-DB-TLS-VERIFY-BY-DEFAULT-PLAN.md`

## What changed

### 1) Hardened production default for DB TLS verification

Updated:

- `MuseBar/backend/src/config/environment.ts`

Before:

- In production, `sslRejectUnauthorized` defaulted to `false` when
  `DB_SSL_REJECT_UNAUTHORIZED` was unset.

After:

1. Introduced optional compatibility alias:
   - `DB_SSL_ALLOW_SELF_SIGNED=true` -> allows `rejectUnauthorized=false`.
2. Added explicit precedence:
   - `DB_SSL_REJECT_UNAUTHORIZED` (if set) wins.
   - Else use `!DB_SSL_ALLOW_SELF_SIGNED`.
3. Effective production default is now secure:
   - `sslRejectUnauthorized=true` unless explicitly overridden.

### 2) Added validation for SSL boolean env flags

Updated:

- `MuseBar/backend/src/config/environment.ts`

`validateEnvironment()` now validates:

- `DB_SSL_REJECT_UNAUTHORIZED` must be `true|false` if provided.
- `DB_SSL_ALLOW_SELF_SIGNED` must be `true|false` if provided.

Invalid values now fail environment validation at boot.

### 3) Documented operator-facing env knobs

Updated:

- `MuseBar/backend/.env.example`

Added:

- `DB_SSL_REJECT_UNAUTHORIZED=`
- `DB_SSL_ALLOW_SELF_SIGNED=`

with comments clarifying secure default behavior and explicit self-signed fallback.

## Verification

Executed:

1. `npm run type-check` (backend) -> pass
2. `npx vitest run` (backend full suite) -> pass (`44/44`, `176/176`)
3. lint diagnostics on touched files -> no issues

## Result

P3-S1 is now implemented:

- Production DB TLS certificate verification is enabled by default.
- Any downgrade to self-signed / non-verified chain is explicit and auditable in env configuration.

