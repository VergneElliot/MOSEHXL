# 136 - P2-8 (Test Expansion Pass 3) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 hardening by adding deeper route-level assertions on:

1. Printing history tenant scoping behavior.
2. Legal closure route allow-path behavior under correct permission.

This extends prior passes from basic gates/happy paths to stronger data-scope expectations.

## Scope

### In scope

1. Extend `printing.routes.test.ts` to validate:
   - tenant-scoped SQL arguments for `/printing/history`,
   - bounded pagination behavior (`limit`, `offset`) and response shape.
2. Extend `legalArchiveClosure.permissions.test.ts` with allow-path for `/closure/bulletins` under `access_closure`.
3. Run targeted tests + backend type-check + lint diagnostics.
4. Add implementation patch note.

### Out of scope

- Full DB-backed integration tests.
- Additional route refactors.

## Design choices

- Keep deterministic mocks and assert collaborator calls precisely.
- Focus on high-signal assertions that protect tenant isolation behavior.

## Step-by-step plan

### Step 1 - Printing history test depth
- Add history route test with mocked DB rows/count and argument assertions for establishment + pagination.

### Step 2 - Legal closure allow-path
- Add allow-path assertion ensuring closure bulletins are fetched for caller establishment when permission is granted.

### Step 3 - Verify and document
- Run targeted suite, type-check, lint diagnostics.
- Add implementation note with test outputs.

## Acceptance criteria

- New tests pass and lock tenant-scope expectations for printing history and legal closure route.
- Backend type-check/lint remain green.
