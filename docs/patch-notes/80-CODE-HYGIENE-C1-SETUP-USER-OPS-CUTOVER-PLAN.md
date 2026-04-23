# 80 - Code Hygiene C1 (Setup User Ops Cutover) - Plan

Date: 2026-04-23  
Phase: C1 follow-up from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this follow-up exists

Patch `79` completed safe C1 deletions but intentionally kept:

- `MuseBar/backend/src/services/setup/userAccountOperations.ts`

because setup flows still depended on it. This follow-up closes that remaining C1 item by migrating the setup flow to the user-account operations module under `establishmentAccountCreation`.

## Scope

1. Add setup-compatible user account helper methods to:
   - `MuseBar/backend/src/services/establishmentAccountCreation/database/UserAccountOperations.ts`
2. Switch setup coordinator import path:
   - `MuseBar/backend/src/services/setup/setupDatabase.ts`
3. Remove legacy file:
   - `MuseBar/backend/src/services/setup/userAccountOperations.ts`
4. Clean setup exports/comments that reference removed file.

## Step-by-step plan

### Step 1 - Extend canonical user-account module
- Add methods required by setup flow:
  - user existence lookup,
  - create-or-update setup user account,
  - credential validation,
  - role update,
  - user + establishment fetch.
- Keep existing establishment-account-creation behavior unchanged.

### Step 2 - Rewire setup coordinator
- Update `setupDatabase.ts` to import `UserAccountOperations` from `establishmentAccountCreation/database`.
- Keep call signatures in setup wizard unchanged to minimize risk.

### Step 3 - Delete legacy setup user operations
- Remove `services/setup/userAccountOperations.ts`.
- Remove any stale exports/imports/comments that still mention this file.

### Step 4 - Verification
- Search for lingering references to `services/setup/userAccountOperations`.
- Run:
  - `npm run type-check`
  - `npm test`

### Step 5 - Documentation
- Add implementation note with exact files changed, compatibility guarantees, and verification results.

## Acceptance criteria

- `services/setup/userAccountOperations.ts` no longer exists.
- Setup flow compiles and tests pass.
- Setup coordinator uses the canonical user-account module from `establishmentAccountCreation`.
- C1 dead-code list item for setup user operations is fully closed.
