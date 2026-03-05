# Fix: Empty Catch Blocks in Auth Routes (Audit #37)

This doc explains **why** catch blocks that don’t log or handle the error are a problem, **what** we changed (capture the error and log it before returning a generic response), and **how** to handle errors in route handlers so failures are visible and debuggable.

---

## 1. What was the problem?

In `routes/auth.ts`, two `try/catch` blocks used a **parameterless catch** and did not log the thrown value:

| Location | Handler | What the catch did |
|----------|---------|--------------------|
| ~line 230 | POST create user (system admin) | `} catch {` then audit log + `return res.status(400).json({ ... })` — the error was never captured or logged |
| ~line 375 | POST create establishment user | `} catch {` then `return res.status(400).json({ ... })` — same: no error variable, no log |

So when `UserModel.createUser` or `UserModel.createUserForEstablishment` threw (e.g. duplicate email, DB error, validation), the handler returned a generic 400 to the client but **nothing** was written to logs. That’s “silently swallowing”: the error is used only to trigger the response; we lose its message, stack, and context for debugging and monitoring.

### Why this is bad

- **No visibility:** In production you can’t tell why a create failed (constraint, timeout, bug). Logs are the main source of truth for failures.
- **Hard to debug:** Without a stack trace or error message, support and developers have to guess or reproduce blindly.
- **Inconsistent:** Other handlers in the same file (e.g. login) already use `catch (error)` and `logger.error(...)`. Parameterless catch with no logging was an oversight.

So we had **silent failures** and **weaker observability**.

---

## 2. Core concepts

### 2.1 Don’t swallow errors

A catch block **swallows** an error when it catches it but does nothing that preserves or reports it: no log, no rethrow, no forwarding to an error handler. The process continues as if nothing went wrong, and the only signal to the caller is often a generic HTTP response. That makes failures invisible to ops and developers.

**Rule of thumb:** In route handlers, if you catch to return a controlled response (e.g. 400), still **log** the error (with message, stack, and relevant context like email or id). Then return the safe response. That way the failure is both handled and visible.

### 2.2 Capture the error in catch

In JavaScript/TypeScript, `catch {` (no parameter) is valid but you have **no reference** to the thrown value. You can’t log it or inspect it. Prefer:

- `catch (err)` or `catch (err: unknown)` so you have the thrown value.
- Then log it (e.g. `logger.error('...', err instanceof Error ? err : new Error(String(err)), ...)`) and optionally normalize for the client (e.g. 400 with a generic message so we don’t leak internals).

Using `unknown` and narrowing (e.g. `err instanceof Error`) is the type-safe pattern recommended in the codebase (see e.g. audit #34).

### 2.3 Structured logging in catch

Use the app logger (e.g. `Logger.getInstance()`) with a clear message and context:

- **Message:** Short, stable description (e.g. “Create user failed”).
- **Context:** Include the error (as Error or normalized) and any request-scoped data that helps (e.g. email, establishmentId). Avoid logging secrets (passwords, tokens).

That gives you searchable, consistent logs and enough context to debug without exposing sensitive data to the client.

---

## 3. What we changed

**File:** `MuseBar/backend/src/routes/auth.ts`.

| Location | Before | After |
|----------|--------|--------|
| Create user (system admin) | `} catch {` — no error variable, no log | `} catch (err) {` — get logger, `logger.error('Create user failed', { error: err instanceof Error ? err : new Error(String(err)), email }, 'AUTH_ROUTE')`, then existing audit + return 400 |
| Create establishment user | `} catch {` — no error variable, no log | `} catch (err) {` — get logger, `logger.error('Create establishment user failed', { error: ..., email, establishmentId }, 'AUTH_ROUTE')`, then return 400 |

**Behaviour:** Unchanged for the client. We still return the same 400 and message. The only change is that the thrown error is now **captured** and **logged** before returning, so failures are visible in logs.

---

## 4. How to verify

- **Trigger a failure:** e.g. create a user with a duplicate email (or invalid data that throws). Confirm the API still returns 400 with the same body.
- **Check logs:** Confirm that a log line is written with message “Create user failed” or “Create establishment user failed” and that the error (and context) appear in the structured log output.
- **Code review:** Search for other `catch {` or `catch ()` with no logging in route handlers and fix them the same way.

---

## 5. Summary

| Topic | Takeaway |
|--------|----------|
| **Silent swallow** | Catching without logging or rethrowing hides failures; always log (and optionally return a safe response). |
| **Capture in catch** | Use `catch (err)` or `catch (err: unknown)` and log `err` so you have visibility and type-safe handling. |
| **Structured log** | Use the app logger with a clear message and context (error + safe request data); avoid leaking secrets. |
| **Audit #37** | Both auth create-user catch blocks now capture the error and log it before returning 400. |

**Audit #37:** Empty/silent catch blocks in auth routes — fixed by capturing the error and logging it in both handlers.
