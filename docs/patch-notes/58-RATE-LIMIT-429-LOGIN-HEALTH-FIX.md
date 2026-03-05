# Fix: 429 on Login Caused by Health Checks and Rate Limiting

This doc explains **why** login (and other API calls) could return **429 Too Many Requests** after normal app use, **what** we changed (backend: exempt health from rate limit; frontend: single shared init), and **how** to verify.

---

## 1. What was the problem?

### 1.1 Rate limit applies to all routes

The backend applies a **global rate limit** (e.g. 100 requests per 15 minutes per IP) to **every** route, including `GET /api/health`. Health checks are used by the frontend only to discover which backend URL works (localhost vs 127.0.0.1, etc.). Each health request counted toward the same budget as login, categories, orders, etc.

### 1.2 Frontend could send many health requests at once

`apiConfig.initialize()` in `MuseBar/src/config/api.ts` runs a loop that calls `GET /api/health` for several candidate URLs (e.g. 3–4 requests per run). The method was **async and had no lock**: many callers could start it at the same time.

On app load:

- `App.tsx` runs `apiConfig.initialize()` in a `useEffect`.
- `Login.tsx` runs `apiConfig.initialize()` in its own `useEffect`.
- Every `request()` in `core.ts` does `if (!apiConfig.isReady()) await apiConfig.initialize()`.

So many components/hooks could see “not ready” and **all** call `initialize()` in parallel. Each run performed 3–4 health requests. With React’s concurrent rendering (and in dev, Strict Mode double-mount or hot reload), dozens of parallel `initialize()` runs could happen, producing **hundreds** of `GET /api/health` requests in a few seconds. Those requests consumed the rate-limit budget. Once the limit was exceeded, **every** subsequent request from that IP got **429** — including `POST /api/auth/login`. So login could work “a second ago” and then fail with 429 after a reload or after the burst of health checks.

---

## 2. What was changed

### 2.1 Backend: skip rate limiting for GET /api/health

- **File:** `MuseBar/backend/src/middleware/security/RateLimitMiddleware.ts`
- **Change:** At the start of `run()`, if the request is `GET /api/health`, we call `next()` without incrementing the rate-limit counter and without applying the limit.
- **Effect:** Health checks no longer consume the 100-requests-per-window budget. Login and other API calls are no longer blocked by health probes.

### 2.2 Frontend: single shared init promise

- **File:** `MuseBar/src/config/api.ts`
- **Change:**
  - Added a static `initPromise: Promise<void> | null`. The first caller creates it by running the actual probe logic in a new private method `runInitialize()`. Subsequent callers `await initPromise` and return; they do not start another probe loop.
  - `initialize()` now: if already initialized, return; if `initPromise` exists, await it and return; otherwise set `initPromise = this.runInitialize()` and await it.
- **Effect:** No matter how many components call `apiConfig.initialize()` or `request()` before the config is ready, **only one** health-probe loop runs (at most 3–4 requests per app load). The “thundering herd” of health requests is removed.

---

## 3. How to verify

1. **Login after heavy use or reload**
   - Open the app, reload a few times or leave the login page open, then log in. Login should succeed and no longer return 429.

2. **Backend**
   - In `RateLimitMiddleware.ts`, confirm that `GET /api/health` is skipped before `incrementAndGet` (early `next()` when `req.method === 'GET' && req.originalUrl === '/api/health'`).
   - Optionally: send many `GET /api/health` requests; they should all return 200 and not lead to 429 for a subsequent `POST /api/auth/login`.

3. **Frontend**
   - In `api.ts`, confirm a single `initPromise` and that `initialize()` awaits it when it already exists.
   - In the browser Network tab, after a full reload, you should see only a small number of `/api/health` requests (one per URL tried in the single probe loop), not hundreds.

---

## 4. Summary

| Before | After |
|--------|--------|
| Health checks counted toward rate limit | GET /api/health exempt from rate limit |
| Many parallel `initialize()` → hundreds of health requests | Single shared init → one probe loop, ~3–4 health requests per load |
| Login could get 429 after health-check burst | Login and other API calls no longer 429’d by health probes |

Rate limiting still applies to all other routes (auth, categories, orders, etc.). Only the health endpoint is excluded so that connection probing cannot exhaust the budget and block real traffic.
