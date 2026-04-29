# 142 - P2-8 (Test Expansion Pass 6) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-level regression hardening by covering two remaining high-value gaps:

1. Printing configuration read path + defensive pagination fallback behavior.
2. Legal monthly-live stats allow-path behavior under `access_compliance`.

## Scope

### In scope

1. Extend `printing.routes.test.ts` with:
   - `GET /printing/configuration` establishment-scoped success path,
   - `GET /printing/history` invalid pagination fallback behavior (`limit`/`offset` defaults).
2. Extend `legalPermissionGates.test.ts` with:
   - allow-path for `GET /stats/monthly-live` with `access_compliance`,
   - assertions for establishment-scoped repository calls and response payload.
3. Run targeted tests + backend type-check + touched-file lint diagnostics.
4. Add implementation patch note.

### Out of scope

- DB-backed integration/e2e tests.
- Route refactors outside test additions.

## Design choices

- Keep assertions focused on tenant-scoped collaborator inputs and external route contracts.
- Use deterministic repository mocks to avoid time-based flakiness.

## Step-by-step plan

### Step 1 - Printing route expansions
- Add configuration read success test and pagination fallback test.

### Step 2 - Legal stats allow-path expansion
- Add positive-path test for monthly-live stats with permission and repository-call assertions.

### Step 3 - Verify and document
- Run targeted test batch and `npm run type-check`.
- Run lints on touched files.
- Add implementation note with verification outputs.

## Acceptance criteria

- New tests pass and protect printing read contracts and legal monthly-live allow path.
- No TypeScript/lint regressions in touched files.
