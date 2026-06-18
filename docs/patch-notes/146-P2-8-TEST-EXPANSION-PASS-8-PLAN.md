# 146 - P2-8 (Test Expansion Pass 8) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 hardening with a mixed regression + route-contract safety pass:

1. Close input-validation gaps on printing POST routes.
2. Extend legal archive route validation coverage.

During prior passes, read routes were covered deeply; this pass targets remaining write/command route parameter contracts.

## Scope

### In scope

1. Update `src/routes/printing.ts`:
   - validate `orderId` for `POST /printing/receipt/:orderId`,
   - validate `bulletinId` for `POST /printing/closure/:bulletinId`,
   - return explicit `400` contract errors for invalid ids.
2. Extend `printing.routes.test.ts`:
   - invalid receipt print id returns `400`,
   - invalid closure print id returns `400`,
   - confirm collaborator calls are skipped on invalid ids.
3. Extend `legalArchiveClosure.permissions.test.ts`:
   - invalid `GET /archive/:id` returns `400` under authorized path,
   - confirm archive lookup collaborator is not called.
4. Run targeted tests + backend type-check + touched-file lints.
5. Add implementation patch note.

### Out of scope

- Full archive export functional implementation.
- End-to-end integration scenarios.

## Design choices

- Keep validation behavior aligned with existing preview/id validation style.
- Add high-signal negative-path assertions to avoid regression of defensive contracts.

## Step-by-step plan

### Step 1 - Route validation hardening
- Add explicit numeric/positive checks for printing POST route ids.

### Step 2 - Regression coverage
- Add tests for invalid ids in printing POST routes and legal archive detail route.

### Step 3 - Verify and document
- Run targeted test suite and type-check.
- Run lints for touched files.
- Add implementation note with outputs and outcome.

## Acceptance criteria

- Invalid id inputs on protected routes return deterministic `400` responses.
- New regression tests pass and ensure invalid-id paths do not call data builders/repos.
- No TypeScript/lint regressions in touched files.
