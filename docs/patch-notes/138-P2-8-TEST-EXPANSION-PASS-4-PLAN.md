# 138 - P2-8 (Test Expansion Pass 4) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 test hardening on fiscal and tenant-sensitive paths by extending:

1. Printing receipt preview route behavior (tenant scoping + 404 mapping).
2. Legal closure monthly report route allow-path behavior under `access_closure`.

This pass deepens route-level confidence on read/reporting paths that are central to operations and compliance checks.

## Scope

### In scope

1. Extend `printing.routes.test.ts` with:
   - `/printing/receipt/:orderId/preview` success assertion (establishment-scoped call path),
   - `/printing/receipt/:orderId/preview` not-found mapping (`statusCode: 404` => HTTP 404).
2. Extend `legalArchiveClosure.permissions.test.ts` with:
   - allow-path for `/closure/monthly-latest`,
   - establishment-scoped monthly bulletin fetch assertion.
3. Run targeted tests, backend type-check, and lints on touched files.
4. Add implementation patch note.

### Out of scope

- Full DB-backed integration tests.
- Route refactors unrelated to test coverage expansion.

## Design choices

- Keep mocks deterministic and assert collaborator inputs (especially establishment id).
- Cover one happy path and one not-found error contract on printing preview.
- Cover closure monthly report allow-path to complement existing closure bulletins tests.

## Step-by-step plan

### Step 1 - Printing preview route tests
- Add route-level tests for success and 404 behavior with scoped `buildReceiptDataForOrder` assertions.

### Step 2 - Legal closure monthly-latest allow path
- Add allow-path test for `GET /closure/monthly-latest` with `access_closure` and current-month bulletin payload.

### Step 3 - Verify and document
- Run targeted tests + `npm run type-check`.
- Run lint diagnostics for touched tests.
- Add implementation note with verification output.

## Acceptance criteria

- New tests pass and lock expected route contracts for printing preview and closure monthly report path.
- No TypeScript/lint regressions in touched files.
