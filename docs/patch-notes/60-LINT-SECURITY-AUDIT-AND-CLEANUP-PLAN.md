## Goal
Bring the repository to a **clean, low-noise state** by eliminating ESLint warnings, addressing security vulnerabilities where safely possible, and updating packages only when risk is low (patch/minor updates). Major upgrades that require migrations are explicitly deferred.

This document captures:
- The **audit results** (lint, build, security, outdated dependencies)
- A **step-by-step plan** to fix the issues

Date: 2026-04-07

---

## Current status (after execution)

This section reflects the repo state after implementing Phases 1–6.

### Frontend (MuseBar)

#### Lint/build status
- `npm run lint`: **clean**
- `npm run build`: **clean**

#### Security (npm audit)
- After running safe fixes/updates: **26 vulnerabilities remain** (**9 low, 3 moderate, 14 high**).
- These remaining vulnerabilities are still predominantly **`react-scripts` / CRA transitive dependencies**.
- **Deferred**: fully eliminating these without risk likely requires a larger, explicitly scheduled change (e.g. CRA → Vite, or other build tooling migration), which falls under Phase 7 / breaking work.

#### Outdated packages (high-level)
- Patch/minor updates were applied in Phase 6.
- Major upgrades remain deferred (React 19, MUI 7, TypeScript 6, ESLint 10).

---

### Backend (MuseBar/backend)

#### Lint/build status
- `npx eslint src/ ...`: **clean**
- `npm run build`: **clean**

#### Security (npm audit)
- After `npm audit fix` + patch/minor updates: **0 vulnerabilities**.

#### Outdated packages (high-level)
- Patch/minor updates were applied in Phase 6.
- Major upgrades remain deferred (Express 5, TypeScript 6).

---

## What was changed (high-level)

### Frontend
- Addressed the original 19 ESLint warnings (`no-unused-vars`, `react-hooks/exhaustive-deps`).
- Preserved runtime behavior; changes were focused on cleanup and hook dependency correctness.

### Backend
- Removed/typed away large volumes of `any`, aligned Express handler types, and standardized `catch` typing to `unknown` with safe narrowing.
- Replaced `console.*` usage where appropriate and reduced lint noise across routes/services/utils.
- Fixed/standardized logger typing so request logging and performance logging remain type-safe and buildable.
- Hardened printing route typing around `req.user.establishment_id` shape differences (string/null vs number) while keeping runtime behavior.
- Ensured `tsc` builds cleanly after the lint/type tightening work.

---

## Phase-by-phase execution status

### Phase 1 — Frontend lint quick wins (19 warnings)
- **Status**: **Completed**

### Phase 2 — Backend unused vars/imports (113 warnings)
- **Status**: **Completed**

### Phase 3 — Backend `no-console` (93 warnings)
- **Status**: **Completed**

### Phase 4 — Backend `no-explicit-any` (340 warnings)
- **Status**: **Completed**

### Phase 5 — Security vulnerabilities
- **Backend**: **Completed** (audit is clean after `npm audit fix`)
- **Frontend**: **Partially completed**
  - Safe `npm audit fix`/updates applied.
  - Remaining vulnerabilities are CRA/transitive and are deferred to a planned migration (breaking work).

### Phase 6 — Safe package updates (patch/minor only)
- **Status**: **Completed**
  - `npm update` executed in both frontend and backend.
  - Lint/build re-verified afterwards.

### Phase 7 — Deferred majors (breaking upgrades)
- **Status**: **Deferred (unchanged)**
  - React 19, MUI 7, TypeScript 6 (frontend)
  - Express 5, TypeScript 6 (backend)
  - ESLint 10 + config migrations

---

## Audit results

### Frontend (MuseBar)

#### ESLint
- **Total warnings**: 19
- **Breakdown**
  - `@typescript-eslint/no-unused-vars`: 17 warnings across 3 files
  - `react-hooks/exhaustive-deps`: 2 warnings across 2 files

#### Build
- `npm run build` compiles **successfully** with **0 build warnings**.

#### Outdated packages (high-level)
Notable majors available (deferred / breaking):
- React 18 → 19
- MUI 5 → 7
- TypeScript 4.9 → 6
- ESLint 8 → 10

Patch/minor updates exist for several packages and can be applied safely (see plan).

#### Security (npm audit)
- **45 vulnerabilities** (11 low, 8 moderate, 26 high)
- A significant portion is tied to `react-scripts` / CRA transitive deps (e.g. `webpack`, `webpack-dev-server`) and may require a larger migration (e.g. Vite) to fully eliminate.

---

### Backend (MuseBar/backend)

#### ESLint
- **Total warnings**: 546
- **Breakdown**
  - `@typescript-eslint/no-explicit-any`: 340 warnings across 89 files
  - `@typescript-eslint/no-unused-vars`: 113 warnings across 56 files
  - `no-console`: 93 warnings across 19 files

#### Outdated packages (high-level)
Notable majors available (deferred / breaking):
- Express 4 → 5
- TypeScript 5.8 → 6

Patch/minor updates exist for several packages and can be applied safely (see plan).

#### Security (npm audit)
- **8 vulnerabilities** (2 low, 2 moderate, 4 high)
- These are mostly fixable with non-breaking upgrades via `npm audit fix` (e.g. `nodemailer`, `qs`, `path-to-regexp`).

---

## Plan of action

### Phase 1 — Frontend lint quick wins (19 warnings)

#### Step 1.1 — Remove unused imports / unused vars (17 warnings)
Target files:
- `src/components/PrinterSetup/PrinterSetup.tsx` (many unused imports)
- `src/components/EstablishmentAccountCreation/components/AccountCreationForm.tsx` (unused `TextField`)
- `src/utils/testing/mockServices.ts` (unused `call` variable)

#### Step 1.2 — Fix React hook dependency warnings (2 warnings)
Target files:
- `src/components/EstablishmentAccountCreation/steps/InvitationValidationStep.tsx`
- `src/components/common/ErrorBoundary/useErrorHandler.ts`

---

### Phase 2 — Backend unused vars/imports (113 warnings)
- Remove unused imports (especially types)
- Rename intentionally unused parameters to `_param`
- Clean up unused `catch (error)` variables when not used

---

### Phase 3 — Backend `no-console` (93 warnings)
Two-pronged approach:
- Replace `console.*` with the project logger where appropriate (routes/services)
- Keep `console.*` only in CLI/bootstrap contexts and silence ESLint with targeted disables

---

### Phase 4 — Backend `no-explicit-any` (340 warnings)
Prioritize changes that reduce warning count with minimal risk:
- Express handlers: replace `any` with `Request`, `Response`, `NextFunction`
- `catch` blocks: use `unknown` + narrowing instead of `any`
- Logger metadata: use `Record<string, unknown>` or shared metadata type
- DB layers: define row interfaces + use `pg` generics for `QueryResult<T>`

---

### Phase 5 — Security vulnerabilities
- Backend: run `npm audit fix` (expected to be safe and materially reduce risk)
- Frontend: run `npm audit fix` for non-breaking fixes; CRA-related vulns may remain until a larger migration

---

### Phase 6 — Safe package updates (patch/minor only)
- Run `npm update` in frontend + backend to pick up non-breaking updates
- Re-run lint/build after updates

---

### Phase 7 — Deferred majors (breaking upgrades)
Deferred until explicitly scheduled:
- React 19, MUI 7, TypeScript 6 (frontend)
- Express 5, TypeScript 6 (backend)
- ESLint 10 + config migrations
