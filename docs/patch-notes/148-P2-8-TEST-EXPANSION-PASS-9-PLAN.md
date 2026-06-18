# 148 - P2-8 (Test Expansion Pass 9) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-level hardening with two remaining contract gaps:

1. Legal archive creation path behavior (validation + scoped payload).
2. Printing configuration input validation (`provider` required) behavior.

This pass targets frequently used operational endpoints where contract drift can produce silent misuse.

## Scope

### In scope

1. Extend `legalArchiveClosure.permissions.test.ts` with:
   - `POST /archive/create` validation failure on missing required fields,
   - `POST /archive/create` allow-path with scoped `ArchiveService.exportData` payload assertions.
2. Extend `printing.routes.test.ts` with:
   - `POST /printing/configuration` missing provider returns `400`,
   - assertion that persistence collaborator is not called.
3. Run targeted tests + backend type-check + touched-file lints.
4. Add implementation patch note.

### Out of scope

- Archive export implementation refactor.
- DB-backed integration/e2e coverage.

## Design choices

- Assert collaborator payload shape instead of brittle exact date equality.
- Keep negative-path tests strict on status code, message, and collaborator non-invocation.

## Step-by-step plan

### Step 1 - Legal archive create regression coverage
- Add validation-fail and allow-path tests with establishment/user scoping assertions.

### Step 2 - Printing configuration validation coverage
- Add missing-provider test to lock existing route guard behavior.

### Step 3 - Verify and document
- Run targeted tests and type-check.
- Run lints for touched files.
- Add implementation note with verification outputs.

## Acceptance criteria

- Archive create route contracts are covered for both invalid and valid inputs.
- Printing config route rejects missing provider and skips persistence call.
- No TypeScript/lint regressions.
