# 63 — SECURITY: Lock down `/api/auth/setup` endpoint (IMPLEMENTATION)

Date: 2026-04-22  
Branch: `development`  
Related plan: `62-SECURITY-LOCKDOWN-AUTH-SETUP-ENDPOINT-PLAN.md`

---

## Summary

`POST /api/auth/setup` is a one-time bootstrap endpoint that creates the **first** system admin user when the database has no admin yet.

This patch prevents unauthorized callers from claiming system admin by adding a mandatory server-side secret (`SETUP_SECRET`) and requiring callers to provide it via `X-Setup-Secret`.

---

## Final behavior (what changed)

### Before

- `POST /api/auth/setup` was publicly reachable (no auth, no secret).
- If no admin existed, the first HTTP caller could create the system admin.

### After

- In **production**, the backend will **refuse to start** unless `SETUP_SECRET` is set.
- `POST /api/auth/setup` now requires:
  - Environment: `SETUP_SECRET` (≥ 32 chars)
  - Header: `X-Setup-Secret: <SETUP_SECRET>`
- Missing/incorrect secret → `403 Forbidden`
- Correct secret:
  - No admin exists → `201 Created`
  - Admin already exists → `400 Bad Request` (existing behavior preserved)

---

## Files changed

### 1) Backend environment validation + config

- `MuseBar/backend/src/config/environment.ts`
  - Added `SETUP_SECRET` validation (≥ 32 chars if provided)
  - Made `SETUP_SECRET` **required in production**
  - Exposed it via `config.security.setupSecret`

### 2) Backend env template

- `MuseBar/backend/.env.example`
  - Added `SETUP_SECRET=` with a short comment

### 3) New request guard middleware

- `MuseBar/backend/src/middleware/auth.ts`
  - Added `requireSetupSecret(req, res, next)`
  - Uses `crypto.timingSafeEqual` for comparison
  - Fails closed if `SETUP_SECRET` is unset

### 4) Protected the route

- `MuseBar/backend/src/routes/authRegister.ts`
  - Updated `POST /setup` to require `requireSetupSecret`

---

## How to use it (copy/paste)

### 1) Configure the secret (server / production)

In `MuseBar/backend/.env`:

```env
SETUP_SECRET=replace-with-a-long-random-secret-at-least-32-chars
```

Notes:
- This is a **server secret**, like `JWT_SECRET`.
- It should not be shared with normal users.

### 2) Call the endpoint (only when bootstrapping)

```bash
curl -i -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -H "X-Setup-Secret: $SETUP_SECRET" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

---

## Verification performed (local)

Backend was started with `SETUP_SECRET` set in the environment.

### No header → 403

Result: `HTTP/1.1 403 Forbidden`

### Wrong header → 403

Result: `HTTP/1.1 403 Forbidden`

### Correct header → admin already existed → 400

Result: `HTTP/1.1 400 Bad Request` with:

```json
{"error":"Admin user already exists"}
```

This confirms the endpoint is protected and preserves the “one-time setup” semantics.

---

## Rollback

If this causes issues in an environment:

- Revert the commit that introduced `requireSetupSecret` and the route wiring.
- Or temporarily remove the `/api/auth/setup` route entirely (safest).

