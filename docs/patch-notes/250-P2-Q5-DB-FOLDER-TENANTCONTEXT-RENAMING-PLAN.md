# 250 - P2-Q5 (`db` folder naming cleanup) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (Q5)

## Why this patch exists

`backend/src/db/` currently contains only `tenantContext.ts`.

That module is not a generic database layer: it provides request-scoped tenant
context (`AsyncLocalStorage`) used for RLS-aware behavior.

The folder name `db` suggests broader data-access ownership and creates
architecture noise.

## Scope

### In scope

1. Move tenant-context module to a clearer namespace (`src/rls/tenantContext.ts`).
2. Update all imports.
3. Remove obsolete `src/db/tenantContext.ts`.

### Out of scope

- Pool extraction (`Q10`) and route/app db wiring changes.
- Any runtime behavior changes to tenant context logic.

## Design choice

Use `src/rls/tenantContext.ts` as the canonical location:

1. communicates intent directly ("RLS context"), and
2. avoids overloading `db` as a pseudo data-access layer.

## Strategy

### Step 1 - Move module

Create `src/rls/tenantContext.ts` with identical implementation.

### Step 2 - Update imports

Update all references:
1. `backend/src/app.ts`
2. `backend/src/middleware/auth.ts`
3. `backend/src/utils/closureScheduler.ts`

### Step 3 - Remove obsolete path

Delete `backend/src/db/tenantContext.ts`.

### Step 4 - Verify

Run backend type-check and targeted tests/lints.

## Acceptance criteria

1. No import points to `src/db/tenantContext.ts`.
2. Tenant context behavior is unchanged.
3. `Q5` folder-intent ambiguity is resolved.
