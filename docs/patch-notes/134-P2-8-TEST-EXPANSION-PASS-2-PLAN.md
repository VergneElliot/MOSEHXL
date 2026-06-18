# 134 - P2-8 (Test Expansion Pass 2) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 test expansion with route-level regression coverage on two high-value areas:

1. Printing API critical route behavior.
2. Legal compliance report positive-path integration behavior.

## Scope

### In scope

1. Add route tests for `routes/printing.ts` covering:
   - establishment-context enforcement,
   - status happy path,
   - configuration update success and invalid-provider rejection.
2. Extend legal permission test suite with a positive-path compliance report case:
   - permission granted,
   - valid date range accepted,
   - expected model calls executed.
3. Run targeted tests + backend type-check + lint diagnostics.
4. Document implementation.

### Out of scope

- Full printing E2E with real print adapters.
- Full legal closure/reporting E2E across DB.

## Design choices

- Use deterministic module mocks for route dependencies.
- Assert behavior at HTTP layer + key collaborator call points.
- Keep tests fast and CI-friendly.

## Step-by-step plan

### Step 1 - Printing route tests
- Add `printing.routes.test.ts` with auth-context and configuration-flow assertions.

### Step 2 - Legal report positive-path test
- Add one explicit allow-path test to `legalPermissionGates.test.ts`.

### Step 3 - Verify + document
- Run targeted vitest files and `npm run type-check`.
- Add implementation patch note with evidence.

## Acceptance criteria

- New tests pass and guard route behavior that matters for operational safety.
- Backend type-check/lint remain green.
