# 418 - Cleanup Phase 4C: authLogin session and refresh routes - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

Phase 4 continues the segmented reduction of the `authLogin.ts` monolith. Phase
4A extracted shared infrastructure, Phase 4B extracted TOTP lifecycle routes,
and Phase 4C extracts session/profile/refresh concerns.

This pass keeps support impersonation and logout in `authLogin.ts` for the next
slice, because they share support-token and revocation behavior that should move
together.

---

## 2) What changed

### Session and refresh child router

Added `MuseBar/backend/src/routes/authLogin/sessionRoutes.ts` for:

| Route | Responsibility |
|------|----------------|
| `GET /me` | Return the authenticated user's current profile and permissions |
| `GET /sessions` | List active refresh sessions and mark the current family |
| `POST /sessions/revoke-others` | Revoke all refresh-token families except the current one |
| `GET /legacy-claim-metrics` | Return legacy `is_admin` claim metrics and policy state |
| `POST /refresh` | Rotate refresh tokens, re-issue access tokens, enforce CSRF, lockout, inactive-user, and absolute-session-cap rules |

The parent router mounts this module at:

```text
router.use('/', sessionRoutes)
```

So the externally visible paths remain unchanged:

```text
/me
/sessions
/sessions/revoke-others
/legacy-claim-metrics
/refresh
```

### `authLogin.ts` cleanup

Updated `MuseBar/backend/src/routes/authLogin.ts`:

1. removed inline session, profile, legacy-metrics, and refresh route handlers,
2. removed the imports that only served those handlers,
3. mounted the extracted router at the same path,
4. preserved login, TOTP mount, support impersonation, and logout routes for the
   remaining Phase 4 slices.

Line-count result:

```text
After Phase 4B: authLogin.ts 832 LOC
After Phase 4C: authLogin.ts 559 LOC
```

### Focused tests

Added `MuseBar/backend/src/routes/authLogin.sessionRoutes.test.ts` to cover moved
endpoints that did not have dedicated tests:

1. `GET /me` returns profile data plus permissions,
2. `GET /legacy-claim-metrics` returns metrics plus policy state.

Existing session and refresh tests continue to exercise the mounted parent
router paths.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npx vitest run src/routes/authLogin.sessions.test.ts src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.totpRoutes.test.ts src/routes/authLogin.admin2fa.test.ts src/routes/authLogin.supportImpersonation.test.ts`
   - Result: 5 files passed / 25 tests passed
2. `npx vitest run src/routes/authLogin.sessionRoutes.test.ts`
   - Result: 1 file passed / 2 tests passed
3. `npm run type-check`
   - Result: pass
4. `npm run lint`
   - Result: pass
5. `npm test`
   - Result: 67 files passed / 291 tests passed
6. IDE diagnostics on edited auth files
   - Result: no linter errors

---

## 4) Outcome

Phase 4C moves the session/profile/refresh concerns into a dedicated route
module, preserving the existing public API while reducing the remaining
`authLogin.ts` file to 559 LOC. The backend quality gate remains green and the
new direct tests close coverage around moved profile and legacy-metrics routes.
