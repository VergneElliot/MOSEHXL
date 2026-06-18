# 150 - P2-8 (Test Expansion Pass 10) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-level hardening by covering remaining untested route contracts in the same legal + printing surfaces:

1. Legal archive export route contracts.
2. Printing utility routes (`/printers`, `/test`) contracts.

## Scope

### In scope

1. Extend `legalArchiveClosure.permissions.test.ts` with:
   - invalid id validation for `POST /archive/:id/export` (`400`),
   - success path for `POST /archive/:id/export` asserting route payload contract.
2. Extend `printing.routes.test.ts` with:
   - `GET /printing/printers` success path,
   - `POST /printing/test` success path using mocked test receipt data + print result.
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Archive export implementation redesign.
- End-to-end printing service integration tests.

## Design choices

- Assert response contract and scoped manager/service interactions.
- Keep tests deterministic via explicit per-test service mock overrides.

## Step-by-step plan

### Step 1 - Legal archive export coverage
- Add invalid-id and success route tests for export endpoint.

### Step 2 - Printing route coverage expansion
- Add happy-path tests for printers listing and test print queue path.

### Step 3 - Verify and document
- Run targeted tests + type-check + lints.
- Add implementation note.

## Acceptance criteria

- New tests pass and protect legal archive export and printing utility route contracts.
- No TypeScript/lint regressions.
