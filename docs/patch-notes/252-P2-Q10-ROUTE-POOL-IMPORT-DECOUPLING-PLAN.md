# 252 - P2-Q10 (route pool import decoupling) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (Q10)

## Why this patch exists

Several route-layer files import `pool` from `app.ts`.

That creates architecture coupling from route/domain code back to application
bootstrap, which makes boundaries less explicit and increases test fragility.

## Scope

### In scope

1. Add a dedicated pool access module: `backend/src/db/pool.ts`.
2. Migrate all route-side `pool` imports from `app.ts` to `db/pool.ts`.
3. Keep runtime behavior unchanged.

### Out of scope

- Full migration of every model/service import site in this pass.
- Reworking pool initialization lifecycle.

## Design choice

Use `db/pool.ts` as a canonical import surface for route-layer code.

For this pass, `db/pool.ts` re-exports the existing initialized pool from
`app.ts` to preserve current startup behavior while removing direct route-to-app
coupling.

## Strategy

### Step 1 - Add pool module

Create `src/db/pool.ts` that exposes `pool` for non-bootstrap modules.

### Step 2 - Migrate route imports

Update these files:
1. `routes/authLogin.ts`
2. `routes/printing.ts`
3. `routes/orders/orderCRUD.ts`
4. `routes/enhancedEstablishments.ts`
5. `routes/establishmentAccountCreation/index.ts`
6. `routes/establishmentAccountCreation/middleware/validateInvitation.ts`
7. `routes/userManagement/roles/roleQueries.ts`
8. `routes/userManagement/team/teamQueries.ts`

### Step 3 - Verify

Run backend type-check plus targeted route tests and lint diagnostics.

## Acceptance criteria

1. No route-side file imports `pool` from `app.ts`.
2. Route-side imports resolve through `db/pool.ts`.
3. No behavior regressions in targeted verification.
