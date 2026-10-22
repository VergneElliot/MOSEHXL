# 563 — Q — Code hygiene: monolith split, legacy purge, zero-warning build (IMPLEMENTATION)

## Summary

Behaviour-preserving hygiene pass for PLAN 562. Every TypeScript source file is now **≤ 400 lines** (`scripts/module-size-baseline.json` is empty). Permission-gated backend tests send a PIN-actor JWT. Lint is clean on frontend and backend. Vite no longer warns about a > 500 kB chunk or a mixed static/dynamic import of `config/api.ts`. Environment validation prints once at process start.

No journal payload, hash-chain, closure maths, SQL text, or permission-gate change.

## What landed

### A. Monolith split

The 34 files that were in the size baseline (largest: `PlanningPanel.tsx` at 1 067 lines) were extracted into one-concern modules. Public import paths stay as thin barrels / aggregators (`adminSpace.ts`, `floor.ts`, `routes/floor.ts`, `routes/legal/closure.ts`, `routes/authRegister.ts`, `UserModel`, `StaffShiftModel`, `OpenTicketModel`, `ArchiveService`, …).

| Area | Orchestrator now | Extracts live under |
|------|------------------|---------------------|
| POS | `POSContainer.tsx`, `OrderSummary.tsx`, `SplitBoard.tsx`, `PrintAfterSaleDialog.tsx` | `POS/usePOSContainer*.ts`, `PaymentDialog/splitBill*`, `PrintAfterSale*` |
| Floor (FE) | `useFloorService.ts`, `FloorPlansPanel.tsx` | `hooks/useFloorService*.ts`, `Administration/FloorPlans/` |
| Admin (FE) | `PlanningPanel.tsx`, `TimeClockPanel.tsx`, `ReservationsPanel.tsx` | `Administration/Planning/`, `TimeClock/`, `Reservations/` |
| Closure / public | `CreateClosureDialog.tsx`, `PrintClosureDialog.tsx`, `PublicReservationPage.tsx` | sibling hooks + presentational files |
| Floor (BE) | `routes/floor.ts` | `routes/floor/*.ts`; `openTicket*` / `productOptionGroup*` models |
| Legal / print | `routes/legal/closure.ts` | `closure/*.ts`, `closureOperations*`, `closureXlsx*`, `archive*`, `printData*` |
| Auth / tenants | `routes/authRegister.ts` | `authRegister/*.ts`, `user*Model.ts`, `establishment*`, `staffShift*` |
| Receipts | `EmailReceiptService.ts` | HTML builders; class is a thin SMTP adapter |

### B. Legacy purge

- Deleted `middleware/auth.permission.test.ts` (superseded by `auth.pinActorPermission.test.ts`).
- Deleted no-op `SchemaOperations` (shared schema + RLS).
- Removed `authenticateToken` alias; printing routes use `requireAuth`.
- Removed dead Settings stubs (`PrinterSettings.tsx`, `useGeneralSettings.ts`, unused `GeneralSettings` types).
- Kept on purpose: `is_admin` claim rejection metrics, closure-settings fallback, `/archive/:id/export` alias, happy-hour `isManuallyActivated` mapping, `routes/auth.ts` middleware re-export.

### C. Tests, lint, build

- Shared helper `backend/src/test/pinActorTestUtils.ts`. Permission tests send `x-pin-actor-token`; no PIN still expects 403 `PIN_ACTOR_REQUIRED`.
- Login tests mock `MembershipModel` (including `toApiList`); lockout threshold assertion uses 8 attempts; password tests no longer call `vi.restoreAllMocks()` mid-setup.
- JWKS tests get a 15 s timeout (RSA keygen under parallel load).
- Frontend/backend ESLint: 0 warnings (guards instead of `!`, unused vars, JSX apostrophes, safe hook deps).
- Vite `manualChunks` for react / MUI / i18n; Login statically imports `config/api`.
- `initializeEnvironment` caches config so the startup banner prints once.

### D. Docs and skills

Skills (`code-hygiene`, `testing-and-ci`, `patch-notes-workflow`, `auth-and-multi-tenancy`, `backend-api-route`, `pos-and-floor-service`, `printing-and-receipts`, `frontend-feature`, `database-migrations`), `docs/CURRENT-TRUTH.md`, `DEVELOPMENT-STATE.md`, and `AGENTS.md` now match this pass. Floor service is documented as shipped.

## Verification results

- `npm run check:module-size`: pass (767 files, baseline empty)
- `npm run lint --workspace MuseBar -- --max-warnings 0`: pass
- `npm run lint --workspace MuseBar/backend -- --max-warnings 0`: pass
- `npm run type-check --workspace MuseBar`: pass
- `cd MuseBar/backend && npm run type-check`: pass
- `npx vitest run` (backend): **109 files / 485 tests passed**
- `npx vitest run` (frontend): **19 files / 99 tests passed**
- `npx vite build`: pass; no chunk-size warning; no mixed static/dynamic import of `config/api.ts`
- Fiscal impact: **PATCH** — refactor only

Caisse / Planning / floor editor were not walked in a browser in this session (no interactive cashier machine). Behaviour was preserved by extraction + existing tests.

## Follow-ups

- ~100 files remain in the 251–400 band (allowed). Split when a seam is touched.
- `EmailReceiptService` is still a nodemailer adapter used only by `DigitalReceiptService`; production receipt email is already SendGrid.
- Real-db compliance suite unchanged; not re-run here (needs Postgres).
