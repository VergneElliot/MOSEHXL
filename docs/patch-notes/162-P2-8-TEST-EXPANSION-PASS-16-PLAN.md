# 162 - P2-8 (Test Expansion Pass 16) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by closing two practical coverage gaps:

1. Missing deny-path assertions on legal archive detail/create endpoints.
2. Missing success-path assertion on printing receipt command route.

## Scope

### In scope

1. Extend `legalArchiveClosure.permissions.test.ts` with:
   - `GET /archive/:id` deny-path without `access_closure`,
   - `POST /archive/create` deny-path without `access_closure`.
2. Extend `printing.routes.test.ts` with:
   - success-path for `POST /printing/receipt/:orderId`,
   - assertions for receipt payload and logging call contract.
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Route/controller refactors.
- DB/integration wiring changes.

## Design choices

- Keep tests deterministic via local mock overrides.
- Assert both output contract and critical collaborator invocations.

## Step-by-step plan

### Step 1 - Legal archive deny paths
- Add explicit 403 regressions for archive detail and create when permission is missing.

### Step 2 - Printing receipt success path
- Add one command-route happy-path regression for receipt printing and history logging.

### Step 3 - Verify and document
- Run test batch + type-check + lints.
- Add implementation note.

## Acceptance criteria

- New tests pass and protect archive permission denials plus receipt print success contract.
- No TypeScript/lint regressions.
