# Fix: Orphan Root Migration SQL Files (Audit #44)

This doc explains **why** root-level SQL files in `migrations/` were a problem (never executed by the migration CLI), **what** we did (moved content into the chain, removed orphans), and **how** to keep the chain as the single source of truth.

---

## 1. What was the problem?

The audit listed **4 orphan root migration SQL files** that are **never executed** by the migration CLI:

- `add-establishment-fields.sql`
- `create-setup-progress-tables.sql`
- `create-status-transitions-table.sql`
- `remove-email-unique-constraints.sql`

The **migration manager** (`migration-manager.ts`) only runs files inside **`migrations/files/`** that:

1. Match the filename pattern `YYYY_MM_DD_HH_MM_SS_name.sql`
2. Contain exactly two sections: `-- UP` and `-- DOWN`

Root-level `.sql` files in `MuseBar/backend/src/migrations/` (i.e. **outside** `files/`) are **not** read by the CLI. So:

- Anyone who only runs `npm run migration:migrate` never applies those changes.
- DBs set up "by hand" by running the orphan scripts had a different path than DBs set up only via the chain.
- Two sources of truth: the chain in `files/` and the orphan scripts, leading to confusion and drift.

---

## 2. Status of the four orphans

| Orphan file | Status |
|-------------|--------|
| **create-setup-progress-tables.sql** | Already removed in a previous fix (doc 24). Tables are created by `2026_02_25_00_15_00_create_setup_progress_tables.sql` in `files/`. |
| **create-status-transitions-table.sql** | Already removed in a previous fix (doc 24). Table is created by `2026_02_25_00_30_00_create_status_transitions_table.sql` in `files/`. |
| **remove-email-unique-constraints.sql** | Redundant with `files/2025_09_12_07_30_00_remove_email_unique_constraints.sql` (same UP logic). **Deleted**; the chain is the only source. |
| **add-establishment-fields.sql** | Content (business_type, timezone, language on establishments) was **not** in the chain. **Replaced** by a new timestamped migration; then the orphan was **deleted**. |

So for this audit we: (1) added establishment fields to the chain, (2) deleted the two remaining root-level orphans.

---

## 3. What was changed

### 3.1 New migration: establishment fields

- **File:** `migrations/files/2025_09_15_00_00_00_add_establishment_fields.sql`
- **UP:** Adds to `establishments`: columns `business_type`, `timezone`, `language` (with defaults); constraints `valid_business_type` and `valid_language`; indexes; backfill and comments. Same behaviour as the old `add-establishment-fields.sql`.
- **DOWN:** Drops the constraints, indexes, and columns so the migration is reversible.
- **Order:** Timestamp `2025_09_15_00_00_00` sorts after `2025_09_12_07_30_00` (email constraints) so the chain stays consistent.

### 3.2 Orphan files removed

- **Deleted:** `MuseBar/backend/src/migrations/add-establishment-fields.sql`
- **Deleted:** `MuseBar/backend/src/migrations/remove-email-unique-constraints.sql`

No root-level SQL files remain in `migrations/`; the CLI only uses `migrations/files/`.

### 3.3 Doc 09

- Updated the "Not used by the CLI" paragraph to state that orphan root-level SQL files have been removed and that establishment fields and email-constraint changes are in the chain, with pointers to doc 24 and this doc.

---

## 4. How to verify

1. **No orphans:**  
   `ls MuseBar/backend/src/migrations/*.sql` (or equivalent) should list **nothing**; all `.sql` files should be under `migrations/files/`.

2. **Chain includes establishment fields:**  
   In `migrations/files/` there should be a file named like `2025_09_15_00_00_00_add_establishment_fields.sql` with `-- UP` and `-- DOWN` sections.

3. **Migrate:**  
   On a DB that has run the chain up to (and including) the email-constraints migration, run `npm run migration:migrate`. The new migration should run and add the establishment columns. No manual root-level scripts are required.

---

## 5. Summary

| Before (audit #44) | After |
|--------------------|--------|
| 4 orphan root SQL files (2 already removed earlier) | 0 root-level SQL files |
| add-establishment-fields.sql not in chain | 2025_09_15_00_00_00_add_establishment_fields.sql in `files/` |
| remove-email-unique-constraints.sql duplicate of chain | Deleted; chain is sole source |
| Two sources of truth | Single source: `migrations/files/` only |

The migration CLI now applies **all** schema changes via timestamped files in `files/`; there are no remaining orphan root migration SQL files.
