# 156 - P2-8 (Test Expansion Pass 13) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by covering remaining validation/error contracts:

1. Legal compliance report input-validation paths.
2. Printing history operational failure path.

## Scope

### In scope

1. Extend `legalPermissionGates.test.ts` with:
   - `GET /compliance/report` missing-date validation (`400`),
   - `GET /compliance/report` invalid-date validation (`400`).
2. Extend `printing.routes.test.ts` with:
   - `GET /printing/history` database failure contract (`500`).
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Route refactors or behavior changes beyond test coverage.
- End-to-end/integration infrastructure.

## Design choices

- Assert external API contracts (status + error message) and collaborator behavior.
- Use deterministic mock overrides in each test.

## Step-by-step plan

### Step 1 - Legal report validation tests
- Add missing/invalid date negative-path tests for compliance report route.

### Step 2 - Printing history failure test
- Add a pool error regression test to lock `500 Failed to get printing history` contract.

### Step 3 - Verify and document
- Run targeted tests + type-check + lints.
- Add implementation patch note.

## Acceptance criteria

- New tests pass and protect compliance report validation and printing history error behavior.
- No TypeScript/lint regressions.
