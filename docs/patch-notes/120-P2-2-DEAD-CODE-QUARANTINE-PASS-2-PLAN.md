# 120 - P2-2 (Dead Code Quarantine Pass 2) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue P2 dead/legacy cleanup with another low-risk slice focused on files that are fully unreferenced and only add duplicate API surfaces.

Pass 2 targets:

1. `MuseBar/backend/src/utils/logger/index.ts`
2. `MuseBar/backend/src/services/receipts/index.ts`

## Scope

### In scope

1. Delete both unreferenced barrel files.
2. Verify no references remain.
3. Run backend type-check and lint diagnostics on touched area.
4. Document the cleanup.

### Out of scope

- Refactoring active logger API in `utils/logger.ts`.
- Receipt service behavior changes.
- Medium-risk legacy removals (full subsystems).

## Design choices

- Prefer deleting dead barrel files over retaining duplicate import surfaces.
- Keep canonical imports unchanged:
  - logger API from `utils/logger.ts`
  - receipt services via direct module imports.

## Step-by-step plan

### Step 1 - Remove dead barrels
- Delete `utils/logger/index.ts`.
- Delete `services/receipts/index.ts`.

### Step 2 - Verify
- Search for any references to deleted barrel paths.
- Run backend `npm run type-check`.
- Run lint diagnostics.

### Step 3 - Document
- Add implementation note with evidence and outcomes.

## Acceptance criteria

- Deleted barrel files have zero remaining references.
- Backend type-check passes.
- No linter issues introduced.
