# 342 — P3-Q12 POS/closure/establishment typing plan

## Objective

Continue `P3-Q12` by removing `any` from the next high-value frontend adapters in POS payment flow hooks/components, closure API hook parsing, and establishment service response metadata typing.

## Scope

### In scope

- Remove `any` from POS payment callback and API action signatures.
- Remove `as any` parsing in `useClosureAPI` bulletin loading and monthly stats assignment.
- Replace `any` response metadata typing in `establishmentService.ts` (`getDashboardMetrics`, `searchEstablishments`).
- Keep runtime behavior unchanged.
- Verify frontend type-check + eslint on touched files.

### Out of scope

- Remaining broad `any` cleanup in generic UI type helpers.
- API contract changes on backend routes.

## Design decisions

1. Use domain model `Order` in POS callback chains instead of untyped payloads.
2. Keep flexible response metadata as `Record<string, unknown>` where backend shape is not strict.
3. Prefer narrowing existing typed responses (`apiService.get<T>`) over ad-hoc casts.

## Verification plan

- `npm run type-check` (frontend)
- `npx eslint` on modified files
