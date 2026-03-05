# Fix: Debug console.log Everywhere (Audit #25)

This doc explains **why** raw `console.log` / `console.error` / `console.warn` in application code are a problem, **what** we changed in the backend and frontend, and **how** to keep logging structured and safe.

---

## 1. What was the problem?

The audit reported **~50+ instances** of debug `console.*` usage:

- **Backend:** Logs bypassed the structured logger (no levels, no request IDs, no file output). Some ran on **every HTTP request** (security middleware, request logger), adding noise and making it harder to see real issues. Error paths used `console.error` instead of the central error handler or logger.
- **Frontend:** Debug logs (including **tokens**, **auth headers**, **passwords masked but still risky**) could leak in production or in shared consoles. Emoji-style logs were left from development and had no benefit in production.

**Why it matters:**

- **Structured logging:** Backend should use one logger with levels (debug/info/warn/error), categories, and optional file/transport. `console` doesn’t support that.
- **Security:** Logging tokens, “Token present”, or “Adding Authorization header” can end up in logs or browser devtools and is unnecessary in production.
- **Noise:** Dozens of logs per request make it hard to find real errors and to tune log level (e.g. disable debug in production).
- **Consistency:** Mixing `console` and logger in the same app makes it unclear where to look and how to configure output.

---

## 2. What we changed

### 2.1 Backend: SecurityMiddleware.ts

- **Before:** Four `console.log` calls on every request (middleware index, completion, exception).
- **After:** The factory already had a `Logger` instance. We pass it into `executeMiddlewares` and replace all `console.log` with `logger.warn` for errors/exceptions and remove the “all middlewares completed” / “executing middleware N” debug lines so we don’t log on every request. Only real issues are logged.

### 2.2 Backend: requestLogger.ts

- **Before:** Two `console.log` calls per request (request start, middleware completed).
- **After:** Both are replaced with `logger.debug(...)` so they only appear when the log level is DEBUG. The middleware already had access to `logger`; it now uses it instead of `console`.

### 2.3 Backend: CompositePrintingService.ts

- **Before:** 22 `console.log` / `console.warn` / `console.error` calls (init, each print attempt, failures, history).
- **After:** Service uses `getLogger()` from `utils/logger` and calls `logger.info`, `logger.warn`, `logger.error`, `logger.debug` with structured messages and metadata. No raw `console`.

### 2.4 Backend: routes/printing.ts

- **Before:** 10 `console.error` calls in catch blocks.
- **After:** File imports `getLogger()` and uses `getLogger().error(...)` with the error object so errors go through the central logger (levels, formatting, file transport).

### 2.5 Frontend: EstablishmentAccountCreation/index.tsx

- **Before:** Nine `console.log`/`console.error` calls, including **`console.log('Token:', token)`** and logs of business info and “Password: ***”.
- **After:** All removed. User feedback is already shown via `setupActions.setError` and success message; no need to log tokens or sensitive data.

### 2.6 Frontend: services/api/core.ts

- **Before:** Three `console.log` calls: setToken (“Token present”/“null”), “Adding Authorization header”, “No auth token available”.
- **After:** All removed. Auth state and headers must not be logged in production or dev.

### 2.7 Frontend: services/authHelper.ts

- **Before:** Four `console.log` calls about token presence and setToken availability.
- **After:** All removed. Behavior unchanged; no logging of auth state.

### 2.8 Frontend: hooks/useEstablishments.ts

- **Before:** Five `console.log`/`console.error` calls (load start, auth_token presence, API call, response, errors, timeout).
- **After:** All removed. Errors are still surfaced via `setError`; no debug or token-related logs.

### 2.9 Other frontend files (same pass)

- **apiService.ts:** Removed `console.log` in `setToken`.
- **config/api.ts:** Removed connectivity test logs and the “No backend reachable” `console.warn` so API init doesn’t depend on console.
- **useSettings.ts** and **usePaymentSettings.ts:** Removed placeholder `console.log`/`console.error` for settings and printer test; errors still propagate via throw/setState.

---

## 3. What we did *not* change (and why)

- **Backend:** Other files (e.g. legal routes, migrations CLI, `environment.ts`, `errorHandler.ts`, `logFormatters.ts`) still use `console` in places. The audit’s “notable concentrations” were SecurityMiddleware, requestLogger, CompositePrintingService, and printing routes; we fixed those. Migrations and env validation often run outside the app’s logger lifecycle, so they can stay on `console` unless you introduce a CLI logger.
- **Frontend:** Remaining `console.error` in catch blocks (e.g. Login, useAuth, ErrorBoundary) were left as-is for this pass. You can later replace them with a small error-reporting or logging helper if you want a single place to send errors (e.g. to a service or dev-only logger).
- **Tests:** `setupTests.ts` still mocks `console.error`/`console.warn` for React warnings; that’s intentional and unchanged.

---

## 4. How to verify

1. **Backend:** From `MuseBar/backend`, run `npm run build`. Then start the server and send a few requests; logs should come from the structured logger (e.g. in `logs/` if file logging is on). There should be no `[SECURITY_MIDDLEWARE]` or `[REQUEST_LOGGER]` lines from `console`.
2. **Frontend:** From `MuseBar`, run `npm run build`. Open the app, complete account creation or load establishments; the browser console should have no new debug logs from these components or from api/core / authHelper.
3. **Security:** Search the repo for `console.log.*[Tt]oken` and `Authorization`; there should be no logs that expose tokens or auth headers in the changed files.

---

## 5. Takeaway

- **Backend:** Use a single structured logger (`Logger` / `getLogger()`). Use `logger.debug` for high-volume or verbose logs so they can be turned off in production; use `logger.error`/`logger.warn` for failures. Avoid `console` in request-handling and service code.
- **Frontend:** Avoid logging tokens, headers, or auth state. Rely on UI state and error boundaries for user-facing errors. If you need dev-only logs, guard them with `process.env.NODE_ENV === 'development'` or a small dev logger that is no-op in production.
- **Consistency:** Once you adopt a logger, use it everywhere in that layer so levels and transports can be configured in one place.
