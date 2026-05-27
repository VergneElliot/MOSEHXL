# 337 — P3-Q11 remove setup/email shims implementation

## What changed

### 1) Removed legacy setup and email shim files

Deleted:

- `MuseBar/backend/src/services/SetupService.ts`
- `MuseBar/backend/src/services/setup/setupWizard.ts`
- `MuseBar/backend/src/services/email/EmailTemplateManager.ts`

These files were compatibility wrappers around canonical implementations and introduced duplicate entrypoints.

### 2) Switched imports/exports to canonical module paths

Updated:

- `MuseBar/backend/src/routes/setup.ts`
  - import now targets `services/setup/SetupService`
- `MuseBar/backend/src/services/setup/SetupService.ts`
  - `SetupWizard` import now targets `./wizard/SetupWizard`
- `MuseBar/backend/src/services/setup/index.ts`
  - `SetupWizard` export now targets `./wizard/SetupWizard`
- `MuseBar/backend/src/services/email/EmailService.ts`
  - imports `EmailTemplateManager` from `./templates/EmailTemplateManager`
  - imports `EmailTemplate` type from `./templates/types`
- `MuseBar/backend/src/services/email/index.ts`
  - exports template manager/type from canonical templates module paths

### 3) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Change:

- Marked `P3-Q11` as fixed and documented canonical paths.

## Verification

- `npm run type-check` ✅
- `npm run test` ✅

## Notes

- This change is structural only: it removes duplicated module entrypoints without altering setup/email runtime behavior.
