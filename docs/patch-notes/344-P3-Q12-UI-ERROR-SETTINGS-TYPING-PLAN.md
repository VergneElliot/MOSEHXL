# 344 — P3-Q12 UI/error/settings typing plan

## Objective

Continue `P3-Q12` by removing remaining high-value `any` usage in shared UI types/components and cross-cutting frontend plumbing (`DataTable`, ErrorBoundary typing, settings hook props, and menu product form callbacks).

## Scope

### In scope

- Remove `any` defaults from shared UI generic types in `src/types/ui.ts`.
- Update `DataTable` generic constraints to align with strict UI types.
- Remove ErrorBoundary `any` usage from error context typing and Sentry bridge types.
- Replace `settingsHook: any` with concrete `UseSettingsReturn`.
- Replace `ProductDialog` `onFormChange` value `any` with precise `ProductFormData` value union.
- Keep runtime behavior unchanged.

### Out of scope

- Test helper and mock `any` cleanup.
- Broader strictness flag toggles (`noUncheckedIndexedAccess`) tracked separately as `P3-Q13`.

## Design decisions

1. Use `Record<string, unknown>` as the default generic bound for reusable UI state/table types.
2. Keep `DataTable` rendering resilient by explicitly stringifying unknown non-React values.
3. Keep Sentry type bridge lightweight via local `SentryCaptureContext` interface rather than adding SDK dependency.

## Verification plan

- `npm run type-check` (frontend)
- `npx eslint` on touched UI/error/settings/menu files
