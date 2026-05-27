# 336 — P3-Q11 remove setup/email shims plan

## Objective

Remove legacy shim/wrapper service files and keep a single canonical entrypoint per domain to reduce ambiguity and maintenance risk.

## Scope

### In scope

- Remove setup shim files:
  - `backend/src/services/SetupService.ts`
  - `backend/src/services/setup/setupWizard.ts`
- Remove email template wrapper:
  - `backend/src/services/email/EmailTemplateManager.ts`
- Update all imports/exports to canonical paths:
  - `services/setup/SetupService`
  - `services/setup/wizard/SetupWizard`
  - `services/email/templates/EmailTemplateManager`
- Run backend type-check + full tests.

### Out of scope

- Functional changes to setup/email behavior.
- API contract changes for routes using setup/email services.

## Design decisions

1. Keep canonical implementations in their focused module locations (setup wizard package and email templates package).
2. Update module barrel exports to point to canonical files.
3. Remove compatibility wrappers once no runtime imports depend on them.

## Verification plan

- `npm run type-check`
- `npm run test`
