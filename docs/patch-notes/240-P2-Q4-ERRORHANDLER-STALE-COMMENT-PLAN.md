# 240 - P2-Q4 (errorHandler stale comment cleanup) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-Q4)

## Why this patch exists

`middleware/errorHandler.ts` header comments still reference historical split
context (`errorHandling.ts`) that no longer exists in the codebase.

This creates documentation drift inside a core middleware file.

## Scope

### In scope

1. Remove stale historical references in `errorHandler.ts` header comments.
2. Keep comments aligned with current architecture only.
3. Verify with backend type-check and lint diagnostics.

### Out of scope

- Runtime error behavior changes.
- Refactoring error class hierarchy or middleware logic.

## Design choices

1. **Minimal no-risk change**
   - Comment-only update in target file.
2. **Present-state wording**
   - Describe current role of the module without naming removed files.

## Strategy

### Step 1 - Comment update

File:
- `MuseBar/backend/src/middleware/errorHandler.ts`

Plan:
1. Rewrite top-level comment to current-state wording.
2. Remove stale duplication note tied to removed file.

### Step 2 - Verify

Run:
- backend type-check,
- lint diagnostics for touched file/docs.

## Acceptance criteria

1. No mention of removed `errorHandling.ts` remains in `errorHandler.ts`.
2. Comment accurately reflects current architecture role.
