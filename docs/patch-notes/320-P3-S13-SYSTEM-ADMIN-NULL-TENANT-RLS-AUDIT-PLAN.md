# 320 — P3-S13 system-admin null-tenant RLS audit (plan)

## Objective

Prove that request chains running with `establishment_id = null` (system-admin context) do not bypass tenant RLS protections.

## Scope

### In scope

- Extend real-DB compliance tests with null-tenant context assertions.
- Verify read isolation and write denial for tenant-scoped tables under null context.
- Keep superuser/BYPASSRLS guard behavior to avoid false negatives in privileged environments.

### Out of scope

- Refactoring route-level establishment checks.
- Expanding RLS policies to new tables.

## Design decisions

1. Use `runWithTenantContext({ establishmentId: null })` to mirror system-admin null-context runtime behavior.
2. Assert read returns zero rows for tenant-owned data.
3. Assert insert attempts fail with an RLS/policy-style error.

## Verification plan

- Backend type-check.
- Targeted real-db test:
  - `RUN_REAL_DB_TESTS=true vitest run --project real-db`
