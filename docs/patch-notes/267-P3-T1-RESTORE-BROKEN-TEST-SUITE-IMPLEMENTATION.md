# 267 - P3-T1 (Restore broken backend test suite) - Implementation

Date: 2026-05-20  
Related plan: `docs/patch-notes/266-P3-T1-RESTORE-BROKEN-TEST-SUITE-PLAN.md`

## What changed

### 1. `@mosehxl/types` declared as a backend dependency

Updated:

- `MuseBar/backend/package.json` — added
  `"@mosehxl/types": "file:../packages/types"` to `dependencies` (kept
  alphabetical order at the top of the block).
- `MuseBar/backend/package-lock.json` — regenerated with
  `npm install --workspaces=false --include-workspace-root=false
  --ignore-scripts`. New entry:
  `"node_modules/@mosehxl/types": { "version": "1.0.0", "resolved":
  "file:../packages/types" }`.

This makes the shared types package available under
`MuseBar/backend/node_modules/@mosehxl/types/` so Node's runtime
resolver finds it from `permissions/registry.ts` even when CI installs
only the backend package (which is the current workflow model).

### 2. CI install steps use the workspace-bypass flags

Updated:

- `.github/workflows/ci-cd.yml` — four backend install steps now run
  `npm ci --workspaces=false --include-workspace-root=false`
  (`backend-test`, `build-and-deploy`, `performance-test`, `docs`
  jobs). Frontend install steps are unchanged.

The flags ensure that even when the root `package.json` declares a
workspace, the per-package `npm ci` does not try to use the workspace
mechanism (which previously suppressed local installation of
`@mosehxl/types`).

### 3. Missing `logError` named export in mock

Updated:

- `MuseBar/backend/src/services/legal/softwareEventJournal.runtime.test.ts`
  — `vi.mock('../../utils/logger', …)` now also returns `logError:
  mocks.loggerError`. `softwareEventJournal.ts` imports `logError`
  directly, so module init failed without it.

### 4. AppError envelope drift in two test files

Updated:

- `MuseBar/backend/src/routes/orders/orderPayment.journalFailSafe.test.ts`
  — imported `errorHandler` from `../../middleware/errorHandler`,
  mounted it after the router (`app.use(errorHandler)`), and replaced
  `String(res.body?.error ?? '')` with
  `String(res.body?.error?.message ?? '')` in all four assertions to
  match the unified `{ success: false, error: { message, ... } }`
  envelope. Mirrors the pattern in `orderCRUD.journalFailSafe.test.ts`.
- `MuseBar/backend/src/routes/printing.routes.test.ts` — same:
  `errorHandler` imported and mounted, six assertions updated to read
  `res.body?.error?.message`.

### 5. Restored user-facing AppError labels in `printing.ts`

While fixing assertions in `printing.routes.test.ts`, surfaced that
five `throw new AppError(...)` calls in `MuseBar/backend/src/routes/printing.ts`
were passing the **inner** error message (e.g. `'status probe failed'`)
as the AppError message instead of the **high-level user-facing label**
the route had returned before P2-Q13. This effectively leaked
implementation-detail error messages to clients.

Updated:

- `MuseBar/backend/src/routes/printing.ts` — five throws now pass a
  fixed label as the AppError message; the underlying error is still
  logged via `getLogger().error(...)` so operators retain the detail:
  - `/status` → `'Failed to check printer status'` /
    `PRINTING_STATUS_FAILED`
  - `/printers` → `'Failed to list printers'` /
    `PRINTING_PRINTERS_FAILED`
  - `/test` → `'Test print failed'` / `PRINTING_TEST_FAILED`
  - `/configuration` GET → `'Failed to get printing configuration'` /
    `PRINTING_CONFIG_FETCH_FAILED`
  - `/history` → `'Failed to get printing history'` /
    `PRINTING_HISTORY_FETCH_FAILED`

The remaining `printing.ts` paths (`/receipt/:orderId/preview`,
`/receipt/:orderId`, `/closure/:bulletinId`, `POST /configuration`)
still pass inner messages through; cleaning them up belongs to the
broader **P3-Q8** Pass 3 of the unified error sweep and is out of
scope here.

### 6. Audit roadmap updated

`docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` — appended
the **P3-T1** row to the P1 table and added a short "what landed this
round" note above the "What is already fixed" section.

## Why this resolves P3-T1

Before this patch, `npx vitest run` from a clean checkout on
`development` failed **10 backend test files / 14 individual tests**.
The failures had three distinct root causes (workspace dep,
single-file mock omission, AppError envelope drift in two files) plus
a secondary route-level regression that the existing assertions had
been blocking. Each root cause is now addressed surgically with no
production-code logic changes beyond restoring the previously intended
public error labels in `printing.ts`.

## Regression coverage

The existing test files now cover the restored behavior:

- `orderPayment.journalFailSafe.test.ts` — locks the unified envelope
  for the four payment journal fail-safe paths.
- `printing.routes.test.ts` — locks the unified envelope and the
  user-facing labels for the five `printing.ts` routes.
- `softwareEventJournal.runtime.test.ts` — module init no longer
  crashes on import.
- The other 8 previously failing files now resolve `@mosehxl/types`
  at runtime and pass their existing assertions unchanged.

## Verification

Executed:

1. `npm run type-check` → pass.
2. `npx vitest run` (full backend suite) → **44 / 44 files pass, 172 /
   172 tests pass, 0 failures**.
3. `npx vitest run src/utils/closureScheduler.test.ts` (P3-L1
   regression) → still 4 / 4 pass.
4. Lint diagnostics on touched files → no issues.
5. CI workflow validated by reading the diff — only `npm ci` install
   step flags were added; no job structure changes.

## Result

The backend test suite is now green on `development`. CI is configured
to install backend dependencies using the workspace-bypass flags so the
green state holds in CI. The P2-Q13-era regression that leaked inner
error messages to clients on five `printing.ts` routes is closed. The
audit roadmap is updated to reflect the discovered task.
