# P3-Q15 Plan - Unify Backend Error Stack

## Context

The audit flagged dual error systems in backend code:
- active path: `middleware/errorHandler.ts`
- legacy path: `utils/errors/standardErrorHandler.ts`

Maintaining both creates ambiguity and onboarding risk.

## Goal

Keep `middleware/errorHandler.ts` as the only backend HTTP error stack and remove the legacy standard error handler if it is unused.

## Scope

- Verify whether `utils/errors/standardErrorHandler.ts` and `utils/errors/index.ts` are imported anywhere.
- If unused, delete both files.
- Update audit status for `P3-Q15`.
- Validate backend compilation.

## Strategy

1. Search for imports/usages of `StandardError`, `ErrorTypes`, and `standardErrorHandler`.
2. Remove legacy files only if search confirms zero call sites.
3. Run backend type-check to ensure no unresolved imports.

## Verification Plan

- `rg` search confirms no remaining references.
- `npm run type-check` in backend passes.
