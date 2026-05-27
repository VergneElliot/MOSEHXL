# 339 — P3-Q12 types expansion + API any reduction implementation

## What changed

### 1) Expanded shared workspace types

Updated:

- `MuseBar/packages/types/src/index.ts`
- `MuseBar/packages/types/index.d.ts`

Added:

- `ProductRecord`
- `CategoryRecord`

These DTOs represent backend transport shapes used by frontend catalog service adapters.

### 2) Removed `any` from frontend catalog API services

Updated:

- `MuseBar/src/services/api/products.ts`
- `MuseBar/src/services/api/categories.ts`

Changes:

- Replaced `request<any>` / `request<any[]>` with typed DTO responses from `@mosehxl/types`.
- Introduced typed mapping helpers:
  - `toNumber` + `mapProduct`/`mapProductDiscount`
  - `mapCategory`
- Replaced untyped update payload construction with typed records.
- Preserved existing domain model outputs (`Product` / `Category`) and behavior.

### 3) Tightened generic API response default type

Updated:

- `MuseBar/src/types/api.ts`

Changes:

- `ApiResponse<T = any>` -> `ApiResponse<T = unknown>`

### 4) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Changes:

- Marked `P3-Q12` as **in progress** with this typed API tranche completed.

## Verification

- `npm run type-check` (frontend) ✅
- `npx eslint src/services/api/products.ts src/services/api/categories.ts src/types/api.ts` ✅

## Notes

- This tranche establishes shared DTO usage and removes key `any` usage in catalog API adapters.
- Remaining frontend `any` hotspots are intentionally left for next `P3-Q12` tranche.
