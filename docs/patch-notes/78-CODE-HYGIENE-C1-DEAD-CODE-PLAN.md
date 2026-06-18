# 78 - Code Hygiene C1 (Dead Code) - Plan

Date: 2026-04-23  
Phase: C1 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

Phase C1 asks us to remove orphaned modules and compatibility barrels that increase maintenance risk, create confusion for onboarding, and can accidentally re-open insecure or non-tenant-safe flows if mounted later.

This plan follows the same traceability pattern as phases A3/B1/B2/B3/B4:
- plan first,
- implementation second,
- verification notes included.

## Scope for this C1 pass

Target items from the audit C1 list:

1. Delete `printer-bridge/` (orphaned subproject).
2. Delete `services/userInvitationService.ts` barrel and import from `services/userInvitation/` directly.
3. Re-check `services/setup/userAccountOperations.ts` and delete it only if setup flows no longer depend on it.

Already handled before this patch (from prior phases):
- `routes/userManagement/roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts` were removed in B2.
- `models/index.ts` `BusinessSettingsModel` export was removed in B2.
- `services/CorsConfiguration.ts` was already removed in prior cleanup work.
- `MuseBar/backend/src/controllers/` was already an empty/dead directory and is no longer part of runtime.

## Step-by-step execution plan

### Step 1 - Safety mapping before deletion
- Search references to each C1 target.
- Confirm which targets are still imported at compile-time.
- Mark conditional deletion items explicitly.

### Step 2 - Remove unconditional dead code
- Remove `printer-bridge/`.
- Remove `services/userInvitationService.ts` barrel.
- Update all import sites to use `services/userInvitation` directly.

### Step 3 - Conditional dead code decision (`setup/userAccountOperations.ts`)
- Verify whether legacy setup path still imports this file.
- If still used, do not delete in this pass; document exact blockers.
- If not used, remove file and update exports.

### Step 4 - Verification
- Run backend typecheck/build checks.
- Confirm no imports remain to deleted modules.
- Confirm git diff only includes C1-targeted changes + docs updates.

### Step 5 - Documentation
- Create C1 implementation note with:
  - what was deleted,
  - what was intentionally postponed (if any),
  - verification commands and outcomes.

## Acceptance criteria

- No remaining runtime imports of `services/userInvitationService.ts`.
- `printer-bridge/` removed from repository.
- `setup/userAccountOperations.ts` either:
  - removed safely, or
  - retained with a documented reason tied to active setup flow dependency.
- Documentation of record exists for both plan and implementation.
