# 266 - P3-T1 (Restore broken backend test suite) - Plan

Date: 2026-05-20  
Source: discovered while running regression checks for P3-L1; not in the
original 2026-05-20 audit list. To be appended to that audit as **P3-T1**.

## Why this patch exists

While running `npx vitest run` on `development` (clean HEAD) before
landing P3-L1, **10 backend test files / 14 individual tests fail**. They
all fail for one of three drift reasons that accumulated since the patch
trail that delivered the unified `AppError` envelope (P2-Q13), the shared
`@mosehxl/types` workspace (Phase D4 / patches 96-97), and the structured
logger sweep (P2-S15).

Concretely:

1. **`@mosehxl/types` workspace package is unreachable at backend test
   runtime.** The package exists at `MuseBar/packages/types/`, is declared
   under the **root** workspace, and resolves correctly under
   `tsc --noEmit`, but `MuseBar/backend/package.json` never declared it
   as a direct dependency, so a per-package `npm ci` at
   `MuseBar/backend/` (which is how CI installs the backend) does not
   create `node_modules/@mosehxl/types` and Node's runtime resolver
   fails with `Cannot find package '@mosehxl/types' imported from
   .../permissions/registry.ts`. **8 of the 10 failing test files**
   transitively reach `permissions/registry.ts` and crash at import time.

2. **`softwareEventJournal.runtime.test.ts` mocks `../../utils/logger`
   but omits the `logError` named export.** Since `softwareEventJournal.ts`
   now imports `logError` from `../../utils/logger`, the test crashes on
   module init.

3. **AppError envelope drift in two test files.** The unified error
   handler now responds with
   `{ success: false, error: { message, code, statusCode, requestId } }`,
   but `orderPayment.journalFailSafe.test.ts` (4 tests) and
   `printing.routes.test.ts` (6 tests) still assert against the old
   `res.body.error` (string) / `res.text` shape. The test for
   `orderCRUD.journalFailSafe` was already updated under P2-Q13 — these
   two files were missed.

This is not a code regression; it is a test-infra drift. But the practical
effect is the same: **CI is red on `development` regardless of the change
under review**, which makes every future PR ambiguous.

## Scope

### In scope

1. Restore `@mosehxl/types` resolution under per-package `npm ci` by
   declaring it as a `file:../packages/types` dependency in
   `MuseBar/backend/package.json`, and regenerate
   `MuseBar/backend/package-lock.json` accordingly.
2. Update the CI workflow's backend install step to use
   `--workspaces=false --include-workspace-root=false` so the per-package
   `npm ci` does not get intercepted by the root workspace declaration
   (which is what suppressed local installation of `@mosehxl/types` in
   the first place).
3. Add `logError: vi.fn()` to the `vi.mock('../../utils/logger', ...)`
   block in `softwareEventJournal.runtime.test.ts` (no other named
   exports are required by the import-time path).
4. Update assertions in
   `routes/orders/orderPayment.journalFailSafe.test.ts` (4 cases) and
   `routes/printing.routes.test.ts` (6 cases) to read
   `res.body?.error?.message` (the unified envelope) instead of
   `res.body?.error` (string) or `res.text` (HTML stack trace), matching
   the pattern already used in `orderCRUD.journalFailSafe.test.ts`.
5. Append a **P3-T1** entry to
   `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` so the
   discovered task is visible in the audit roadmap.

### Out of scope

- Migration of CI from per-package install to root workspace install
  (would close this whole class of issues but is structurally
  larger — covered separately under the existing P3-Q backlog if we
  decide to pursue it).
- Frontend tests / lockfile cleanup.
- Any non-test code changes.

## Strategy

### Step 1 - Make `@mosehxl/types` install at the backend level

In `MuseBar/backend/package.json`, add to `dependencies`:

```json
"@mosehxl/types": "file:../packages/types"
```

Then in `MuseBar/backend/`, run
`npm install --workspaces=false --include-workspace-root=false
--ignore-scripts`. This:

- Writes a `node_modules/@mosehxl/types/...` directory under
  `MuseBar/backend/node_modules/` (npm copies the file: target rather
  than letting the root workspace claim it).
- Adds a `node_modules/@mosehxl/types` entry with
  `"resolved": "file:../packages/types"` to
  `MuseBar/backend/package-lock.json`.

### Step 2 - Lock CI to the same install model

Update `.github/workflows/ci-cd.yml`:

- `backend-test` job's `Install backend dependencies` step:
  `npm ci --workspaces=false --include-workspace-root=false`
- `build-and-deploy`, `performance-test`, `docs` jobs' backend
  install steps: same flags.

The flags are no-ops on environments without a root workspace, so they
do not regress local devs who run from `MuseBar/backend/` directly.

### Step 3 - Fix the `softwareEventJournal.runtime.test.ts` mock

Add `logError: vi.fn()` (and other named exports if the import surface
expands later) to the existing mock factory. No production-code change.

### Step 4 - Fix AppError envelope assertions

In `routes/orders/orderPayment.journalFailSafe.test.ts` (4 cases) and
`routes/printing.routes.test.ts` (6 cases):

- Replace `String(res.body?.error ?? '')` with
  `String(res.body?.error?.message ?? '')`.
- Replace `res.text` HTML-stack-trace assertions with
  `res.body?.error?.message` where the test was actually looking at
  the public error message.

These follow the same pattern already applied in
`orderCRUD.journalFailSafe.test.ts`.

### Step 5 - Document

Append the following to the 2026-05-20 audit doc under the **P1 — Must-fix**
table (just below P3-Q7):

> **P3-T1** Restore backend test suite (workspace dep + mock + AppError
> envelope drift). Status: in progress this round; details in patch notes
> 266 / 267. Effort: **S**.

## Acceptance criteria

1. `npx vitest run` in `MuseBar/backend/` exits 0 with **0 failing
   files / 0 failing tests** on a clean checkout where the only install
   command run is
   `npm ci --workspaces=false --include-workspace-root=false`.
2. `npm run type-check` still passes.
3. Lint diagnostics on touched files are clean.
4. CI configuration is updated so the same install command is used
   there.
5. The 2026-05-20 audit document records P3-T1.
