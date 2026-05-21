# 308 — P3-Q7 real-DB Vitest compliance project (plan)

## Objective

Add a dedicated real-database Vitest project that validates critical compliance guarantees against a live PostgreSQL instance.

## Scope

### In scope

- Add a dedicated `real-db` Vitest project.
- Add a real-DB compliance test suite covering:
  - legal journal immutability trigger behavior on UPDATE/DELETE attempts
  - tenant isolation visibility behavior between establishments
- Keep default `npm test` stable and fast by excluding real-DB tests unless explicitly requested.
- Add an explicit script to run the real-DB project.

### Out of scope

- CI service-container orchestration (this patch provides the project/tests; CI wiring can be layered on top).
- Expanding real-DB coverage beyond the initial compliance assertions.

## Design decisions

1. Gate real-DB project activation behind `RUN_REAL_DB_TESTS=true` to avoid non-database environments failing default unit runs.
2. Keep real-DB tests in `src/integration/real-db/` and separate from unit tests.
3. Add a defensive role capability check for RLS assertions (superuser/BYPASSRLS roles cannot validate RLS behavior meaningfully).

## Verification plan

- Backend type-check.
- `npm test` (unit/default project).
- `npm run test:real-db` (real-db project).
