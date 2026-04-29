# 164 - P2-8 (Test Expansion Pass 17) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue C5 route-contract hardening by targeting legal journal entries endpoint behavior, which is compliance-critical and still lightly covered.

## Scope

### In scope

1. Extend `legalPermissionGates.test.ts` with:
   - deny-path for `GET /journal/entries` without `access_compliance`,
   - allow-path for `GET /journal/entries` with scoped query-argument assertions,
   - default pagination contract assertion for entries path.
2. Run targeted tests + backend type-check + touched-file lint diagnostics.
3. Add implementation patch note.

### Out of scope

- Route refactors for journal entries parsing/validation.
- Additional admin-only journal route coverage (`/stats`, `/reset`).

## Design choices

- Focus on permission and scoped collaborator calls (`establishment_id`, limit/offset parsing).
- Keep assertions aligned with current route contract behavior.

## Step-by-step plan

### Step 1 - Add journal entries deny/allow regressions
- Add one deny test and one allow test with query argument assertions.

### Step 2 - Verify and document
- Run targeted backend tests + type-check + lints.
- Add implementation note.

## Acceptance criteria

- New tests pass and lock journal entries permission/scoped query behavior.
- No TypeScript/lint regressions.
