# 160 - P2-8 (Test Expansion Pass 15) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by closing a few remaining negative-path gaps:

1. Legal archive export deny-path when `access_closure` is missing.
2. Printing status and configuration-read failure contracts.

## Scope

### In scope

1. Extend `legalArchiveClosure.permissions.test.ts` with:
   - `POST /archive/:id/export` deny-path without `access_closure` (`403`).
2. Extend `printing.routes.test.ts` with:
   - `GET /printing/status` failure contract (`500 Failed to check printer status`),
   - `GET /printing/configuration` failure contract (`500 Failed to get printing configuration`).
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Route logic refactors.
- End-to-end test infrastructure.

## Design choices

- Keep focus on externally visible HTTP behavior and error messaging.
- Use deterministic mock overrides for failure simulation.

## Step-by-step plan

### Step 1 - Legal export deny path
- Add explicit permission-deny regression for archive export endpoint.

### Step 2 - Printing read/fetch failure paths
- Add status and configuration failure-path route tests.

### Step 3 - Verify and document
- Run targeted tests + type-check + lints.
- Add implementation note with results.

## Acceptance criteria

- New tests pass and lock expected deny/failure contracts.
- No TypeScript/lint regressions.
