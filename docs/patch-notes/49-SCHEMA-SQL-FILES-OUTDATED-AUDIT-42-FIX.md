# Fix: Schema SQL Files Outdated (Audit #42)

This doc explains **why** the reference schema files (schema.sql, legal-schema.sql, multi-tenant-schema.sql) were out of sync with the actual database state after migrations, **what** we changed to align them (types, precision, missing columns), and **how** to keep them in sync going forward.

---

## 1. What was the problem?

The audit stated: **"schema.sql, legal-schema.sql, multi-tenant-schema.sql don't match the actual database state post-migrations. Missing columns, wrong types, wrong precision."**

The application uses a **migration CLI** (`npm run migration:migrate`) that applies only the timestamped SQL files in `migrations/files/`. The reference schemas in `models/` are **not** run by the CLI; they are used for documentation and for manual/bootstrap setup. Over time, migrations added:

- **Types:** All timestamp columns converted from `TIMESTAMP` (without time zone) to `TIMESTAMPTZ` (see `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql`).
- **Precision:** Monetary and tax columns changed from `DECIMAL(10,2)` / `DECIMAL(12,2)` to `DECIMAL(12,4)` for legal/accounting correctness (see `2026_02_26_01_00_00_accounting_decimal_precision.sql`).
- **Columns:** `establishment_id` on POS tables; `tips`, `change` on orders; `description` on order_items (see `2026_02_25_00_00_00_add_pos_columns_and_establishment_isolation.sql`).
- **Tables:** `rate_limit_store` (see `2026_03_05_12_00_00_rate_limit_store.sql`).

The reference schema files still had the **old** types and lacked these columns/tables. So:

- Anyone reading the schema files got a **wrong** picture of the DB.
- Manual setup or tooling that compared against these files would see "missing" or "wrong" columns.
- Confusion when debugging or onboarding: "the code expects X but schema.sql doesn't show it."

---

## 2. Core concepts

### 2.1 Source of truth

- **Runtime source of truth** for the database shape is **the migration chain**: apply `migrations/files/*.sql` in order and the resulting state is what the app expects.
- **Reference schemas** in `models/schema.sql`, `models/legal-schema.sql`, and `models/multi-tenant-schema.sql` are **documentation**. They should describe the same shape (types, precision, columns) as the post-migration state so they don't conflict with reality.

### 2.2 Why TIMESTAMPTZ and DECIMAL(12,4)

- **TIMESTAMPTZ:** Stored in UTC; round-trips correctly with the app and avoids timezone/hash issues in the legal journal and closures. See doc for `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql`.
- **DECIMAL(12,4):** Exact tax and amount storage for French legal compliance; rounding only at display. See doc for `2026_02_26_01_00_00_accounting_decimal_precision.sql`.

---

## 3. What was changed

### 3.1 schema.sql

- **Header:** Added a short comment that the source of truth is migrations and that this file documents the intended shape (audit #42).
- **Timestamps:** All `TIMESTAMP` → `TIMESTAMPTZ` (categories, products, orders, order_items, sub_bills, users, business_settings).
- **Precision:** `orders.total_amount`, `total_tax` → `DECIMAL(12,4)`; `order_items.unit_price`, `total_price`, `tax_amount` → `DECIMAL(12,4)`; `sub_bills.amount` → `DECIMAL(12,4)`.
- **Missing columns:** Added `tips`, `change` to orders; `description` to order_items.
- **Reference block (commented):** At the end, added a commented block documenting the `establishment_id` columns and `rate_limit_store` table that migrations add (so the file describes full state without being run twice if using the CLI).

### 3.2 legal-schema.sql

- **Header:** Added that source of truth is migrations and types/precision are aligned with post-migration state (audit #42).
- **Timestamps:** All `TIMESTAMP` → `TIMESTAMPTZ` (legal_journal, closure_bulletins, audit_trail, archive_exports).
- **Precision:** `legal_journal.amount`, `vat_amount` → `DECIMAL(12,4)`; `closure_bulletins.total_amount`, `total_vat` → `DECIMAL(12,4)`.

### 3.3 multi-tenant-schema.sql

- **Header:** Added that source of truth is migrations and types are aligned with post-migration state (audit #42).
- **Timestamps:** All `TIMESTAMP` → `TIMESTAMPTZ` (establishments, users ALTER columns, user_invitations, password_reset_requests, email_logs, roles, user_role_assignments).

### 3.4 No change to migration CLI or run order

- Fresh setup remains: run schema.sql, legal-schema.sql, multi-tenant-schema.sql (in that order), then `npm run migration:migrate`. The reference files now document the **same** types and precision as the migrations; migration scripts still add `establishment_id`, `rate_limit_store`, etc.

---

## 4. How to verify

1. **Read the files:** Open `models/schema.sql`, `models/legal-schema.sql`, and `models/multi-tenant-schema.sql`. Check that timestamp columns are `TIMESTAMPTZ` and monetary/legal columns use `DECIMAL(12,4)` where applicable.
2. **Compare to migrations:** Cross-check with `migrations/files/` (timestamptz migration, accounting decimal precision, add_pos_columns, rate_limit_store). The reference schemas should match the **result** of applying those migrations.
3. **Verification queries:** After running migrations, use the queries in `docs/09-DATABASE-ARCHITECTURE-COMPATIBILITY.md` §5 to confirm columns exist; the types should match what the reference schemas now describe.

---

## 5. Summary

| Before (audit #42) | After |
|--------------------|--------|
| schema.sql: TIMESTAMP, DECIMAL(10,2); missing tips, change, description | TIMESTAMPTZ, DECIMAL(12,4); tips, change, description in CREATE; reference block for establishment_id and rate_limit_store |
| legal-schema: TIMESTAMP, DECIMAL(10,2)/DECIMAL(12,2) | TIMESTAMPTZ, DECIMAL(12,4) for amount/vat/totals |
| multi-tenant-schema: TIMESTAMP | TIMESTAMPTZ throughout |
| No clear “source of truth” note | Each file states migrations are source of truth |

The reference schema files now match the actual database state **after** migrations (types, precision, and documented columns). Future schema changes should still be done as migrations in `migrations/files/`; when a migration changes types or adds columns, update the corresponding reference schema file so it stays in sync.
