# 122 - P2-3 (Dead Code Quarantine Pass 3) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Continue P2 dead/legacy cleanup with the next tier of verified unreferenced backend code:

1. `MuseBar/backend/src/services/SchemaManager.ts`  
   (legacy schema-per-tenant helper, superseded by shared-table multi-tenancy).
2. `MuseBar/backend/src/utils/thermalPrint/*`  
   (legacy thermal-print utility stack not wired into active printing routes/services).

## Scope

### In scope

1. Delete `SchemaManager.ts`.
2. Delete `utils/thermalPrint` module files.
3. Verify no remaining code references.
4. Run backend type-check and lint diagnostics.
5. Document the cleanup.

### Out of scope

- Runtime printing behavior changes in active `services/printing` and `routes/printing`.
- Documentation-wide narrative rewrite for legacy architecture history.

## Design choices

- Remove dead legacy modules once reference scans confirm no active importers.
- Preserve active single-source flows:
  - shared-table/RLS multi-tenancy,
  - current printing service path.

## Step-by-step plan

### Step 1 - Remove legacy dead modules
- Delete `services/SchemaManager.ts`.
- Delete all files under `utils/thermalPrint/`.

### Step 2 - Verify
- Search for `SchemaManager`, `thermalPrint`, and `ThermalPrintService` references in code.
- Run backend `npm run type-check`.
- Run lint diagnostics on backend src scope.

### Step 3 - Document
- Add implementation note with evidence and verification outputs.

## Acceptance criteria

- Legacy modules removed from backend source.
- No remaining code references to deleted modules in active backend code.
- Backend type-check/lint pass.
