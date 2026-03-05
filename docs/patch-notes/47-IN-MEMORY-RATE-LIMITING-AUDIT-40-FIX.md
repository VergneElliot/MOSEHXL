# Fix: In-Memory Rate Limiting (Audit #40)

This doc explains **why** in-memory rate limiting is a problem (won’t work across server processes, resets on restart), **what** we changed (PostgreSQL-backed shared store with in-memory fallback), and **how** to verify and operate it.

---

## 1. What was the problem?

The rate limiting middleware stored counters in a plain in-memory object:

```ts
private store: RateLimitStore = {};  // e.g. { "ip:1.2.3.4": { count: 5, resetTime: ... } }
```

So each request updated `this.store[key]` in the **current Node process only**. That caused two issues.

### 1.1 Won’t work across server processes

- If you run **more than one** server process (e.g. several PM2 workers, or several containers/pods behind a load balancer), each process has **its own memory** and thus its own `store`.
- A client can send 100 requests to process A, 100 to B, 100 to C, etc. Each process only sees its own counter, so the **effective limit is multiplied by the number of processes**.
- So “100 requests per 15 minutes per IP” is no longer enforced **globally**; it’s per process. Rate limiting does not work as intended when you scale horizontally.

### 1.2 Resets on restart

- When the server process **restarts** (deploy, crash, scale-in), all in-memory state is lost. The `store` is empty again.
- Anyone who was rate-limited can immediately send another burst of requests after a restart, as if they had never been limited. Limits don’t “stick” across restarts.

So the audit point **“In-Memory Rate Limiting — Won’t work across server processes. Resets on restart.”** is exactly that: in-memory state is **not shared** and **not durable**.

---

## 2. Core concepts

### 2.1 In-memory vs shared store

- **In-memory store**  
  Counters live only in the Node process (e.g. a `Map` or object).  
  - ✅ Simple, no extra infra.  
  - ❌ Not shared across processes.  
  - ❌ Lost on restart.

- **Shared store (e.g. PostgreSQL or Redis)**  
  Counters live in a separate service that all processes and restarts use.  
  - ✅ Same limit for a given key (IP/user) no matter which process handles the request.  
  - ✅ Limits survive app restarts (data is in DB or Redis).  
  - ⚠ Requires the store to be available (we already require PostgreSQL for the app).

Using a **shared store** fixes both “multiple processes” and “resets on restart”.

### 2.2 Why we use PostgreSQL (not Redis)

- The app **already** uses PostgreSQL. Adding Redis would be a new dependency and operational piece.
- A single table with `(key, count, reset_time)` is enough for sliding-window or fixed-window rate limits and is shared across all processes.
- So we use **PostgreSQL** as the shared store when a pool is provided; otherwise we keep the **in-memory** store (e.g. single-process dev or tests).

---

## 3. What was changed

### 3.1 Store adapter interface

- **File:** `MuseBar/backend/src/middleware/security/types.ts`  
- Added **`IRateLimitStoreAdapter`**: async interface with `incrementAndGet(key, windowMs)`, `getEntriesForStats()`, `getCount?(key)`, `resetKey(key)`, `cleanup()`, and optional `destroy()`.
- **`SecurityOptions`** now accepts an optional **`pool?: Pool`**. When set, rate limiting uses the shared store; otherwise in-memory.

### 3.2 In-memory and PostgreSQL implementations

- **`InMemoryRateLimitStore`** (`InMemoryRateLimitStore.ts`): same logic as before, wrapped in the async adapter. Used when no pool is passed.
- **`PostgresRateLimitStore`** (`PostgresRateLimitStore.ts`): uses table `rate_limit_store` with `(key, count, reset_time)`. `incrementAndGet` uses an `INSERT ... ON CONFLICT DO UPDATE` so the counter is updated atomically and shared across all processes.

### 3.3 RateLimitMiddleware

- **File:** `MuseBar/backend/src/middleware/security/RateLimitMiddleware.ts`  
- Constructor now takes an optional **`pool?: Pool`**.  
  - If `pool` is provided → use **`PostgresRateLimitStore`** (shared, survives restart).  
  - Otherwise → use **`InMemoryRateLimitStore`** (single process, resets on restart).  
- Middleware is **async**: it `await`s `store.incrementAndGet(...)` then sets headers and calls `next()` or `next(error)`.  
- `getStats()` and `resetKey()` are async and use the same store.  
- Cleanup interval still runs; it calls `store.cleanup()` (e.g. deletes expired rows in PostgreSQL).

### 3.4 Security middleware factory and app

- **`SecurityMiddlewareFactory.create`** accepts `options.pool`. When rate limiting is enabled, it passes `opts.pool` into `RateLimitMiddleware`.  
- **`createSecurityMiddleware(config, logger, { pool })`** is used in **`app.ts`**.  
- **`app.ts`** creates the **database pool before** registering the security middleware and passes **`{ pool }`** into `createSecurityMiddleware` so production (and any multi-process setup) uses the shared PostgreSQL store.

### 3.5 Migration

- **File:** `MuseBar/backend/src/migrations/files/2026_03_05_12_00_00_rate_limit_store.sql`  
- **UP:** Creates table `rate_limit_store` with columns `key` (TEXT PRIMARY KEY), `count` (INT), `reset_time` (TIMESTAMPTZ).  
- **DOWN:** Drops the table.

---

## 4. How to verify

1. **Run migrations**  
   `npm run migration:migrate` in `MuseBar/backend`. Table `rate_limit_store` should exist.

2. **Start the API**  
   Start the backend (single or multiple processes). With pool passed, it uses PostgreSQL.

3. **Hit the limit**  
   Send more than `RATE_LIMIT_MAX_REQUESTS` (e.g. 100) in the configured window (e.g. 15 minutes). You should get **429** and `Retry-After` / `X-RateLimit-*` headers.

4. **Shared across processes**  
   Run two backend instances (different ports) behind a simple round-robin or manual alternation. Send requests to both; the **same** key (IP or user) should be limited globally (e.g. 100 total across both), not 100 per process.

5. **Survives restart**  
   Hit the limit until 429, restart the server, then send again immediately. You should still get 429 until the window expires (counters are in the DB).

6. **Stats**  
   If you have a route or admin that calls `getStats()`, it now returns a Promise; use `await securityMiddleware.getStats()` to get `totalKeys` and `topIPs` from the shared store.

---

## 5. Summary

| Before (audit #40) | After |
|--------------------|--------|
| In-memory object per process | Shared store: PostgreSQL when `pool` is passed |
| Limit per process (N× limit with N processes) | One limit per key across all processes |
| Counters lost on restart | Counters in DB, survive restart |
| Sync middleware | Async middleware using store adapter |

Rate limiting now works **across server processes** and **no longer resets on restart** when the app is started with the database pool (default in `app.ts`).
