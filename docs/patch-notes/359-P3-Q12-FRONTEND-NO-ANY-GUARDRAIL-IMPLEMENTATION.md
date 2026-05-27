# 359 - P3-Q12 (Frontend no-`any` guardrail tranche) - Implementation

Plan reference: `docs/patch-notes/358-P3-Q12-FRONTEND-NO-ANY-GUARDRAIL-PLAN.md`

## What changed

### 1) Removed explicit `any` from runtime frontend paths

- `BulletinDetailsDialog` now reads optional VAT TTC values via typed `ClosureBulletin` fields (`ttc?: number`) without cast-to-any.
- `LegalReceipt` VAT rate compatibility now uses typed optional `rate?: number` from `VatBreakdownItem`.
- Compliance closure bulletins loading now uses typed response access (`response.data.bulletins`) without any-casts.

### 2) Added shared system admin typing

- Extended `MuseBar/src/types/system.ts` with:
  - `SecurityLogFilters`
  - `AuditTrailEntry`
- Reused these types in:
  - `SystemSecurityLogsPage`
  - `SecurityLogsList`
  - `AuditTrailDashboard`

This replaced `any[]` and `any | null` state shapes and typed the audit-trail API payload.

### 3) Added guardrail against reintroducing explicit `any`

- Updated `MuseBar/.eslintrc.json`:
  - Enabled `@typescript-eslint/no-explicit-any: "error"` globally.
  - Added targeted test-only overrides for:
    - `*.test.ts(x)`
    - `src/setupTests.ts`
    - `src/utils/testing/**`

This enforces "no explicit any" in production/frontend runtime code while preserving pragmatic flexibility for test helpers.

## Verification run

- `npm run build --workspace MuseBar` -> success
- `npm run lint --workspace MuseBar` -> success for frontend changes (repo still reports pre-existing backend warnings unrelated to this tranche)
