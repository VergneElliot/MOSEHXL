# 415 - Cleanup Phase 3: bridge TypeScript and CI - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

The 2026-06-24 cleanup roadmap identified the print bridge as a quality-gate gap:

1. it was plain JavaScript while the main application is TypeScript,
2. it was not part of the root npm workspace list,
3. it was not checked by CI,
4. its tests exercised `src/` directly rather than the runnable build artifact.

Phase 3 brings the bridge into the same engineering standard as the rest of the
project without changing the bridge polling/printing behavior.

---

## 2) What changed

### Workspace integration

Updated root package metadata:

1. added `MuseBar/bridge` to root `workspaces`,
2. added `build:bridge`,
3. included the bridge in the root `build` script,
4. refreshed `package-lock.json` for the bridge workspace and dev tooling.

### Bridge TypeScript conversion

Converted bridge source files:

| Old file | New file |
|----------|----------|
| `MuseBar/bridge/src/config.js` | `MuseBar/bridge/src/config.ts` |
| `MuseBar/bridge/src/cloudClient.js` | `MuseBar/bridge/src/cloudClient.ts` |
| `MuseBar/bridge/src/index.js` | `MuseBar/bridge/src/index.ts` |
| `MuseBar/bridge/src/printers/networkEscpos.js` | `MuseBar/bridge/src/printers/networkEscpos.ts` |

Added:

1. `MuseBar/bridge/tsconfig.json`,
2. `MuseBar/bridge/eslint.config.js`,
3. typed bridge config and print-job contracts,
4. compiled runtime output under ignored `dist/`.

### Bridge package scripts

Updated `MuseBar/bridge/package.json`:

1. `build` runs `tsc -p tsconfig.json`,
2. `type-check` runs `tsc --noEmit -p tsconfig.json`,
3. `lint` runs `eslint src`,
4. `test` builds first, then runs Node's built-in test runner against `test/*.test.js`,
5. `start` and `bridge` now execute `dist/index.js`.

### Tests exercise the built artifact

Updated bridge tests:

1. `test/config.test.js` imports `../dist/config`,
2. `test/networkEscpos.test.js` imports `../dist/printers/networkEscpos`.

This verifies the actual compiled runtime path used by operators.

### CI gate

Updated `.github/workflows/ci-cd.yml`:

1. added a dedicated `bridge-test` job,
2. installs dependencies from the root lockfile with `npm ci`,
3. runs bridge lint, type-check, and tests,
4. includes `bridge-test` in `build-and-deploy` dependencies,
5. includes `bridge-test` in final workflow notification dependencies.

---

## 3) Verification

Executed locally:

1. `npm run type-check --workspace MuseBar/bridge`
   - Result: pass
2. `npm run lint --workspace MuseBar/bridge`
   - Result: pass
3. `npm test --workspace MuseBar/bridge`
   - Result: 2 passed / 0 failed
4. `npm ci && npm run lint --workspace MuseBar/bridge && npm run type-check --workspace MuseBar/bridge && npm test --workspace MuseBar/bridge`
   - Result: pass
5. `npm run lint` from `MuseBar/backend`
   - Result: pass
6. `npm run type-check` from `MuseBar/backend`
   - Result: pass
7. `npm test` from `MuseBar/backend`
   - Result: 65 files passed / 285 tests passed
8. IDE diagnostics on bridge files
   - Result: no linter errors

---

## 4) Operational note

The bridge remains a local Node process for now. This phase only brings the current
Node bridge under type-check, lint, tests, and CI. A later deployment ergonomics
phase can still package the bridge as a single binary or appliance if customer
installation friction becomes the priority.

---

## 5) Outcome

The bridge is now a first-class workspace with enforced quality gates. Production
deployment is blocked if bridge linting, type-checking, or tests fail.
