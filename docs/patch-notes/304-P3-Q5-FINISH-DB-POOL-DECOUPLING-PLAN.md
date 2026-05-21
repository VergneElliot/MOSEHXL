# 304 — P3-Q5 finish `db/pool.ts` decoupling (plan)

## Objective

Make `db/pool.ts` the actual owner of the shared Postgres pool and migrate backend modules/tests away from importing pool from `app.ts`.

## Scope

### In scope

- Move pool creation + tenant-context query wrapping from `app.ts` to `db/pool.ts`.
- Update backend modules/services to import `pool` from `db/pool.ts`.
- Update test mocks that previously mocked `../app`/`../../app` for pool access.
- Keep runtime DB behavior unchanged.

### Out of scope

- Changes to SQL schema or query semantics.
- Non-pool bootstrap refactors in `app.ts`.

## Design decisions

1. Keep one shared pool instance, now owned by `db/pool.ts`.
2. Preserve existing tenant-context wrapping (`SET LOCAL app.establishment_id`) in the new owner module.
3. Convert call sites incrementally but complete migration in one patch to avoid mixed ownership ambiguity.

## Verification plan

- Backend type-check.
- Targeted tests for legal journal append and software-event runtime helpers.
- Full backend test suite.
