# 144 - P2-8 (Test Expansion Pass 7) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 regression hardening by covering additional legal archive and printing route contracts that remain lightly tested:

1. Legal archive detail route tenant-scoped allow/not-found behavior.
2. Printing receipt preview input validation contract.

## Scope

### In scope

1. Extend `legalArchiveClosure.permissions.test.ts` with:
   - allow-path for `GET /archive/:id` under `access_closure`,
   - not-found contract for `GET /archive/:id` with permission (404 when archive missing),
   - scoped collaborator assertions on `ArchiveService.getArchiveExportById`.
2. Extend `printing.routes.test.ts` with:
   - input-validation test for invalid preview order id (`GET /printing/receipt/:orderId/preview` => 400).
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Full integration/e2e archive export tests.
- Runtime route refactors.

## Design choices

- Keep tests route-level and deterministic with strict collaborator assertions.
- Prioritize behavior that protects legal-data retrieval contracts and defensive input handling.

## Step-by-step plan

### Step 1 - Archive detail route coverage
- Add allow/not-found tests for archive detail route with tenant scope assertions.

### Step 2 - Printing preview validation
- Add invalid order id test ensuring 400 response and no data build call.

### Step 3 - Verify and document
- Run targeted tests and `npm run type-check`.
- Run lints on touched files.
- Add implementation note with results.

## Acceptance criteria

- New tests pass and lock archive detail + printing preview validation contracts.
- No TypeScript/lint regressions in touched files.
