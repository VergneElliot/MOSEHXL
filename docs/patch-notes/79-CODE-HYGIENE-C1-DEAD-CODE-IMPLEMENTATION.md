# 79 - Code Hygiene C1 (Dead Code) - Implementation

Date: 2026-04-23  
Status: **Partially implemented (safe deletions completed; one conditional item intentionally deferred).**  
Plan reference: `docs/patch-notes/78-CODE-HYGIENE-C1-DEAD-CODE-PLAN.md`.

## 1) What was removed

### 1.1 Orphan bridge directory

- Removed `printer-bridge/` from repository.
- This directory only contained an orphan lockfile + vendor dependencies and had no active integration path in backend/frontend runtime.

### 1.2 Legacy invitation barrel

- Deleted `MuseBar/backend/src/services/userInvitationService.ts`.
- Updated imports to the direct directory module (`services/userInvitation`) in:
  - `MuseBar/backend/src/routes/userManagement/index.ts`
  - `MuseBar/backend/src/routes/userManagement/invitationRoutes.ts`
  - `MuseBar/backend/src/routes/userManagement/types.ts`

This removes one unnecessary indirection and keeps call sites aligned with the actual modular implementation.

## 2) Conditional item intentionally deferred

Audit C1 includes:

- `services/setup/userAccountOperations.ts` (delete once `establishmentAccountCreation` is the sole path).

Current status after reference audit:

- `services/setup/setupDatabase.ts` still imports and uses `./userAccountOperations`.
- `services/setup/index.ts` still exports `UserAccountOperations`.
- Setup flow is still exposed via `routes/setup.ts` -> `SetupService`.

Decision for this C1 pass:

- **Do not delete** `services/setup/userAccountOperations.ts` yet.
- Deleting it now would break the active setup wizard path.
- Proper deletion requires routing setup user creation fully to `services/establishmentAccountCreation/database/UserAccountOperations.ts` (or fully retiring setup wizard flow first).

## 3) Verification

Executed in `MuseBar/backend`:

- `npm run type-check` ✅
- `npm test` ✅ (`6` files, `17` tests)

Additional check:

- No remaining imports of `services/userInvitationService` in backend source.

## 4) C1 status after this patch

Completed in this pass:

- `printer-bridge/` removed.
- `services/userInvitationService.ts` barrel removed.

Previously completed (earlier phases):

- `routes/userManagement/roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts` removed.
- `models/index.ts` `BusinessSettingsModel` removed.

Still open under C1:

- `services/setup/userAccountOperations.ts` removal (blocked by live setup flow dependency).
