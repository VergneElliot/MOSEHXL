# 220 - P1-Q8 (Order wire DTO vs view-model boundary) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-Q8)

## Why this patch exists

Order data is intentionally represented in two shapes:

1. backend/shared API wire DTO (`snake_case`),
2. frontend UI view model (`camelCase`).

Audit P1-Q8 asked to explicitly document that boundary and protect it with tests
so future refactors do not blur responsibilities.

## Scope

### In scope

1. Document where the DTO -> view-model mapping boundary lives.
2. Add regression tests for `orders.ts` mapper behavior.
3. Keep runtime behavior unchanged.
4. Document implementation and verification.

### Out of scope

- Refactoring order component internals.
- Changing backend payload contract.
- Switching naming conventions globally.

## Design choices

1. **Document in architecture chapter**
   - Add a dedicated "Order DTO Boundary" section to `docs/course/02-ARCHITECTURE.md`.
   - Include concrete field mapping examples and ownership rules.

2. **Boundary lock via unit tests**
   - Add mapper-focused tests on `src/services/api/orders.ts` using mocked API core request layer.
   - Validate:
     - snake_case -> camelCase conversions,
     - numeric coercions and tax-rate conversion,
     - support for both legacy and paginated response shapes.

## Strategy

### Step 1 - Documentation update

File:
- `docs/course/02-ARCHITECTURE.md`

Plan:
1. Add section describing wire DTO vs view-model split.
2. List canonical field mappings and mapper ownership rules.

### Step 2 - Mapper regression tests

File:
- `MuseBar/src/services/api/orders.mapper.test.ts` (new)

Plan:
1. Mock `request` from `services/api/core`.
2. Assert mapping output from `getOrders()`.
3. Assert dual-shape handling in `getOrdersPaginated()`.

### Step 3 - Verify

Run:
- targeted frontend mapper test,
- frontend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. Order mapping boundary is clearly documented in architecture docs.
2. Mapper tests fail if key DTO/view-model transformations regress.
3. Frontend checks remain green with no behavior changes.
