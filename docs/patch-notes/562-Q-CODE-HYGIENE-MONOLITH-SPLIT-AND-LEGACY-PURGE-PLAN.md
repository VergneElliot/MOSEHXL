# 562 — Q — Code hygiene: monolith split, legacy purge, zero-warning build (PLAN)

## Context

The 400-line module cap (`npm run check:module-size`) was introduced after a large part of the
codebase already existed. `scripts/module-size-baseline.json` therefore still carries **34
files above the cap**, the largest at 1 067 lines (`PlanningPanel.tsx`). The ratchet keeps them
from growing but they remain the hardest places to change safely.

At the same time:

- **Backend tests are red on `development`**: 17 test files / 62 tests fail. They were written
  for the pre-536 permission model (JWT account holds feature permissions) and were never
  migrated to the PIN-actor-only model (`requirePermission` → `x-pin-actor-token`). They
  assert `200` and receive `403 PIN_ACTOR_REQUIRED`.
- **Lint is noisy**: 138 frontend warnings (52 `no-non-null-assertion`, 58
  `react/no-unescaped-entities`, 18 `react-hooks/exhaustive-deps`, 9 `no-unused-vars`,
  1 `prefer-const`) and 15 backend warnings (`no-unused-vars`).
- **Build is noisy**: Vite warns about a > 500 kB chunk and about `src/config/api.ts` being
  both statically and dynamically imported; `browserslist` data was 8 months old.
- **Startup is noisy**: the backend prints environment validation twice.
- **Legacy shims** survive their reason to exist: `@deprecated` barrel hooks
  (`Settings/useSettings.ts`, `HappyHourControl/useHappyHour.ts`), `FINE_SCALE_*` aliases,
  `authenticateToken` alias, `routes/auth.ts` re-export file, deprecated `EmailReceiptService`
  (nodemailer) still wired into `DigitalReceiptService`, `SchemaOperations` no-op kept "for
  backward compatibility", stale `auth.permission.test.ts` duplicating
  `auth.pinActorPermission.test.ts`.
- **Docs/skills drift**: `patch-notes-workflow` says "currently ~471+" (we are at 561),
  `DEVELOPMENT-STATE.md` still describes floor service as "in progress", `testing-and-ci`
  lists Vitest versions that no longer match.

## Scope

### A. Monolith split (every file in `module-size-baseline.json`)

Target: every source file ≤ 400 lines (hard), ≤ 250 where a natural seam exists. One
responsibility per file, following the patterns in `.cursor/skills/code-hygiene/SKILL.md`.

| Area | Files |
|------|-------|
| POS (FE) | `POSContainer.tsx`, `OrderSummary.tsx`, `PaymentDialog/SplitBoard.tsx`, `PaymentDialog/splitAssignment.ts`, `PrintAfterSaleDialog.tsx` |
| Floor (FE) | `hooks/useFloorService.ts`, `Administration/FloorPlansPanel.tsx`, `services/api/floor.ts` |
| Admin space (FE) | `Administration/PlanningPanel.tsx`, `TimeClockPanel.tsx`, `ReservationsPanel.tsx`, `services/api/adminSpace.ts`, `Public/PublicReservationPage.tsx` |
| Printing / closure (FE) | `PrinterSetup/PrinterSetup.tsx`, `Closure/PrintClosureDialog.tsx`, `Closure/CreateClosureDialog.tsx` |
| Floor / tickets (BE) | `routes/floor.ts`, `models/database/openTicketModel.ts`, `models/database/productOptionGroupModel.ts` |
| Legal (BE) | `routes/legal/closure.ts`, `models/legalJournal/closureOperations.ts`, `services/documents/closureXlsxService.ts`, `models/archiveService.ts`, `printing/printDataRepo.ts`, `services/orders/orderCancellationService.ts` |
| Auth / tenants (BE) | `routes/authRegister.ts`, `models/user.ts`, `models/establishment.ts`, `establishmentAccountCreation/database/UserAccountOperations.ts`, `setup/wizard/SetupWizard.ts`, `utils/database/sharedQueries.ts` |
| Staff / receipts (BE) | `models/staffShift.ts`, `models/timeEntry.ts`, `services/receipts/EmailReceiptService.ts` |

Splits are **behaviour-preserving refactors**: no API, SQL, hash-chain, or permission change.
Public import paths are preserved through thin re-export modules where other code depends on
them.

### B. Legacy purge

- Delete `middleware/auth.permission.test.ts` (superseded by `auth.pinActorPermission.test.ts`).
- Migrate the 16 remaining stale permission test files to the PIN-actor model via a shared
  `src/test/pinActorTestUtils.ts` helper that signs a real `pin_actor` JWT.
- Remove `@deprecated` shims whose callers can be moved: `FINE_SCALE_*`, `Settings/useSettings.ts`
  facade, `HappyHourControl/useHappyHour.ts` facade, `authenticateToken` alias,
  `routes/auth.ts` re-export (callers import `middleware/auth` directly), deprecated
  `Settings/types.ts` stubs, `userTypes.ts` deprecated alias, `extractInboxLocalPart`
  deprecated export.
- Retire nodemailer `EmailReceiptService` in favour of the SendGrid document email path, or
  reduce it to the minimal adapter `DigitalReceiptService` actually needs.
- Drop the no-op `SchemaOperations` (Phase B1 shared-schema made per-tenant schemas obsolete).
- Keep: legacy `is_admin` claim rejection policy (deliberate security migration with metrics),
  legacy closure-settings fallback (data migration path), `/archive/:id/export` alias (API
  compatibility for older clients), happy-hour `isManuallyActivated` mapping (older clients).

### C. Zero-warning build and run

- Fix all 138 + 15 lint warnings (no rule disabling; real fixes).
- Vite: code-split via `manualChunks` for MUI / vendor and remove the mixed static/dynamic
  import of `config/api.ts`; commit the updated `caniuse-lite` lockfile change.
- Backend: load `dotenv` / validate environment exactly once at startup.

### D. Docs and skills

- Refresh `patch-notes-workflow` (numbering hint), `testing-and-ci` (framework versions, red-test
  policy), `code-hygiene` (baseline state after this pass, test helper for PIN actor).
- `DEVELOPMENT-STATE.md`: floor service is shipped (455–460, 536–561), not in progress.
- `docs/CURRENT-TRUTH.md`: point at this pass as the latest code closure pass.
- Regenerate `LATEST-INDEX.md`.

## Approach

1. Write PIN-actor test helper; migrate red tests → backend suite green.
2. Split monoliths area by area (parallel, disjoint file sets). Each split: extract, re-run
   `tsc`, `eslint`, and the touched test files.
3. Lint sweep on everything left.
4. Build/startup warnings.
5. Legacy purge (after splits, so callers are already relocated).
6. `node scripts/check-module-size.mjs --update` → baseline shrinks to the files that could not
   be split (target: empty).
7. Docs + skills + IMPLEMENTATION note 563.

## Verification

- [x] `npm run check:module-size` passes with an empty (or near-empty) baseline
- [x] `npm run lint --workspace MuseBar` → 0 warnings
- [x] `npm run lint --workspace MuseBar/backend` → 0 warnings
- [x] `npm run type-check --workspace MuseBar` and backend `tsc --noEmit` clean
- [x] `npm test --workspace MuseBar/backend` → all green
- [x] `npm test --workspace MuseBar` green
- [x] `npm run build` → no chunk-size / mixed-import warnings
- [x] Backend startup prints environment banner once
- [x] Fiscal impact: **PATCH** — pure refactor; no change to journal payload, hash chain,
      closure maths, or permission semantics. Real-db compliance suite unchanged.

## Risks

- Refactors across ~35 files touch most feature areas. Mitigation: behaviour-preserving
  extraction only, existing tests run per area, no SQL text changes.
- Test migration could mask a real regression if a route accidentally lost its gate. Mitigation:
  every migrated test keeps its negative case (no PIN → 403) alongside the positive one.
- Rollback: single branch, revertable commit series on `development`.
