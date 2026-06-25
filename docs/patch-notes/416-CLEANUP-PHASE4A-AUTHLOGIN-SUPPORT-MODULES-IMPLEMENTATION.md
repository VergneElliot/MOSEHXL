# 416 - Cleanup Phase 4A: authLogin support modules - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

Phase 4 of the cleanup roadmap targets the remaining `authLogin.ts` monolith.
The full split is too large for one safe pass, so this implementation is the
first segmented slice:

1. extract shared auth route infrastructure,
2. keep all route handlers mounted from the existing `authLogin.ts`,
3. avoid endpoint or behavior changes,
4. keep the auth regression suite as the safety net.

---

## 2) What changed

### New support modules

Added `MuseBar/backend/src/routes/authLogin/` with focused support modules:

| File | Responsibility |
|------|----------------|
| `config.ts` | Auth route constants, refresh expiry, lockout math, cookie names, 2FA policy helpers |
| `cookies.ts` | Refresh/CSRF/client-session cookie parsing, setting, clearing, and CSRF validation |
| `rateLimits.ts` | Login and refresh auth rate-limit middleware setup |
| `sessionSignals.ts` | IP subnet/user-agent normalization and session anomaly scoring/logging |
| `sideEffects.ts` | Fail-closed audit logging and token revocation helpers |

### `authLogin.ts` cleanup

Updated `MuseBar/backend/src/routes/authLogin.ts`:

1. removed inline helper/config/rate-limit blocks,
2. imported the extracted support modules,
3. preserved the existing route handler layout and mount paths,
4. kept login, TOTP, session, refresh, impersonation, and logout routes in the
   existing router for this slice.

Line-count result:

```text
Before Phase 4A: authLogin.ts ~1412 LOC
After Phase 4A:  authLogin.ts 963 LOC
```

This is a meaningful reduction, but Phase 4 is not complete yet: the next slice
should extract route groups (`login`, `totp`, `sessions`, `refresh`,
`impersonation`, `logout`) behind an auth router index.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npm run type-check`
   - Result: pass
2. `npx vitest run src/routes/authLogin.accountLockout.test.ts src/routes/authLogin.loginSessionKick.test.ts src/routes/authLogin.sessions.test.ts src/routes/authLogin.admin2fa.test.ts src/routes/authLogin.supportImpersonation.test.ts src/routes/authLogin.refreshRotation.test.ts src/middleware/security/AuthEndpointRateLimit.test.ts`
   - Result: 7 files passed / 29 tests passed
3. `npm run lint`
   - Result: pass
4. `npm test`
   - Result: 65 files passed / 285 tests passed
5. IDE diagnostics on edited auth files
   - Result: no linter errors

---

## 4) Outcome

Phase 4A reduces the auth monolith safely while preserving behavior. The auth
route remains large, but the shared infrastructure is now modular and ready for
the next route-group extraction pass.
