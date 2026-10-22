---
name: frontend-feature
description: >-
  Add or modify React features in MOSEHXL/MuseBar frontend. Use when building
  containers, custom hooks, ApiService calls, MUI components, or POS/History/Settings UI.
---

# Frontend Feature

## Component pattern

```
components/MyFeature/
  MyFeatureContainer.tsx    # orchestrator
  MyFeaturePanel.tsx        # presentational sub-components
  hooks/                    # optional feature-local hooks
```

Shared hooks live in `MuseBar/src/hooks/` when reused across features.

Every file caps at 400 lines (target ≤ 250) and holds one component or concern — see
`code-hygiene`. Split the container before it grows a second responsibility, not after.

## Hook split (canonical)

| Hook | Responsibility |
|------|----------------|
| `useXState` | `useState` + actions; returns `[State, Actions]` tuple |
| `useXLogic` | Derived values, formatting — **no I/O** |
| `useXAPI` | Async calls via `ApiService`; callbacks for success/error |

Example: `HistoryContainer` → `useHistoryState` + `useHistoryLogic` + `useHistoryAPI`.

## API calls

Always use singleton:

```typescript
const apiService = ApiService.getInstance();
await apiService.request('/some-endpoint', { method: 'POST', body: JSON.stringify(data) });
```

Or domain modules in `services/api/*.ts`. Auth token attached automatically in `services/api/core.ts`.

PIN-gated calls: pass `pinActorToken` from `usePinSessions().activeSession?.actor.token`.

## Tests (mandatory with new behaviour)

See `testing-and-ci`. Prefer colocated unit tests of **pure** modules
(`*Draft.ts`, `*Totals.ts`, `*Policy.ts`, mappers) over mounting full MUI trees.

| You added / changed | Add |
|---------------------|-----|
| Pure helper / draft / totals / mapper | `foo.test.ts` next to `foo.ts` |
| Policy / permission / PIN elevation helper | Unit test of inputs → decision |
| Bug in UI logic | Regression test on the helper or hook |
| Presentational-only markup | Optional; not required |

Do not ship a new `useXLogic` / draft helper without a test file in the same PR.

## Rules

- **No `@typescript-eslint/no-explicit-any`** — error level in frontend ESLint
- **Memoize hook return objects** with `useMemo` when returning `{ fn1, fn2, ... }` (patch #53 rerender fix)
- **No Redux/React Query** — contexts + hooks only
- **French UI strings** are inline today; new strings go in `i18n/resources.ts` when using `useTranslation`
- Use `logger` from `utils/logger.ts` — not raw `console.*`

## Types

- API/backend shapes: `@mosehxl/types` (snake_case)
- UI/cart shapes: `src/types/` (camelCase)
- Map between them in `services/api/*.ts` mappers

## MUI conventions

- Layout: `Box` flex chains, `Paper`, `Tabs`
- `textTransform: 'none'` on main nav tabs
- Theme: 87.5% base font size for cashier screens

## Lazy loading

Non-critical tabs/dialogs: `React.lazy` + `Suspense` via `appLazyTabPanels.tsx`. POS tab stays eager.

## Vite split

`manualChunks` for `react` / `mui` / `i18n`. Login **statically** imports `config/api` — do not
mix a static and a dynamic import of that module (Vite warns and duplicates the chunk).

## Related skills

- `auth-and-multi-tenancy` — PIN sessions, permissions, tab visibility
- `pos-and-floor-service` — if touching POS/floor
