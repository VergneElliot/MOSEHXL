# Fix: Hardcoded Secrets in Source Code

This document explains **what the problem is**, **why it matters**, and **how we fixed it** without breaking the running system.

---

## 1. What is the problem?

In several places the code uses a **fallback value** when an environment variable is missing:

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';  // BAD
password: process.env.DB_PASSWORD || 'password',                // BAD
this.jwtSecret = process.env.JWT_SECRET || 'supersecretkey';    // BAD
private static readonly SECRET_KEY = 'MUSEBAR-LEGAL-...';      // BAD (used as fallback)
```

So if `JWT_SECRET` or `DB_PASSWORD` (or `ARCHIVE_SECRET_KEY`) are **not set** in the environment, the app still starts and uses these known-in-advance values.

---

## 2. Why is that dangerous?

### 2.1 JWT secret (`'supersecretkey'`)

- JWTs are **signed** with a secret. Anyone who knows the secret can **create valid tokens** (e.g. pretend to be an admin).
- If the secret is hardcoded or a well-known fallback:
  - Anyone with access to the repo (or to a deployed binary) knows the secret.
  - They can generate a token with `{ id: 1, is_admin: true }` and the server will accept it.
- So: **one missing env var can hand over full authentication.**

### 2.2 Database password (`'password'`)

- If the app connects with a default password when `DB_PASSWORD` is unset:
  - In production, an attacker who can reach the DB might try that default and get in.
  - In dev, it encourages bad habits (reusing the same weak password everywhere).

### 2.3 Archive HMAC key (hardcoded string)

- Legal/archive exports are signed with HMAC so you can prove they weren’t tampered with.
- If the key is hardcoded (or a predictable fallback), anyone who can read the code can:
  - Forge valid signatures, or
  - Modify an export and re-sign it.
- That undermines the integrity of those exports.

---

## 3. Why did the fallbacks exist?

Usually for convenience:

- “So the app starts even if someone forgets to set `.env`.”
- “So we have a default for local dev.”

The downside: the same code often runs in **production**. If someone deploys without setting env vars, production silently uses the weak defaults. So the intention (easier dev) creates a **real production risk**.

---

## 4. How we fix it (and keep the system working)

Principle: **no secret is ever read from source code.** Secrets come only from **configuration that is validated at startup**.

### 4.1 Single source of truth at startup

We already have:

- `config/environment.ts`:
  - `validateEnvironment()` — checks that required env vars are **present** (and valid, e.g. JWT length).
  - `getEnvironmentConfig()` — builds the app config from env (database, JWT, etc.).
- `app.ts` calls `initializeEnvironment()` first, which runs `validateEnvironment()` and then `getEnvironmentConfig()`.

So **before** any route or service runs, we know whether required vars are set. If they’re missing, we **exit with an error** instead of starting the server.

### 4.2 What we changed

1. **No fallbacks in code**
   - Every place that needs a secret now gets it either:
     - From the **validated config** (preferred), or
     - From `process.env.X` **without** a fallback, with a **startup-time check** that the var is set (so we fail fast if someone forgets `.env`).

2. **JWT**
   - `middleware/auth.ts`: Read `process.env.JWT_SECRET` only; if it’s missing at module load, **throw** so the process never starts with a default.
   - `UserAccountOperations`: No longer reads `JWT_SECRET` from env with a fallback. It receives the JWT secret as a **constructor argument** from `AccountCreationOrchestrator`, which gets it from `getEnvironmentConfig().security.jwtSecret` (already validated at startup).

3. **Database**
   - `app.ts`: The Pool is created from `config.database` (from `initializeEnvironment()`). So it uses the same validated config; no more `process.env.DB_PASSWORD || 'password'` in app.ts.
   - `config/environment.ts`: Removed the fallback `|| 'password'` in `getEnvironmentConfig()`. After `validateEnvironment()`, `DB_PASSWORD` is required, so we don’t need a default.

4. **Archive HMAC**
   - Removed the hardcoded `SECRET_KEY` constant.
   - The archive service reads `process.env.ARCHIVE_SECRET_KEY` only. If it’s missing when we need it (signing/verifying), we **throw** with a clear message.
   - We added `ARCHIVE_SECRET_KEY` to the list of required env vars **in production** (optional in development so local dev can skip archive signing if they don’t need it, or set a dev-only value in `.env`).

### 4.3 Keeping the system working

- **Development:** Set all required variables in `.env` (or `.env.development`). If you forget one, the app **refuses to start** and prints which variable is missing. No silent fallback to a weak secret.
- **Production:** Same idea: required vars must be set (e.g. in the deployment environment or secrets manager). No defaults.
- **Existing behaviour:** Any deployment that already sets `JWT_SECRET`, `DB_PASSWORD`, and (in prod) `ARCHIVE_SECRET_KEY` keeps working; we only removed the **fallbacks**, not the variables themselves.

So: **integrity** is maintained (no secrets in source, no weak defaults), and the **system keeps working** as long as configuration is correctly provided (which we now enforce at startup).

---

## 5. Files touched (summary)

| File | Change |
|------|--------|
| `config/environment.ts` | Require `ARCHIVE_SECRET_KEY` in production; remove `\|\| 'password'` in `getEnvironmentConfig()`; optional: add `archiveSecretKey` to config type. |
| `middleware/auth.ts` | Use `process.env.JWT_SECRET` only; throw at load time if missing. |
| `app.ts` | Create Pool from `config.database` (no direct env fallbacks). |
| `models/archiveService.ts` | Remove hardcoded `SECRET_KEY`; use `process.env.ARCHIVE_SECRET_KEY` and throw if missing when signing/verifying. |
| `services/establishmentAccountCreation/database/UserAccountOperations.ts` | Accept `jwtSecret` in constructor (from orchestrator); no env fallback. |
| `services/establishmentAccountCreation/AccountCreationOrchestrator.ts` | Pass `config.security.jwtSecret` into `UserAccountOperations` constructor. |

---

## 6. What you need to do locally

1. Ensure `MuseBar/backend/.env` (or your active env file) contains at least:
   - `JWT_SECRET` (at least 32 characters; e.g. a long random string).
   - `DB_PASSWORD` (your real DB password).
   - In production (or when testing archive signing): `ARCHIVE_SECRET_KEY` (long random string).
2. Restart the backend. If something is missing, the process will exit with a clear error and tell you which variable to set.

This way we fix the security issue while keeping the system running with explicit, validated configuration.
