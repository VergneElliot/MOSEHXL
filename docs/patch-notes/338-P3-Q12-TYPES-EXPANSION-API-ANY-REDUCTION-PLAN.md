# 338 — P3-Q12 types expansion + API any reduction plan

## Objective

Start `P3-Q12` by expanding shared workspace types and eliminating high-impact frontend `any` usage in API service adapters.

## Scope

### In scope

- Expand `@mosehxl/types` with DTOs used by frontend catalog API adapters.
- Refactor frontend API services to consume shared DTOs instead of `any`:
  - `src/services/api/products.ts`
  - `src/services/api/categories.ts`
- Remove obvious `any` defaults in local API response type helpers where safe.
- Verify frontend type-check + lint on touched files.

### Out of scope

- Full frontend `any` eradication in one pass (remaining legacy hotspots are tracked for follow-up tranches).
- Large-scale migration of all `src/types/*` shapes in this tranche.

## Design decisions

1. Add snake_case transport DTOs (`ProductRecord`, `CategoryRecord`) to `@mosehxl/types`.
2. Keep frontend domain models unchanged; only replace raw transport typing layer.
3. Replace parsing logic with typed helpers (`toNumber`, `mapProduct`, `mapCategory`) to avoid `any` fallback.

## Verification plan

- `npm run type-check` (frontend)
- `eslint` on modified files
