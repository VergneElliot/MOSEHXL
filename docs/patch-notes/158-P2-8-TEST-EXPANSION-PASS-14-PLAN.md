# 158 - P2-8 (Test Expansion Pass 14) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by covering still-light negative paths:

1. Compliance status/requirements permission-deny contracts.
2. Printing printers route operational failure contract.

## Scope

### In scope

1. Extend `legalPermissionGates.test.ts` with:
   - deny-path for `GET /compliance/status` without `access_compliance`,
   - deny-path for `GET /compliance/requirements` without `access_compliance`.
2. Extend `printing.routes.test.ts` with:
   - `GET /printing/printers` failure path (`500 Failed to list printers`) when service acquisition fails.
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Route logic refactors.
- Integration/e2e infrastructure changes.

## Design choices

- Focus on explicit user-facing HTTP contracts (status + error message).
- Keep tests deterministic via per-test mock overrides.

## Step-by-step plan

### Step 1 - Compliance deny-path tests
- Add deny-path regressions for status and requirements endpoints.

### Step 2 - Printing printers failure test
- Add service-failure path for `/printing/printers`.

### Step 3 - Verify and document
- Run targeted tests, type-check, and lints.
- Add implementation note.

## Acceptance criteria

- New tests pass and protect compliance deny-path and printers failure contracts.
- No TypeScript/lint regressions.
