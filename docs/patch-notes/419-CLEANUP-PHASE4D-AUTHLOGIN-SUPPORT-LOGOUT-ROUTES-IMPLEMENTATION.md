# 419 - Cleanup Phase 4D: authLogin support and logout routes - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

Phase 4 continues the segmented reduction of the `authLogin.ts` monolith. Phase
4D extracts support impersonation and logout concerns after the shared support
modules, TOTP routes, and session/refresh routes were already separated.

This leaves the parent `authLogin.ts` focused on login orchestration plus child
router assembly. Login is intentionally left for the final Phase 4 auth slice.

---

## 2) What changed

### Support/logout child router

Added `MuseBar/backend/src/routes/authLogin/supportRoutes.ts` for:

| Route | Responsibility |
|------|----------------|
| `POST /support/impersonation/start` | Start audited, time-bounded support impersonation with optional admin TOTP enforcement |
| `POST /support/impersonation/stop` | End support impersonation and return a standard system-admin token |
| `POST /logout` | Revoke the current access token, revoke refresh token when present, clear cookies, and audit logout |

The parent router mounts this module at:

```text
router.use('/', supportRoutes)
```

So the externally visible paths remain unchanged:

```text
/support/impersonation/start
/support/impersonation/stop
/logout
```

### `authLogin.ts` cleanup

Updated `MuseBar/backend/src/routes/authLogin.ts`:

1. removed inline support impersonation and logout handlers,
2. removed imports that only served those handlers,
3. mounted the extracted support router at the same path,
4. preserved login plus child-router assembly.

Line-count result:

```text
After Phase 4C: authLogin.ts 559 LOC
After Phase 4D: authLogin.ts 267 LOC
```

### Focused tests

Added `MuseBar/backend/src/routes/authLogin.supportRoutes.test.ts` to cover the
extracted logout route directly:

1. current access-token revocation,
2. refresh-token revocation,
3. refresh/CSRF cookie clearing,
4. logout audit logging.

Existing support impersonation tests continue to exercise the mounted parent
router paths.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npx vitest run src/routes/authLogin.supportImpersonation.test.ts src/routes/authLogin.supportRoutes.test.ts`
   - Result: 2 files passed / 6 tests passed
2. `npm run type-check`
   - Result: pass
3. `npm run lint`
   - Result: pass
4. `npm test`
   - Result: 68 files passed / 292 tests passed
5. IDE diagnostics on edited auth files
   - Result: no linter errors

---

## 4) Outcome

Phase 4D moves support impersonation and logout concerns into a dedicated module
without changing public routes. The former monolith is now a small login/router
assembly file, backend gates remain green, and logout has direct coverage around
token revocation and cookie clearing.
