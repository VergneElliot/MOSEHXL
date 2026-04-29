# 168 - P2-8 (Test Expansion Pass 19 - Final Sweep) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Run a final C5 sweep for small but meaningful route-contract gaps before closing this audit-driven test expansion lane.

## Scope

### In scope

1. Extend `legalPermissionGates.test.ts` with:
   - `GET /journal/entries` default pagination contract when query params are omitted.
2. Extend `printing.routes.test.ts` with:
   - `GET /printing/configuration` missing establishment context contract (`400`) and collaborator non-call assertion.
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.
5. Provide closeout status for P2-8 test-expansion objective.

### Out of scope

- New production behavior changes.
- Broader integration/e2e test harness work.

## Design choices

- Keep tests strictly route-level and deterministic.
- Focus on contract guarantees that reduce accidental regressions in middleware/parameter handling.

## Step-by-step plan

### Step 1 - Add final regression tests
- Add one legal default-pagination assertion and one printing establishment-guard assertion.

### Step 2 - Verify and document
- Run test suite + type-check + lints.
- Add implementation note and closeout summary.

## Acceptance criteria

- New tests pass and lock final route contracts.
- No TypeScript/lint regressions.
