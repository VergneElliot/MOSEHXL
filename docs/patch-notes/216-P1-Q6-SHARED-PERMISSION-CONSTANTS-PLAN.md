# 216 - P1-Q6 (Shared permission constants backend/frontend) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-Q6)

## Why this patch exists

Audit P1-Q6 flagged a single-source-of-truth drift:

- backend used centralized permission constants in `permissions/registry.ts`,
- frontend `AppRouter.tsx` hard-coded the same permission strings as literals.

This duplication increases drift risk and weakens refactor safety.

## Scope

### In scope

1. Define one shared permission constant set in `@mosehxl/types`.
2. Consume shared constants in backend permission registry.
3. Consume shared constants in frontend `AppRouter`.
4. Keep runtime behavior unchanged.
5. Document implementation and verification.

### Out of scope

- Reworking broader role/permission architecture (handled by Q7).
- Replacing every permission literal in the entire frontend codebase (this item
  targets audit-called `AppRouter` drift first).

## Design choices

1. **Runtime + type-safe shared package export**
   - Add `PERMISSIONS` to `@mosehxl/types` declarations and runtime entrypoint.
   - Export `PermissionName` from shared package for typed tab config fields.

2. **Backend registry as thin alias**
   - `backend/src/permissions/registry.ts` re-exports shared constants as `P` to
     preserve existing call sites (`requirePermission(P.access_pos)`, etc.).

3. **Frontend uses shared constants directly**
   - Replace hard-coded literals in `AppRouter.tsx` with `PERMISSIONS.*`.

## Strategy

### Step 1 - Shared package constants

Files:
- `MuseBar/packages/types/index.d.ts`
- `MuseBar/packages/types/src/index.ts`
- `MuseBar/packages/types/index.js` (new runtime file)
- `MuseBar/packages/types/package.json`

Plan:
1. Add `PERMISSIONS` and `PermissionName`.
2. Ensure runtime import works by exposing `index.js` as package `main`.

### Step 2 - Backend alignment

File:
- `MuseBar/backend/src/permissions/registry.ts`

Plan:
- Use shared `PERMISSIONS` as backend `P` export.

### Step 3 - Frontend alignment

File:
- `MuseBar/src/components/common/AppRouter.tsx`

Plan:
1. Import shared `PERMISSIONS` and `PermissionName`.
2. Replace permission literals in tab config and permission checks.

### Step 4 - Verify

Run:
- backend type-check,
- frontend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. Backend and frontend both reference one shared permission constant source.
2. `AppRouter` no longer contains duplicated permission string literals for the
   audited checks.
3. Type-check and lint pass in both backend and frontend workspaces.
