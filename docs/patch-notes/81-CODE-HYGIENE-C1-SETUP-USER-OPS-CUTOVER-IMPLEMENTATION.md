# 81 - Code Hygiene C1 (Setup User Ops Cutover) - Implementation

Date: 2026-04-23  
Status: **Implemented**  
Plan reference: `docs/patch-notes/80-CODE-HYGIENE-C1-SETUP-USER-OPS-CUTOVER-PLAN.md`.

## 1) Problem closed

`services/setup/userAccountOperations.ts` was the last conditional dead-code item from C1.

It remained only because setup wizard logic still called it through `setupDatabase.ts`.  
This patch removes that dependency by moving setup-required user operations to the canonical user-account module in `establishmentAccountCreation/database`.

## 2) What changed

### 2.1 Canonical user-account module now covers setup needs

Updated:

- `MuseBar/backend/src/services/establishmentAccountCreation/database/UserAccountOperations.ts`

Added setup-compatible methods:

- `checkUserExists(...)`
- `createOrUpdateUserAccount(...)`
- `validateUserCredentials(...)`
- `updateUserRole(...)`
- `getUserWithEstablishment(...)`

Also added a small setup input interface (`SetupUserAccountInput`) and reused `UserQueries` shared DB helpers for consistent lookup behavior.

### 2.2 Setup coordinator rewired to canonical module

Updated:

- `MuseBar/backend/src/services/setup/setupDatabase.ts`

Change:

- Import switched from `./userAccountOperations` to `../establishmentAccountCreation/database/UserAccountOperations`.
- Header comment updated to reflect canonical source.

### 2.3 Legacy setup file removed

Deleted:

- `MuseBar/backend/src/services/setup/userAccountOperations.ts`

Cleaned export surface:

- Removed stale export from `MuseBar/backend/src/services/setup/index.ts`.

## 3) Verification

Reference check:

- No remaining source references to `setup/userAccountOperations` ✅

Executed in `MuseBar/backend`:

- `npm run type-check` ✅
- `npm test` ✅ (`6` files, `17` tests)

IDE lint diagnostics on touched files:

- No linter errors ✅

## 4) C1 status

With this patch, the previously deferred C1 item is now closed:

- `services/setup/userAccountOperations.ts` removed after safe cutover.
