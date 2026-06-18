# 307 — P3-Q6 wrap invitation/account-creation routes in `asyncHandler` (implementation)

## What changed

### 1) Invitation routes migrated to `asyncHandler`

Updated:

- `MuseBar/backend/src/routes/userManagement/invitationRoutes.ts`

Changes:

- Imported `asyncHandler` from unified error middleware.
- Wrapped all async route handlers in `asyncHandler(...)`.
- Replaced `next(error)` with `throw error` inside existing `try/catch` logging blocks.
- Removed `NextFunction` type import from signatures where no longer needed.

### 2) Establishment account creation routes migrated to `asyncHandler`

Updated:

- `MuseBar/backend/src/routes/establishmentAccountCreation/index.ts`

Changes:

- Imported `asyncHandler`.
- Wrapped `/complete`, `/health`, and `/validate/:token` handlers with `asyncHandler`.
- Replaced `next(error)` with `throw error` in catch blocks.
- Removed unused `NextFunction` import.

## Behavioral impact

- No route contract changes.
- Existing explicit success/validation response bodies remain unchanged.
- Error propagation now follows the standardized `asyncHandler` path for these modules.

## Verification

- Backend type-check: `npm run type-check` ✅
- Full backend suite: `npm test` (`51/51` files, `202/202` tests) ✅

## Notes

- This closes `P3-Q6` from the 2026-05-20 audit sequence.
