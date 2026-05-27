# 358 - P3-Q12 (Frontend no-`any` guardrail tranche) - Plan

## Context

Audit item `P3-Q12` remained in progress because some frontend runtime paths still used explicit `any` casts/types, especially in compliance/audit/security UI modules.

## Objectives

1. Remove remaining explicit `any` usage from non-test frontend runtime files.
2. Replace those with shared typed interfaces and safer typed access patterns.
3. Add an enforceable guardrail to prevent new explicit `any` in frontend production code while keeping test utilities practical.

## Scope

- `MuseBar/src/components/Closure/BulletinDetailsDialog.tsx`
- `MuseBar/src/components/Legal/LegalReceipt/utils.ts`
- `MuseBar/src/components/Legal/LegalComplianceDashboard/useCompliance.ts`
- `MuseBar/src/components/SystemAdmin/SecurityLogs/*`
- `MuseBar/src/components/Admin/AuditTrailDashboard.tsx`
- `MuseBar/src/types/system.ts`
- `MuseBar/.eslintrc.json`

## Verification

- Build frontend (`npm run build --workspace MuseBar`).
- Lint frontend (`npm run lint --workspace MuseBar`) and confirm no frontend lint errors from `no-explicit-any`.
