# 417 - Cleanup Phase 4B: authLogin TOTP routes - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

Phase 4 continues the segmented reduction of the `authLogin.ts` monolith. Phase
4A extracted shared infrastructure; Phase 4B extracts the TOTP enrollment and
management route group while preserving the existing public auth paths.

This pass intentionally leaves login-time 2FA enforcement in `authLogin.ts`.
That code is part of the login handler and should move later with the final
login extraction.

---

## 2) What changed

### TOTP child router

Added `MuseBar/backend/src/routes/authLogin/totpRoutes.ts` for:

| Route | Responsibility |
|------|----------------|
| `GET /status` | Return current TOTP enabled/required state for the authenticated user |
| `POST /setup` | Generate TOTP setup material, QR code data URL, and persist the secret |
| `POST /enable` | Verify a setup code and enable TOTP |
| `POST /disable` | Verify password + TOTP code and disable TOTP |

The parent router mounts this module at:

```text
router.use('/2fa/totp', totpRoutes)
```

So the externally visible paths remain unchanged:

```text
/2fa/totp/status
/2fa/totp/setup
/2fa/totp/enable
/2fa/totp/disable
```

### `authLogin.ts` cleanup

Updated `MuseBar/backend/src/routes/authLogin.ts`:

1. removed the inline TOTP lifecycle route handlers,
2. removed the now-unused TOTP management imports,
3. mounted the extracted router at the same path,
4. preserved login, refresh, session, support impersonation, and logout handlers
   for later Phase 4 slices.

Line-count result:

```text
After Phase 4A: authLogin.ts 963 LOC
After Phase 4B: authLogin.ts 832 LOC
```

### Focused tests

Added `MuseBar/backend/src/routes/authLogin.totpRoutes.test.ts` to cover the
extracted router directly:

1. status response,
2. setup secret persistence and QR generation,
3. enable after valid TOTP code,
4. disable after password and TOTP verification.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npx vitest run src/routes/authLogin.totpRoutes.test.ts`
   - Result: 1 file passed / 4 tests passed
2. `npx vitest run src/routes/authLogin.admin2fa.test.ts src/routes/authLogin.supportImpersonation.test.ts src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.sessions.test.ts`
   - Result: 4 files passed / 21 tests passed
3. `npm run type-check`
   - Result: pass
4. `npm run lint`
   - Result: pass
5. `npm test`
   - Result: 66 files passed / 289 tests passed
6. IDE diagnostics on edited auth files
   - Result: no linter errors

---

## 4) Outcome

Phase 4B safely reduces the auth monolith by moving TOTP lifecycle concerns into
a dedicated route module. The public API contract remains unchanged, direct
coverage now exists for the extracted router, and the backend gate remains green.
