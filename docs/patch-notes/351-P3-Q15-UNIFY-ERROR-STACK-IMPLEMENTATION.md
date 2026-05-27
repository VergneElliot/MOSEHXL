# P3-Q15 Implementation - Unify Backend Error Stack

## What changed

Removed the unused legacy backend error stack and kept the unified middleware-based stack as the single source of truth.

## Files removed

- `MuseBar/backend/src/utils/errors/standardErrorHandler.ts`
- `MuseBar/backend/src/utils/errors/index.ts`

## Why this is safe

- Repository-wide search found no imports/usages of:
  - `standardErrorHandler`
  - `StandardError`
  - `ErrorTypes`
  - `utils/errors`
- Active route and middleware code already uses:
  - `AppError` subclasses
  - `asyncHandler`
  - global error middleware from `middleware/errorHandler.ts`

## Audit update

- Updated `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`
  - `P3-Q15` moved to **Fixed (2026-05-27)**.

## Verification

- `rg` reference scan: **no matches** for legacy error stack symbols.
- `npm run type-check` (backend): **PASS**

## Result

Backend now has one canonical error stack (`middleware/errorHandler.ts`), removing historical dual-stack confusion.
