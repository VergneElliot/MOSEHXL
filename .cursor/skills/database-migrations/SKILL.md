---
name: database-migrations
description: >-
  PostgreSQL migration CLI, naming conventions, checksum anti-tamper, and
  schema-drift policy for MOSEHXL/MuseBar. Use when creating or editing
  migrations, changing database schema, updating legal-schema.sql snapshots,
  or running migration:status/migrate/rollback.
---

# Database Migrations

## Source of truth

| Layer | Role |
|-------|------|
| `backend/src/migrations/files/*.sql` | **Canonical** — only these run in CI/prod |
| `backend/src/models/schema.sql` | Reference bootstrap (manual fresh DB) |
| `backend/src/models/legal-schema.sql` | Legal snapshot — must stay aligned |
| `backend/src/models/multi-tenant-schema.sql` | Tenant snapshot — must stay aligned |

Fresh DB: apply reference schemas in order, then `npm run migration:migrate`.

Live status: **always** `npm run migration:status` — never trust static doc counts.

## CLI commands

```bash
cd MuseBar/backend

npm run migration:create add_my_feature   # generates timestamped file
npm run migration:status                  # EXECUTED / PENDING / DRIFT
npm run migration:migrate                 # apply pending
npm run migration:rollback                # undo last only
npm run check:schema-drift                # CI policy check
```

## File naming

```
YYYY_MM_DD_HH_MM_SS_descriptive_name.sql
```

Example: `2026_08_28_14_00_00_open_ticket_item_line_status.sql`

Sorted lexicographically = execution order.

## Required format

Every migration must have exactly two sections:

```sql
-- UP
-- your forward SQL here

-- DOWN
-- your rollback SQL here
```

## Checksum anti-tamper (P3-Q9)

Each applied migration stores SHA-256 of `-- UP` body in `migrations.up_checksum`.

**Never edit an already-applied migration file.** Mismatch throws:

> Migration checksum mismatch for … Do not edit already-applied migration files.

Fix: create a **new** migration with the correction.

## Schema drift policy (P3-Q17)

When a migration changes schema:

1. Update `legal-schema.sql` and/or `multi-tenant-schema.sql` in the **same PR**
2. Or add `-- SCHEMA_SNAPSHOT_NOT_REQUIRED` in the SQL for **data-only** migrations

CI runs `npm run check:schema-drift` on changed migration files.

## Execution semantics

Each migration runs in a transaction with:

```sql
SELECT set_config('app.bypass_rls', 'on', true);
```

This bypasses RLS during DDL/DML. Application queries use tenant context instead.

## Connection layer

- Pool: `backend/src/db/pool.ts`
- Raw `pg` — no ORM
- Parameterized queries: `$1`, `$2`
- Money: `DECIMAL(12,4)` — never float
- Transactions: manual client, or `services/setup/transactionOperations.ts`

## Hard rules

| Never | Why |
|-------|-----|
| Edit applied migration | Checksum blocks migrate |
| Deploy via manual SQL in prod | Use migration chain |
| UPDATE/DELETE legal_journal via migration | Fiscal compliance |
| Drop immutability triggers without recreating | Legal compliance |
| Assume schema-per-tenant via `schema_name` | Deprecated — use `establishment_id` + RLS |

## Production deploy

```bash
pg_dump mosehxl_production > backup_pre_$(date +%Y%m%d).sql
cd MuseBar/backend
NODE_ENV=production npm run migration:migrate
```

## Docs

- `docs/course/05-DATABASE.md`
- `docs/course/09-DATABASE-ARCHITECTURE-COMPATIBILITY.md`
- `docs/patch-notes/355-P3-Q17-SCHEMA-DRIFT-POLICY-IMPLEMENTATION.md`
