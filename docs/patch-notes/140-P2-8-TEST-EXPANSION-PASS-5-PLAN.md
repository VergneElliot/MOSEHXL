# 140 - P2-8 (Test Expansion Pass 5) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 test hardening on fiscal/tenant-sensitive route behavior by covering:

1. Printing print-route not-found contracts for receipt and closure bulletin paths.
2. Legal closure status allow-path behavior, including response sanitization used by UI/compliance surfaces.

## Scope

### In scope

1. Extend `printing.routes.test.ts` with:
   - `POST /printing/receipt/:orderId` 404 mapping,
   - `POST /printing/closure/:bulletinId` 404 mapping.
2. Extend `legalArchiveClosure.permissions.test.ts` with:
   - allow-path for `GET /closure/today-status`,
   - assertion that response strips `total_transactions` from returned bulletin payload.
3. Run targeted tests + backend type-check + touched-file lint diagnostics.
4. Add implementation patch note.

### Out of scope

- Full integration/e2e test wiring.
- Runtime route refactors.

## Design choices

- Focus on high-risk route contracts where regressions would impact UX and compliance reporting confidence.
- Keep tests deterministic with strict collaborator and response assertions.

## Step-by-step plan

### Step 1 - Printing route error contract coverage
- Add explicit 404 mapping tests for receipt and closure print routes when underlying data builders raise `statusCode: 404`.

### Step 2 - Legal closure status allow-path
- Add allow-path for `today-status` under `access_closure`, including `last_fond_de_caisse` passthrough and redaction of `total_transactions` from bulletin response.

### Step 3 - Verify and document
- Run targeted tests and type-check.
- Run lint diagnostics on touched files.
- Add implementation note with outcomes.

## Acceptance criteria

- New tests pass and lock expected not-found/response-shaping contracts.
- No TypeScript or lint regressions in touched files.
