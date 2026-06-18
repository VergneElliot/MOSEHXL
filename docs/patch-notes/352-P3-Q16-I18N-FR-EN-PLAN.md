# P3-Q16 Plan - Introduce Frontend i18n (`fr`/`en`)

## Context

Frontend UI text is currently mixed French/English and mostly hardcoded inline. Audit item `P3-Q16` requires introducing an i18n solution with French and English namespaces.

## Goal

Introduce `react-i18next` in the frontend with at least:
- two languages (`fr`, `en`)
- namespaced resources
- runtime language switching support
- first production usage in visible app flows

## Scope

- Add i18n dependencies to `MuseBar` frontend workspace.
- Create i18n bootstrap and resource modules.
- Initialize i18n at app entrypoint.
- Add a reusable language switcher.
- Migrate representative UI strings in:
  - app loading/error wrappers
  - auth login screen
  - password reset request/form
  - main app header labels

## Strategy

1. Install compatible `react-i18next` + `i18next` versions for the existing TypeScript toolchain.
2. Add `src/i18n` with:
   - language resources
   - init config
   - persisted language preference
3. Wire `index.tsx` to initialize i18n.
4. Replace hardcoded text in selected components using `useTranslation`.
5. Validate with frontend type-check and lint.

## Verification Plan

- `npm run type-check` in `MuseBar`.
- `eslint` on modified frontend files.
