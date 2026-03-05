# Fix: Migration Chain Broken on Fresh DB (Audit #15)

This doc explains **why** `npm run migration:migrate` failed on a fresh database, **what** “orphan” SQL files are vs the migration chain, and **how** we fixed it so the chain is self-contained and runs correctly from scratch.

---

## 1. What was the problem?

The **timestamptz migration** (`2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql`) alters timestamp columns on three tables:

- `establishment_setup_progress`
- `establishment_setup_steps`
- `establishment_status_transitions`

On a **fresh database**, those tables did **not** exist when the migration runner ran. They were only defined in **orphan root-level SQL files** in `MuseBar/backend/src/migrations/`:

| Orphan file | Tables it created |
|-------------|--------------------|
| `create-setup-progress-tables.sql` | `establishment_setup_progress`, `establishment_setup_steps` |
| `create-status-transitions-table.sql` | `establishment_status_transitions` |

The **migration manager** only runs files inside `migrations/files/` that match the timestamped pattern `YYYY_MM_DD_HH_MM_SS_name.sql` and contain `-- UP` and `-- DOWN` sections. The orphan files lived **outside** `files/`, had **no** `-- UP` / `-- DOWN` format, and were **never** executed by `npm run migration:migrate`. So:

1. You stand up a new DB and apply the reference schemas (e.g. `schema.sql`, `legal-schema.sql`, `multi-tenant-schema.sql`).
2. You run `npm run migration:migrate`.
3. The runner executes migrations in sorted order: email constraints, POS columns, then **timestamptz**.
4. The timestamptz migration runs `ALTER TABLE establishment_setup_progress ...` (and the other two).
5. **Error:** those tables do not exist → migration fails.

So the **migration chain was broken** for anyone starting from a fresh DB who never ran the orphan scripts by hand.

---

## 2. Why this matters

- **Reproducible setup:** New environments (dev, CI, staging, new developer machines) should be able to run “reference schemas + migrations” and get a working DB. If migrations depend on tables that only exist when someone manually runs an extra script, the process is fragile and undocumented.
- **Single source of truth:** Schema changes should live in the **timestamped migration chain** so order is explicit and rollback is possible. Orphan scripts that are “sometimes run” create two sources of truth and confusion about what actually created the tables in a given DB.

So the fix is: **create those three tables inside the migration chain**, in migrations that run **before** the timestamptz migration, and **remove** the orphan files so the chain is the only way those tables are created.

---

## 3. What we changed

### 3.1 New timestamped migrations (before timestamptz)

We added two migrations in `migrations/files/`, with timestamps that sort **before** `2026_02_25_01_00_00`:

| File | Purpose |
|------|---------|
| `2026_02_25_00_15_00_create_setup_progress_tables.sql` | Creates `establishment_setup_progress` and `establishment_setup_steps` (with indexes and comments). Includes `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so DBs that already had these tables from the old orphan scripts get any missing columns. |
| `2026_02_25_00_30_00_create_status_transitions_table.sql` | Creates `establishment_status_transitions` (with indexes and comments). |

So the order is now:

1. … (email, POS columns, etc.)
2. **Create** setup progress and status transitions tables
3. **Then** timestamptz migration alters their timestamp columns

On a fresh DB, step 2 creates the tables; step 3 then alters them and succeeds.

### 3.2 Timestamptz migration aligned with actual schema

The timestamptz migration originally altered `establishment_setup_progress` columns: `created_at`, `updated_at`, `started_at`, `completed_at`. The **actual** table (from the orphan and now from the new migration) only has `created_at` and `last_updated` (no `updated_at`, `started_at`, `completed_at`). We updated the timestamptz migration to only alter columns that exist:

- `establishment_setup_progress`: `created_at`, `last_updated` (removed references to `updated_at`, `started_at`, `completed_at`).
- `establishment_setup_steps` and `establishment_status_transitions`: left as-is (they already matched).

### 3.3 Orphan files removed

We **deleted**:

- `MuseBar/backend/src/migrations/create-setup-progress-tables.sql`
- `MuseBar/backend/src/migrations/create-status-transitions-table.sql`

The **single source of truth** for these tables is now the migration chain in `migrations/files/`.

---

## 4. How to verify

1. **Fresh DB:** Create a new database, apply the reference schemas (e.g. per [09-DATABASE-ARCHITECTURE-COMPATIBILITY.md](./09-DATABASE-ARCHITECTURE-COMPATIBILITY.md): `schema.sql`, `legal-schema.sql`, `multi-tenant-schema.sql`), then run:
   ```bash
   cd MuseBar/backend && npm run migration:migrate
   ```
   All migrations, including the new setup-progress and status-transitions migrations and the timestamptz migration, should run without errors.

2. **Status:** Run `npm run migration:status` and confirm the new migrations appear and are executed in order (create setup progress → create status transitions → convert timestamps to timestamptz).

3. **Application:** The dashboard and search services that use `establishment_setup_progress` and `establishment_status_transitions` should behave as before; the tables and columns are the same, only the way they are created is now part of the chain.

---

## 5. Takeaway

- **Migration chain:** Only files in `migrations/files/` with the timestamped name and `-- UP` / `-- DOWN` sections are run by `npm run migration:migrate`. Anything else is “orphan” and must be run manually or moved into the chain.
- **Dependencies between migrations:** If migration B alters tables that must exist, those tables must be created in migration A with a **lower** timestamp (so A runs before B). Here we added two migrations before the timestamptz one so the three tables exist when the timestamptz migration runs.
- **Idempotency for existing DBs:** The first new migration uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` so that DBs that already had these tables (e.g. from the old orphan scripts) can run the migration without errors and get any missing columns.
