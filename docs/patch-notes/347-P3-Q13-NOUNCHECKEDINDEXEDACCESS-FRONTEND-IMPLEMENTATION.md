# 347 — P3-Q13 noUncheckedIndexedAccess frontend implementation

## What changed

### 1) Frontend strict index access enabled

Updated:

- `MuseBar/tsconfig.json`

Changes:

- Enabled `compilerOptions.noUncheckedIndexedAccess = true`.

### 2) Frontend strict-index regressions fixed

Updated:

- `MuseBar/src/components/Closure/CreateClosureDialog.tsx`
- `MuseBar/src/components/EstablishmentAccountCreation/steps/AccountCreationStep.tsx`
- `MuseBar/src/components/POS/PaymentDialog/SplitPayment.tsx`
- `MuseBar/src/components/PrinterSetup/PrinterSetup.tsx`
- `MuseBar/src/components/Settings/Settings/hooks/useClosureSettings.ts`
- `MuseBar/src/components/SystemAdmin/SecurityLogs/SecurityLogsStats.tsx`
- `MuseBar/src/components/common/LazyLoad.tsx`
- `MuseBar/src/components/common/ProgressiveLoading.tsx`
- `MuseBar/src/hooks/useClosureAPI.ts`
- `MuseBar/src/hooks/useClosureState.ts`
- `MuseBar/src/services/api/orders.mapper.test.ts`
- `MuseBar/src/services/happyHourService.ts`

Changes:

- Added explicit fallback values for date/time split indexing (`split('T')[0] ?? ''`, `[hours = 0, minutes = 0]`).
- Added optional guards around observer entries and progressive stage reads.
- Hardened split payment updates so primary payment method never becomes `undefined`.
- Added explicit existence assertions in mapper tests before indexed access.
- Preserved existing runtime flow while making undefined states explicit to TypeScript.

### 3) Backend rollout intentionally deferred in this commit

Notes:

- Backend `noUncheckedIndexedAccess` was attempted and produced a broad error surface across routes/security/migrations/services.
- Backend flag was reverted for this commit to keep trunk stable.
- Backend rollout is queued as the immediate follow-up tranche under `P3-Q13`.

### 4) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Changes:

- Marked `P3-Q13` as **in progress**, with frontend completed and backend pending.

## Verification

- `npm run type-check` (frontend) ✅
- `npm run type-check` (backend, with backend flag unchanged) ✅
- `npx eslint` on touched frontend files ✅
