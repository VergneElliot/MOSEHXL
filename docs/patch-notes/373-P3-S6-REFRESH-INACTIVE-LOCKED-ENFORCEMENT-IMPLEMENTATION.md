# 373 - P3-S6 (refresh inactive/locked enforcement follow-up) - Implementation

Plan reference: `docs/patch-notes/372-P3-S6-REFRESH-INACTIVE-LOCKED-ENFORCEMENT-PLAN.md`

## What changed

### 1) Added account-state gates to refresh route

Updated `MuseBar/backend/src/routes/authLogin.ts` (`POST /auth/refresh`):

- After loading `userRow`, refresh now enforces:
  - `userRow.is_active !== false`
  - `userRow.locked_until` not in future

If either check fails, route now:

- revokes all refresh tokens for the user via `RefreshTokenModel.revokeAllForUser(...)`,
- clears refresh + CSRF cookies,
- writes fail-safe audit entry (`TOKEN_REFRESH_BLOCKED`) with reason metadata,
- returns authorization error:
  - `Account is inactive` (inactive user),
  - `Account is locked` (active lockout window).

### 2) Added refresh-path regression tests

Updated `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`:

- Added inactive-user test:
  - expects 403,
  - expects `revokeAllForUser(..., 'USER_INACTIVE_REFRESH_BLOCK')`.
- Added locked-user test:
  - expects 403,
  - expects `revokeAllForUser(..., 'ACCOUNT_LOCKED_REFRESH_BLOCK')`.

Also updated test mocks to include `revokeAllForUser`.

## Verification run

- `npm test -- src/routes/authLogin.refreshRotation.test.ts` -> pass (9 tests)
- `npm run type-check` (backend) -> pass

## Security outcome

Account deactivation and lockout state are now enforced consistently on both login and refresh flows, preventing continued session extension after account security state changes.
