# Fix: Triple Error Handling System Consolidated

This doc explains **why** having three competing error-handling layers was a problem, **how** Express error middleware and a single hierarchy work, and **what** we changed so there is one clear path for errors and one `asyncHandler`.

---

## 1. What was wrong: three competing systems

The backend had **three** separate error-handling layers:

### 1.1 `middleware/errorHandler.ts` (before)

- **AppError** hierarchy with French user-facing messages (e.g. “Erreur interne du serveur”, “Cette ressource existe déjà”).
- Subclasses: ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError.
- **createErrorHandler(logger)** — normalized errors and sent JSON with `success: false`, `error.message`, `error.code`, etc.
- **asyncHandler(fn)** — wrapped async route handlers and passed rejections to `next(err)`.
- **notFound** — 404 middleware.

The app did **not** use `createErrorHandler` in `app.ts`; it used the handler from `errorHandling.ts` instead. So validation and other code that threw **AppError** were not recognized by the active middleware (which only checked for errorHandling’s classes), and could end up as 500 “Internal Server Error”.

### 1.2 `middleware/errorHandling.ts` (removed)

- A **second** set of error classes (same names: ValidationError, AuthenticationError, etc.) extending **Error** with a `statusCode` property and English messages.
- Extra: BusinessLogicError, DatabaseError, ExternalServiceError.
- **createEnhancedErrorHandler(logger)** — this was the one actually mounted in `app.ts`. It only recognized the errorHandling classes and a few ad‑hoc cases (PG codes, Sequelize, etc.).
- **asyncHandler(fn)** — **identical** to the one in errorHandler.ts (duplicate).
- **CriticalErrorHandler** — class with handleLegalJournalError, handleInvitationError, handleEstablishmentError; **never used** anywhere.

So we had:

- Two definitions of **asyncHandler**.
- Two global error middlewares (only one used).
- Two hierarchies (AppError vs native Error + statusCode); code using one hierarchy was not fully handled by the middleware that was in use.

### 1.3 `utils/errors/standardErrorHandler.ts`

- **StandardError** with static factories (e.g. `StandardError.validation()`, `StandardError.notFound()`).
- **ErrorHandler** with handleError, handleAsyncOperation, handleDatabaseOperation, etc.
- **No route or middleware** in the app imported or used this; only `utils/errors/index.ts` re-exported it.

So we had three “systems”, two of them in the request path and inconsistent, and one unused.

---

## 2. Why this is a problem

- **Inconsistent behavior:** Some code threw AppError (errorHandler), some threw errorHandling’s ValidationError/DatabaseError. The middleware in use only understood the latter and ad‑hoc cases, so AppError could be treated as 500.
- **Duplicate code:** Two identical `asyncHandler` implementations; two similar handlers and two similar class hierarchies.
- **Confusion:** New (or existing) developers don’t know which errors to throw or which file to import from.
- **Dead code:** CriticalErrorHandler and the unused createErrorHandler from errorHandler added surface area with no benefit.
- **Bug:** RateLimitMiddleware **threw** RateLimitError instead of calling **next(error)**. In Express, throwing in synchronous middleware does not invoke the error handler; you must call `next(err)`.

Consolidating to **one** hierarchy, **one** handler, and **one** asyncHandler removes duplication and ensures every thrown error is handled in a predictable way.

---

## 3. How Express error handling works (teaching)

- **Sync route/middleware:** If you `throw`, Express does **not** catch it; the process can crash or an outer try/catch must handle it. To send an error response, you must call **next(error)** so Express runs the “error middleware” (the function with signature `(err, req, res, next)`).
- **Async route/middleware:** If a Promise rejects, Express does **not** see that rejection unless you either await in a try/catch and call `next(err)`, or wrap the handler so that rejections are passed to `next`. Hence **asyncHandler**: it runs `fn(req, res, next)` and does `.catch(next)`, so any thrown or rejected error becomes `next(err)`.
- **Error middleware:** Should be registered **last** (after routes and 404). It receives `(err, req, res, next)` and is responsible for logging and sending a JSON (or HTML) response. It should normalize different error shapes (e.g. PG codes, JWT, custom classes) into one response format.

So: **one** error middleware that recognizes your **one** error hierarchy and maps everything else (PG, JWT, etc.) into that shape, and **one** asyncHandler so async route errors always reach that middleware.

---

## 4. What we did

### 4.1 Single module: `middleware/errorHandler.ts`

- **One base class:** **AppError** (message, statusCode, errorCode, details, isOperational).
- **One hierarchy:** ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError, BusinessLogicError, DatabaseError, ExternalServiceError — all extend AppError and set statusCode/name.
- **One asyncHandler:** Single implementation; all async routes that need it import it from here.
- **One createErrorHandler(logger):**  
  - If the error is an **AppError** (or subclass), use its statusCode, message, errorCode, details.  
  - Else map known cases: PostgreSQL codes (23505, 23503, …), JWT (JsonWebTokenError, TokenExpiredError), ValidationError/CastError, ECONNREFUSED/ENOTFOUND, rate-limit message, JSON syntax, file upload limits.  
  - Else treat as 500 internal error (non-operational message hidden in production).  
  - Always send the same JSON shape: `{ success: false, error: { message, code, statusCode, timestamp, requestId?, details?, stack? } }`.
- **notFound:** Calls `next(new AppError(...))` for 404.

So there is a single place to throw (AppError and subclasses), a single place to wrap async handlers (asyncHandler), and a single place that turns errors into HTTP responses (createErrorHandler).

### 4.2 App and imports

- **app.ts** now imports **asyncHandler**, **notFound**, and **createErrorHandler** from `middleware/errorHandler.ts`, and registers `notFound` then `createErrorHandler(logger)`. No more `createEnhancedErrorHandler` or `errorHandling`.
- **validation.ts** — already used AppError from errorHandler; unchanged.
- **InputSanitization** — already used ValidationError from errorHandler; unchanged.
- **RateLimitMiddleware** — still uses RateLimitError from errorHandler; **changed** from `throw new RateLimitError(...)` to **return next(new RateLimitError(...))** so the error reaches the error middleware.
- **invitationValidator** — imports ValidationError and DatabaseError from **middleware/errorHandler** instead of errorHandling.

### 4.3 Removed

- **middleware/errorHandling.ts** — deleted (createEnhancedErrorHandler, duplicate asyncHandler, duplicate error classes, unused CriticalErrorHandler).

### 4.4 standardErrorHandler.ts

- **Unchanged** in behavior. It remains available for programmatic use (e.g. StandardError factories, ErrorHandler.handleDatabaseOperation) if you want it.
- A short comment was added at the top: the app’s **HTTP** error handling lives in **middleware/errorHandler.ts**; this module is for programmatic/utility use. No route or middleware depends on it, so the “single system” for the request path is errorHandler.

---

## 5. Summary

| Before | After |
|--------|--------|
| Two middleware files (errorHandler + errorHandling), two hierarchies, two asyncHandlers | One file: middleware/errorHandler.ts with one hierarchy, one asyncHandler, one createErrorHandler |
| App used createEnhancedErrorHandler (errorHandling); AppError from errorHandler not fully recognized | App uses createErrorHandler(logger) from errorHandler; all AppError subclasses recognized |
| RateLimitMiddleware threw → error handler could be skipped | RateLimitMiddleware calls next(RateLimitError) → always hits error handler |
| standardErrorHandler unused in routes | Still unused; documented as optional programmatic layer |

Result: one error hierarchy, one global handler, one asyncHandler, no duplicate or dead error-handling code in the request path. Optional use of StandardError/ErrorHandler remains in utils/errors for non-HTTP use if desired.
