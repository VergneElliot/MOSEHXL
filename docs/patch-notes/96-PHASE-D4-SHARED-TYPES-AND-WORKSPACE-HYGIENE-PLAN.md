# 96 - Phase D4 (Shared Types + Workspace Hygiene) - Plan

Date: 2026-04-23  
Phase: D4 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

D4 targets two related maintainability issues:

1. `Order` / `OrderItem` API contracts are duplicated across backend and frontend.
2. Repository root dependency management is informal (root lockfile exists without a root workspace manifest).

This phase reduces type drift risk and formalizes monorepo-level package structure.

## Scope

### In scope

1. Create shared package `@mosehxl/types` in `MuseBar/packages/types`.
2. Move canonical API-level order types there (`Order`, `OrderItem`, `SubBill`, related enums).
3. Wire both backend and frontend TypeScript configs to consume `@mosehxl/types`.
4. Update concrete consumers:
   - backend model interfaces re-export shared types,
   - frontend orders API service uses shared raw/API shapes.
5. Add root `package.json` workspace manifest to formalize repository package structure.

### Out of scope

- Full domain-type rewrite of every frontend component.
- Build/publish pipeline for shared packages to npm registry.
- Refactoring non-order types in this same pass.

## Design choices

- **API contract first**: shared package targets wire/API shapes (snake_case backend payload model), while frontend UI/domain models can keep camelCase adapters.
- **Low-risk integration**: use TypeScript path mapping for immediate local consumption without forcing broad install pipeline changes.
- **Workspace formalization**: add root manifest with workspaces to make root dependency files intentional rather than orphaned.

## Step-by-step plan

### Step 1 - Create shared package
- Add `MuseBar/packages/types/package.json`.
- Add `MuseBar/packages/types/src/index.ts` with shared order contracts.

### Step 2 - Backend adoption
- Replace local order interface declarations in backend interfaces barrel with re-exports from `@mosehxl/types`.

### Step 3 - Frontend adoption
- Replace local raw order interfaces in `src/services/api/orders.ts` with imports from `@mosehxl/types` (aliased to avoid collision with UI models).

### Step 4 - Workspace hygiene
- Add root `package.json` with workspace definitions for `MuseBar`, `MuseBar/backend`, and `MuseBar/packages/*`.
- Add TS path mappings in backend/frontend tsconfig for `@mosehxl/types`.

### Step 5 - Verification and docs
- Run:
  - `npm run type-check` in `MuseBar/backend`
  - `npm test` in `MuseBar/backend`
  - `npm run type-check` in `MuseBar`
- Create D4 implementation note with results and migration impact.

## Acceptance criteria

- Shared `@mosehxl/types` package exists and is consumed by both backend and frontend.
- Backend/frontend type checks pass with shared types.
- Backend tests pass.
- Root workspace manifest is present.
- D4 plan + implementation docs are recorded.
