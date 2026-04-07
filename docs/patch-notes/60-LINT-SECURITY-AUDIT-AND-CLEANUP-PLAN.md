## Goal
Bring the repository to a **clean, low-noise state** by eliminating ESLint warnings, addressing security vulnerabilities where safely possible, and updating packages only when risk is low (patch/minor updates). Major upgrades that require migrations are explicitly deferred.

This document captures:
- The **audit results** (lint, build, security, outdated dependencies)
- A **step-by-step plan** to fix the issues

Date: 2026-04-07

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
