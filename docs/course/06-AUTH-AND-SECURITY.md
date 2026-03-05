# Chapter 6 — Authentication and Security

This chapter explains how users prove who they are (authentication), how we control what they can do (authorization), and how we protect the system from attacks.

---

## Authentication vs. Authorization

These are two different things:

- **Authentication** — "Who are you?" (login, proving identity)
- **Authorization** — "What are you allowed to do?" (permissions, roles)

You authenticate first (prove you're Elliot), then we authorize your actions (Elliot is an admin, so he can manage users).

---

## Passwords — bcrypt

We never store passwords in plain text. If the database is compromised, attackers would have everyone's passwords. Instead, we store a **hash** — a one-way transformation.

```
"Vergemolle22@"  →  bcrypt  →  "$2b$12$xQ8K3mL1pT2vR7sU6jE4..."
```

The hash cannot be reversed to get the original password. To verify a login, we hash the entered password and compare:

```typescript
// When user registers:
const hash = await bcrypt.hash(password, 12);  // 12 = cost factor (more = slower = more secure)
// Store hash in database

// When user logs in:
const isMatch = await bcrypt.compare(enteredPassword, storedHash);  // true or false
```

The number `12` is the **cost factor** (or "rounds"). Higher = slower to compute = harder for attackers to brute-force. 12 is a good balance between security and speed (~250ms per hash on modern hardware).

### Why bcrypt and not SHA-256?

SHA-256 is a general-purpose hash — it's fast by design. An attacker with a GPU can try billions of SHA-256 hashes per second. bcrypt is intentionally slow and designed specifically for passwords.

---

## JWT — JSON Web Tokens

After login, the user needs to prove their identity on every subsequent request without sending their password every time. We use **JWTs** (JSON Web Tokens) for this.

### How it works

```
1. User sends email + password to POST /api/auth/login
2. Backend verifies credentials
3. Backend creates a JWT containing user info
4. Backend sends JWT back to frontend
5. Frontend stores JWT in localStorage
6. Every subsequent API call includes: Authorization: Bearer <token>
7. Backend verifies the JWT on each request
```

### What's inside a JWT?

A JWT has three parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MywiZW1haWwiOiJlbGxpb3QudmVyZ25lQGdtYWlsLmNvbSIsImlzX2FkbWluIjp0cnVlfQ.abc123...
      HEADER             .            PAYLOAD                                                             .  SIGNATURE
```

**Header**: `{ "alg": "HS256" }` — which algorithm was used to sign

**Payload**: The actual data (called "claims"):
```json
{
  "id": 3,
  "email": "elliot.vergne@gmail.com",
  "is_admin": true,
  "iat": 1709000000,       // issued at (timestamp)
  "exp": 1709043200        // expires at (12 hours later)
}
```

**Signature**: A cryptographic signature created using the payload + a secret key (`JWT_SECRET`). If anyone modifies the payload (e.g., changes `is_admin` to `true`), the signature won't match and the token is rejected.

### Creating a token

```typescript
const token = jwt.sign(
  { id: user.id, email: user.email, is_admin: user.is_admin },  // payload
  JWT_SECRET,                                                       // secret key
  { expiresIn: '12h' }                                              // expiration
);
```

### Verifying a token

```typescript
const payload = jwt.verify(token, JWT_SECRET);
// If the token is expired or the signature doesn't match → throws an error
// If valid → returns the payload { id, email, is_admin }
```

### Why localStorage?

The frontend stores the token in `localStorage` so it persists across page reloads and browser restarts. On each API call, `apiService` reads it and attaches it as a header:

```typescript
headers: { 'Authorization': `Bearer ${token}` }
```

The backend's `requireAuth` middleware reads this header, verifies the token, and attaches the user info to `req.user`.

### Token expiration and refresh

Tokens expire after 12 hours (or 7 days with "remember me"). Before expiration, the frontend calls `POST /api/auth/refresh` to get a new token with a fresh expiration. This is done automatically by `useAuth.ts`.

---

## Role-Based Access Control

Our system has three roles:

| Role | What they see | How it's checked |
|------|--------------|-----------------|
| `system_admin` | System Admin interface (establishments, system users) | `user.role === 'system_admin'` in `App.tsx` |
| `establishment_admin` | All business tabs based on permissions | `user.is_admin` in `requireAdmin` middleware |
| `cashier` | Only tabs their permissions allow | `user.permissions.includes('access_pos')` in `AppRouter.tsx` |

### How permissions work

Permissions are stored in the database:

```
users table:              permissions table:      user_permissions (join table):
┌────┬───────────┐       ┌────┬──────────────┐    ┌─────────┬───────────────┐
│ id │ email     │       │ id │ name         │    │ user_id │ permission_id │
├────┼───────────┤       ├────┼──────────────┤    ├─────────┼───────────────┤
│  1 │ alice@... │       │  1 │ access_pos   │    │       1 │             1 │  (alice → POS)
│  2 │ bob@...   │       │  2 │ access_menu  │    │       1 │             4 │  (alice → history)
│  3 │ elliot@...│       │  3 │ access_happy │    │       2 │             1 │  (bob → POS only)
└────┴───────────┘       │  4 │ access_history│    └─────────┴───────────────┘
                         └────┴──────────────┘
```

Alice can see POS and History. Bob can only see POS. The `requirePermission` middleware checks this:

```typescript
export function requirePermission(permission: string) {
  return async (req, res, next) => {
    if (req.user?.is_admin) return next();  // admins bypass permission checks
    const perms = await UserModel.getUserPermissions(req.user.id);
    if (!perms.includes(permission)) return res.status(403).json({ error: 'Permission denied' });
    next();
  };
}
```

On the frontend, `AppRouter.tsx` filters which tabs are visible:

```typescript
const filteredTabs = TABS.filter(tab => {
  if (tab.adminOnly) return user?.is_admin;
  if (tab.permission) return user?.permissions?.includes(tab.permission);
  return true;
});
```

---

## CORS — Cross-Origin Resource Sharing

The frontend runs on `localhost:3000`. The backend runs on `localhost:3001`. These are different **origins** (different ports). Browsers block cross-origin requests by default for security.

**CORS** tells the browser "it's OK for `localhost:3000` to call `localhost:3001`":

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // ... network IPs ...
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
  ],
  credentials: true  // allow cookies and auth headers
}));
```

In production, `CORS_ORIGIN` would include `https://mosehxl.com`.

### How it works technically

1. Browser sends a **preflight request** (OPTIONS) before the real request
2. Backend responds with `Access-Control-Allow-Origin: http://localhost:3000`
3. Browser sees the origin is allowed, sends the real request
4. If the origin isn't in the list, browser blocks the request (you see a CORS error in the console)

---

## Rate Limiting — Preventing Abuse

Rate limiting blocks users who send too many requests (brute-force attacks, denial of service):

```typescript
// In middleware/security/RateLimitMiddleware.ts:
// "Allow max 100 requests per 15 minutes per IP address"
rateLimitWindowMs: 900000,   // 15 minutes
rateLimitMaxRequests: 100,
```

If someone tries to brute-force the login (guessing passwords), they get blocked after 100 attempts in 15 minutes with a `429 Too Many Requests` response.

### How counters are stored

Rate limit counters need to be stored somewhere. There are two approaches:

- **In-memory** (a JavaScript object in the Node.js process): Simple, but counters reset when the server restarts, and if you run multiple server processes (common in production), each process has its own counter — so a user could exceed the limit by spreading requests across processes.

- **PostgreSQL-backed** (a `rate_limit_store` table in the database): Counters are shared across all server processes and survive restarts. This is what our system uses in production.

The system uses the **adapter pattern** — an interface (`IRateLimitStoreAdapter`) that both `InMemoryRateLimitStore` and `PostgresRateLimitStore` implement. When the app starts and a database pool is available, it automatically uses PostgreSQL. This means the same code works in development (in-memory, simpler) and production (PostgreSQL, more robust) without changing the middleware logic.

---

## Input Sanitization — Preventing Injection

User input can contain malicious content. The security middleware sanitizes it:

```typescript
// middleware/security/InputSanitization.ts strips:
// - <script> and <iframe> tags (prevents XSS — cross-site scripting)
// - javascript: and vbscript: URLs
// - Event handler attributes (onload=, onerror=, onclick=)
// - Strings longer than 10,000 characters
```

**XSS example**: If a user sets their name to `<script>alert('hacked')</script>` and we display it raw, the script runs in everyone's browser. Sanitization strips the dangerous HTML tags.

### What about SQL injection?

An earlier version of the sanitization code also tried to strip SQL keywords like `SELECT`, `DROP`, `DELETE` from user input. This was actually **harmful** — it would corrupt legitimate data. For example, if a product was named "Selection du Chef", stripping "SELECT" from it would mangle the name.

SQL injection is prevented **only** by using parameterized queries (`$1`, `$2`, etc.) in every database call. This is a fundamental security principle: sanitize for the **output context** (HTML for XSS), but use proper escaping/parameterization for the **data context** (SQL queries). The SQL keyword stripping was removed entirely (see [patch note #16](../patch-notes/16-SECURITY-SQL-KEYWORD-STRIPPING-FIX.md)).

This is a **defense-in-depth** measure — even if our code has a bug, the sanitization layer provides protection against XSS attacks.

---

## Security Headers

`middleware/security/SecurityHeaders.ts` adds HTTP headers that tell the browser to enable security features:

| Header | What it does |
|--------|-------------|
| `X-Content-Type-Options: nosniff` | Prevents the browser from guessing content types (MIME sniffing) |
| `X-Frame-Options: DENY` | Prevents our page from being embedded in an iframe (protects against clickjacking attacks) |
| `X-XSS-Protection: 1; mode=block` | Enables the browser's built-in XSS filter |
| `Strict-Transport-Security` | Forces HTTPS connections (in production only) |
| `Content-Security-Policy` | Controls which resources the browser is allowed to load |
| `Referrer-Policy: strict-origin-when-cross-origin` | Limits what URL info is sent when navigating to other sites |
| `Permissions-Policy` | Restricts access to browser features like camera, microphone, geolocation |

The `X-Powered-By` header (which Express adds by default, revealing "Express" to anyone) is explicitly removed to prevent server fingerprinting — you don't want attackers knowing exactly what software you're running.

---

## The Full Auth Flow

```
┌──────────┐                           ┌──────────┐                    ┌────────┐
│ Frontend │                           │ Backend  │                    │   DB   │
└────┬─────┘                           └────┬─────┘                    └───┬────┘
     │                                      │                              │
     │  POST /api/auth/login               │                              │
     │  { email, password }    ────────►   │                              │
     │                                      │  SELECT * FROM users        │
     │                                      │  WHERE email = $1  ──────►  │
     │                                      │                     ◄──────  │ user row
     │                                      │                              │
     │                                      │  bcrypt.compare(password,    │
     │                                      │    user.password_hash)       │
     │                                      │                              │
     │                                      │  jwt.sign({ id, email,      │
     │                                      │    is_admin }, SECRET)       │
     │                                      │                              │
     │  { token, user, expiresIn } ◄────   │                              │
     │                                      │                              │
     │  localStorage.setItem('auth_token',  │                              │
     │    token)                             │                              │
     │                                      │                              │
     │  --- Later, any API call ---        │                              │
     │                                      │                              │
     │  GET /api/products                  │                              │
     │  Authorization: Bearer <token>──►   │                              │
     │                                      │  jwt.verify(token, SECRET)   │
     │                                      │  req.user = { id, email }    │
     │                                      │                              │
     │                                      │  SELECT * FROM products ──►  │
     │  products[] ◄───────────────────    │                     ◄──────  │
     │                                      │                              │
```

---

## Summary

| Concept | What it does | Where in our project |
|---------|-------------|---------------------|
| bcrypt | Hashes passwords (one-way, slow) | `UserModel.createUser()`, `UserModel.verifyPassword()` |
| JWT | Stateless auth token signed with a secret | `routes/auth.ts` — `jwt.sign()`, `jwt.verify()` |
| requireAuth | Middleware that verifies JWT on each request | `routes/auth.ts` |
| requireAdmin | Middleware that checks admin role | `routes/auth.ts` |
| Permissions | Granular access control per user | `user_permissions` table, `requirePermission()` |
| CORS | Allows cross-origin requests | `app.use(cors({...}))` in `app.ts` |
| Rate limiting | Blocks too many requests per IP | `middleware/security/RateLimitMiddleware.ts` |
| Input sanitization | Strips malicious content from input | `middleware/security/InputSanitization.ts` |
| Security headers | Browser security directives | `middleware/security/SecurityHeaders.ts` |
