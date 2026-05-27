# P3-Q13 Backend Plan - Enable `noUncheckedIndexedAccess`

## Context

Frontend strict indexed access was already enabled. Backend remained pending because the initial toggle surfaced broad compile errors where indexed values were assumed to exist.

## Goal

Enable `"noUncheckedIndexedAccess": true` in `backend/tsconfig.json` while keeping backend behavior unchanged and restoring a clean backend type-check.

## Scope

- Enable backend compiler flag in `backend/tsconfig.json`.
- Fix strict indexed access errors in high-impact backend files:
  - route param/query parsing paths
  - setup and validation helpers
  - scheduler/time parsing
  - dashboard metrics aggregation
  - QR parser utilities
  - middleware/logger helper paths
- Verify with backend `npm run type-check`.

## Implementation Strategy

1. Toggle the compiler flag.
2. Resolve route-level `req.params[...]`/`req.query[...]` access using explicit defaults (`?? ''`) and explicit radix in `parseInt(..., 10)`.
3. Resolve array/index access by guarding optional entries before use.
4. Resolve DB result indexing via safe fallbacks (`rows[0] ?? {}` or optional chaining).
5. Re-run type-check and iterate until zero errors.

## Risk Notes

- Main risk is introducing behavior changes while making values explicit.
- Mitigation: keep existing response semantics, only add safe defaults and guards; avoid logic refactors.

## Verification Plan

- Run `npm run type-check` in `MuseBar/backend`.
- Confirm zero TypeScript errors with backend strict indexed access enabled.
