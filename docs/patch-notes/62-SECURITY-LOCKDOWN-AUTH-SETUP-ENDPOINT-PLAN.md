# 62 — SECURITY: Lock down `/api/auth/setup` endpoint (PLAN)

Date: 2026-04-21  
Branch: `development`  
Status: Plan only (no code changes in this document)

---

## Why this matters (problem statement)

The backend currently exposes a bootstrap endpoint:

- `POST /api/auth/setup`

This endpoint creates the **first** system admin user when the database has no `users.is_admin = true` row yet.

Today it is **public** (no authentication / no secret). If the backend is reachable (cloud VM, exposed port, misconfigured firewall), **anyone** can claim system admin on a fresh DB by calling it first.

This is a **CRITICAL** security issue.

---

## Goal

Make it **impossible** for an unauthenticated internet caller to create the first system admin.

We still want an intentional, explicit way for the project owner to bootstrap an environment when needed.

---

## Chosen approach (simple + safe)

Add a server-side secret (`SETUP_SECRET`) and require it on the request:

- Environment variable: `SETUP_SECRET` (minimum 32 characters)
- HTTP header: `X-Setup-Secret: <SETUP_SECRET>`

If the header is missing or incorrect, the endpoint returns **403 Forbidden** and does not create any user.

This keeps the endpoint usable for controlled bootstrap, while closing the “first caller wins” vulnerability.

---

## Implementation steps (what we will do next)

### Step 1 — Add environment support

- Ensure the backend environment loader/validator is aware of `SETUP_SECRET`.
- Decide policy:
  - **Recommended**: In production, require `SETUP_SECRET` to be set (so bootstrap is possible but protected).
  - In development, it can be optional, but the endpoint should still fail closed (403) if it’s not set.

### Step 2 — Implement a small gate middleware/helper

Create a minimal guard that:

- Reads `req.header('x-setup-secret')`
- Compares it with `process.env.SETUP_SECRET`
- If mismatch (or env not set): `return res.status(403).json({ error: 'Forbidden' })`

Optional hardening:

- Log denied attempts (IP, user-agent) to `audit_trail` as `SETUP_ATTEMPT_DENIED`.

### Step 3 — Protect the route

Update the route handler so it requires the guard:

- `POST /api/auth/setup` is no longer public.

### Step 4 — Verify behavior locally

Use the test plan below to ensure:

- Unauthorized calls are rejected
- Authorized calls work when no admin exists
- Existing behavior (admin already exists → 400) remains

### Step 5 — Document what changed

After implementation, create an implementation patch note:

- `63-SECURITY-LOCKDOWN-AUTH-SETUP-ENDPOINT-IMPLEMENTATION.md`

Include:

- Files changed
- Final request/response behavior
- How to set `SETUP_SECRET`
- Copy/paste curl commands

---

## Test plan (copy/paste)

Assumptions:

- Backend running on `http://localhost:3001`
- You set `SETUP_SECRET` in the backend environment before starting the server

### 1) No header → 403

```bash
curl -i -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

Expected: `403 Forbidden`

### 2) Wrong header → 403

```bash
curl -i -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -H "X-Setup-Secret: wrong" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

Expected: `403 Forbidden`

### 3) Correct header, no admin exists → 201

```bash
curl -i -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -H "X-Setup-Secret: $SETUP_SECRET" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

Expected: `201 Created` and returns the created admin user (no token expected, same as current behavior).

### 4) Correct header, admin already exists → 400

Run the same command again.

Expected: `400` with `Admin user already exists`.

---

## Rollback plan

If something breaks unexpectedly:

- Revert the commit that introduces the guard (single commit rollback).
- Alternative quick mitigation: remove the route entirely until a safer bootstrap path is ready.

---

## Notes / constraints

- This fix does **not** replace proper server hardening (SSH + firewall + Nginx reverse proxy). It only removes a dangerous application-level bootstrap footgun.
- This fix is intentionally small and low-risk so it can be shipped quickly before deeper changes (A2 roles, A3 legal journal scoping).

