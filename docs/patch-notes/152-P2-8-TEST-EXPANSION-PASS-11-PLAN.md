# 152 - P2-8 (Test Expansion Pass 11) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by closing remaining quick-win gaps:

1. Legal compliance status/requirements positive-path coverage.
2. Printing test-route error contract coverage.

## Scope

### In scope

1. Extend `legalPermissionGates.test.ts` with:
   - allow-path for `GET /compliance/status` (with scoped model-call assertions),
   - allow-path for `GET /compliance/requirements`.
2. Extend `printing.routes.test.ts` with:
   - `POST /printing/test` failure path (`500 Test print failed`) when service/print fails.
3. Run targeted tests + backend type-check + touched-file lint diagnostics.
4. Add implementation patch note.

### Out of scope

- Compliance-route business logic refactors.
- Integration/e2e infrastructure.

## Design choices

- Keep assertions focused on route contracts and collaborator call scope.
- Reuse deterministic mocks; override only where needed per test.

## Step-by-step plan

### Step 1 - Legal compliance route expansion
- Add positive-path tests for compliance status and requirements.

### Step 2 - Printing error contract coverage
- Add one failure-path regression for test-print endpoint.

### Step 3 - Verify and document
- Run targeted tests, type-check, and lints.
- Add implementation patch note with outcomes.

## Acceptance criteria

- New tests pass and lock compliance status/requirements and test-print failure contracts.
- No TypeScript/lint regressions in touched files.
