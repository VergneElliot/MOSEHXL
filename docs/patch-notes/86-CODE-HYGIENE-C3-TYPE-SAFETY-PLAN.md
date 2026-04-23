# 86 - Code Hygiene C3 (Type Safety) - Plan

Date: 2026-04-23  
Phase: C3 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

C3 focuses on type safety and parser robustness in both frontend and backend:

- remove targeted `any` usage in key frontend modules,
- make JSON parser failures observable in backend legal/printing flows.

Silent parse fallback without logging makes diagnosis difficult in production and can hide data quality issues.

## Scope for this C3 pass

### Targeted frontend `any` cleanup

- `MuseBar/src/services/api/orders.ts`
- `MuseBar/src/components/POS/PrintAfterSaleDialog.tsx`
- `MuseBar/src/components/PrinterSetup/PrinterSetup.tsx`

### Targeted backend JSON parse diagnostics

- `MuseBar/backend/src/printing/printingConfigRepo.ts`
- `MuseBar/backend/src/models/happyHourSettings.ts`
- `MuseBar/backend/src/models/legalJournal/journalQueries.ts`
- `MuseBar/backend/src/services/receipts/QRReceiptService.ts`

## Step-by-step plan

### Step 1 - Type tightening
- Replace explicit `any` with `unknown` + narrow casts/guards in the three frontend files.
- Keep runtime behavior unchanged.

### Step 2 - Parser observability
- Add logger-based error reporting when `JSON.parse(...)` fails in the four backend targets.
- Preserve existing fallback behavior to avoid runtime regressions.

### Step 3 - Verification
- Run:
  - `npm run type-check` (backend)
  - `npm test` (backend)
- Ensure no new lint errors on touched files.

### Step 4 - Documentation
- Write implementation note with exact changes and verification results.

## Acceptance criteria

- Targeted `any` usages removed/reduced in C3-listed frontend files.
- C3-listed backend parse sites log parse failures before fallback.
- Checks pass and docs are linked from the audit file.
