# 345 — P3-Q12 UI/error/settings typing implementation

## What changed

### 1) Shared UI generic types no longer default to `any`

Updated:

- `MuseBar/src/types/ui.ts`
- `MuseBar/src/components/common/DataTable.tsx`

Changes:

- Replaced `any` generic defaults with `Record<string, unknown>` bounds for form/table shared types.
- Typed table formatter values against `T[keyof T]`.
- Updated `DataTable` generic constraints accordingly.
- Added safe conversion helper in `DataTable` so unknown non-React values render predictably as strings.

### 2) ErrorBoundary typing cleanup

Updated:

- `MuseBar/src/components/common/ErrorBoundary/types.ts`
- `MuseBar/src/components/common/ErrorBoundary/useErrorHandler.ts`
- `MuseBar/src/components/common/ErrorBoundary/ErrorDisplay.tsx`

Changes:

- Replaced `Record<string, any>` context with `Record<string, unknown>`.
- Added typed `SentryCaptureContext` and removed `options?: any` from window Sentry bridge.
- Removed severity chip `as any` cast by typing chip color mapping with explicit MUI color union.

### 3) Settings and menu dialog callback typing cleanup

Updated:

- `MuseBar/src/components/Settings/Settings/SettingsTabs.tsx`
- `MuseBar/src/components/Menu/ProductDialog.tsx`

Changes:

- Replaced `settingsHook: any` with `UseSettingsReturn`.
- Replaced `ProductDialog` form callback value `any` with precise union type from `ProductFormData`.

### 4) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Changes:

- Expanded `P3-Q12` progress note to include this shared UI/error/settings/menu typing tranche.

## Verification

- `npm run type-check` (frontend) ✅
- `npx eslint` on touched files ✅

## Notes

- This tranche hardens cross-cutting frontend types used across many screens without changing feature behavior.
- Additional `P3-Q12` cleanup remains in admin dashboards and testing utilities.
