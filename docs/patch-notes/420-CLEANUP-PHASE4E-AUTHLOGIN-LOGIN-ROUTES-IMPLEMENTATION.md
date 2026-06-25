# 420 - Cleanup Phase 4E: authLogin login routes - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

Phase 4E is the final segmented auth split. Previous slices extracted shared
support modules, TOTP lifecycle routes, session/refresh routes, and
support/logout routes. The only remaining behavior in `authLogin.ts` was the
login handler.

This pass moves login last so the route with the broadest behavior surface
benefits from all earlier extraction and regression coverage.

---

## 2) What changed

### Login child router

Added `MuseBar/backend/src/routes/authLogin/loginRoutes.ts` for:

| Route | Responsibility |
|------|----------------|
| `POST /login` | Authenticate credentials, enforce lockout, enforce admin 2FA when configured, optionally revoke prior sessions, create refresh/CSRF cookies, and return the access token |

The parent router mounts this module at:

```text
router.use('/', loginRoutes)
```

So the externally visible path remains unchanged:

```text
/login
```

### `authLogin.ts` assembly file

Updated `MuseBar/backend/src/routes/authLogin.ts` so it now only assembles the
auth router:

```text
router.use('/', loginRoutes)
router.use('/2fa/totp', totpRoutes)
router.use('/', sessionRoutes)
router.use('/', supportRoutes)
```

Line-count result:

```text
Before Phase 4:  authLogin.ts ~1412 LOC
After Phase 4D:  authLogin.ts 267 LOC
After Phase 4E:  authLogin.ts 15 LOC
```

The largest auth route modules are now focused route groups rather than one
monolithic file.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npx vitest run src/routes/authLogin.accountLockout.test.ts src/routes/authLogin.loginSessionKick.test.ts src/routes/authLogin.admin2fa.test.ts src/routes/authLogin.sessions.test.ts src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts`
   - Result: 6 files passed / 26 tests passed
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

Phase 4E completes the `authLogin.ts` modularization. Login behavior is now in a
dedicated module, the public API remains unchanged, and the parent auth route is
a small assembly file. Backend quality gates remain green after the full split.
