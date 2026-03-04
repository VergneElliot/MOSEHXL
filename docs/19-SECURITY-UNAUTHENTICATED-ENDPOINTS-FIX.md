# Fix: Unauthenticated Endpoints

This doc explains **why** leaving routes without authentication is a security risk, **how** auth middleware works in this app, and **what** we changed so that every sensitive endpoint requires a valid token and the right role.

---

## 1. Why unauthenticated endpoints are a problem

An **unauthenticated** endpoint is one that does **not** run any auth middleware. That means:

- **Anyone** can call it — no login, no JWT, no check that the caller is who they claim to be.
- If the endpoint does something sensitive (send emails, read config, expose logs, or even just confirm that a service exists), that action or information is available to the whole internet (or anyone on the same network).

So the risks are:

- **Abuse**: e.g. an attacker spamming test emails through your server, or probing your email configuration.
- **Information disclosure**: e.g. email status or logs revealing configuration details or usage patterns.
- **Confusion**: e.g. a “test” endpoint that looks like it’s part of the admin surface but doesn’t enforce admin — people may assume it’s protected when it isn’t.

The principle: **every endpoint that does something sensitive or that is part of an admin/dev surface should require authentication** (and often authorization — e.g. admin-only). “Development-only” is not a substitute for auth: if the route is mounted in production, it must be protected.

---

## 2. How auth works in this app

Authentication and authorization are implemented as **Express middleware** in `middleware/auth.ts` (re-exported from `routes/auth.ts` for backward compatibility).

- **`requireAuth`**  
  - Reads the `Authorization: Bearer <token>` header.  
  - Verifies the JWT with `JWT_SECRET` and decodes the payload (user id, email, `is_admin`, `role`, `establishment_id`).  
  - Attaches the decoded user to `req.user` and calls `next()`.  
  - If the header is missing, invalid, or the token is expired/invalid, it responds with **401** and does not call the route handler.  
  So after `requireAuth`, you know the request is from a **logged-in user** and you have their identity and flags.

- **`requireAdmin`**  
  - Assumes `req.user` is already set (so it must be used **after** `requireAuth`).  
  - Checks `req.user.is_admin === true`.  
  - If not, responds with **403** (“System administrator access required”) and does not call the route handler.  
  So after `requireAuth` + `requireAdmin`, you know the request is from a **system administrator**.

Usage pattern: list the middleware in order on the route. For example:

```ts
router.get('/sensitive', requireAuth, requireAdmin, (req, res) => { ... });
```

So: **authenticate first**, then **authorize** (e.g. admin-only). Never rely on “this is only for dev” without also enforcing auth when the route is reachable.

---

## 3. What was wrong (audit findings)

Two places had routes with **no auth middleware**:

1. **`routes/emailTest.ts`**  
   - **POST /api/test-email** — Sends a test email to an arbitrary address from the request body. No auth, so anyone could trigger emails and probe the mail config.  
   - **GET /api/email-status** — Returns whether email is configured, validation result, stats, default sender. No auth, so anyone could see this.  
   - **GET /api/email-logs** — Returns the last 10 email logs. No auth, so anyone could read logs.  

   The comment said “Development-only”, but the routes were mounted under `/api` and were reachable without a token.

2. **`routes/adminDashboard.ts`**  
   - **GET /api/admin-dashboard/test** — A minimal “test endpoint” used to isolate errors. It had no auth, while **GET /api/admin-dashboard/metrics** right below it used `requireAuth` and `requireAdmin`. So the test endpoint was the odd one out and could be called by anyone, confirming the admin dashboard service and path.

So the fix is: **add auth (and, where appropriate, admin) middleware to these routes** so they are no longer unauthenticated.

---

## 4. How we fix it

### 4.1 Email test routes (`routes/emailTest.ts`)

- **Imported** `requireAuth` and `requireAdmin` from `./auth`.
- Applied **`requireAuth, requireAdmin`** to all three handlers:
  - **POST /api/test-email**
  - **GET /api/email-status**
  - **GET /api/email-logs**

Only authenticated **system administrators** can send test emails or view email status/logs. This matches the intent of “development-only” and the pattern used elsewhere (e.g. team routes’ test-email and email-stats).

### 4.2 Admin dashboard test route (`routes/adminDashboard.ts`)

- **GET /api/admin-dashboard/test** now uses **`requireAuth, requireAdmin`** (same as **GET /api/admin-dashboard/metrics**).

So the test endpoint is no longer unauthenticated and is consistent with the rest of the admin dashboard.

---

## 5. Summary of code changes

| File | Route | Change |
|------|-------|--------|
| **routes/emailTest.ts** | POST /api/test-email | Added `requireAuth, requireAdmin` before handler. |
| **routes/emailTest.ts** | GET /api/email-status | Added `requireAuth, requireAdmin` before handler. |
| **routes/emailTest.ts** | GET /api/email-logs | Added `requireAuth, requireAdmin` before handler. |
| **routes/adminDashboard.ts** | GET /api/admin-dashboard/test | Added `requireAuth, requireAdmin` before handler. |

No new middleware was introduced; we reused the existing `requireAuth` and `requireAdmin` from `routes/auth` (which re-exports from `middleware/auth.ts`).

---

## 6. Takeaway

- **Every sensitive or admin/dev endpoint must use auth middleware.** “Dev-only” or “it’s just a test” does not replace authentication when the route is mounted and reachable.
- **Order matters:** use `requireAuth` first (so `req.user` is set), then `requireAdmin` (or other role checks) so only the right callers reach the handler.
- **Consistency:** if other routes in the same router (e.g. admin-dashboard metrics) are admin-only, any sibling “test” or “status” route should be protected the same way so there are no unauthenticated holes in the same surface.
