# 154 - P2-8 (Test Expansion Pass 12) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by covering two still-thin behaviors:

1. Legal closure monthly-latest not-found contract when no current-month bulletin exists.
2. Epson poll utility route success/error contracts.

## Scope

### In scope

1. Extend `legalArchiveClosure.permissions.test.ts` with:
   - allow-path for `GET /closure/monthly-latest` returning `404` when no bulletin matches current month,
   - scoped collaborator call assertion (`getClosureBulletins(EST, 'MONTHLY')`).
2. Extend `printing.routes.test.ts` with:
   - `GET /printing/epson/poll` success path contract,
   - `GET /printing/epson/poll` failure path contract (`500`, text response).
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Epson protocol/business logic refactors.
- Deeper integration tests with real printer/network infrastructure.

## Design choices

- Keep tests deterministic via explicit handler mocks.
- Assert user-visible HTTP contract (status/body) and scoped collaborator usage.

## Step-by-step plan

### Step 1 - Legal closure monthly-latest no-data contract
- Add one no-current-month regression test for `404` behavior.

### Step 2 - Epson poll route contracts
- Add success and catch/failure tests for poll route.

### Step 3 - Verify and document
- Run targeted test suite + `npm run type-check`.
- Run lints on touched files.
- Add implementation patch note.

## Acceptance criteria

- New tests pass and lock monthly-latest 404 behavior and Epson poll route contracts.
- No TypeScript/lint regressions.
