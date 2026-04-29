# 166 - P2-8 (Test Expansion Pass 18) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by covering two remaining high-value behaviors:

1. Admin-gated legal journal route deny contracts.
2. Printing closure command success contract and history logging assertions.

## Scope

### In scope

1. Extend `legalPermissionGates.test.ts` with:
   - deny-path for `GET /journal/stats` without admin privileges,
   - deny-path for `POST /journal/reset` without admin privileges.
2. Extend `printing.routes.test.ts` with:
   - success-path for `POST /printing/closure/:bulletinId`,
   - assertions for response payload and `logPrintingHistory` metadata.
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Admin-role policy refactors.
- Journal reset behavior in admin-success path.

## Design choices

- Keep assertions focused on visible HTTP contracts and critical collaborator calls.
- Reuse deterministic route mocks and per-test service overrides.

## Step-by-step plan

### Step 1 - Legal admin deny coverage
- Add explicit non-admin deny tests for journal stats/reset endpoints.

### Step 2 - Printing closure success coverage
- Add one closure print success regression with history metadata assertions.

### Step 3 - Verify and document
- Run targeted tests + type-check + lints.
- Add implementation note.

## Acceptance criteria

- New tests pass and lock admin-deny behavior plus closure print success contract.
- No TypeScript/lint regressions.
