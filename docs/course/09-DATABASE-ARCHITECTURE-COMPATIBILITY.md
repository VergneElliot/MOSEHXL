# Database Architecture — Compatibility Report

**Purpose:** Historical compatibility snapshot plus practical checks for database expectations.

**Last updated:** April 2026 (historical March snapshot + current-source pointers)

---

## 1. Historical baseline (March 2026) and current pointers

> This chapter was originally written around the March 2026 audit window.  
> For live truth, prioritize:
> - `npm run migration:status` (runtime-applied migration state)
> - `DEVELOPMENT-STATE.md`
> - latest patch notes (`98+` onward).

### 1.1 Migration CLI (what actually runs)

The app uses **only** migrations in `MuseBar/backend/src/migrations/files/` that:

- Match the filename pattern: `YYYY_MM_DD_HH_MM_SS_descriptive_name.sql`
- Contain exactly two sections: `-- UP` and `-- DOWN`

**Baseline migration view at that snapshot:**

| File | Purpose |
|------|---------|
| `2025_09_12_07_30_00_remove_email_unique_constraints.sql` | Drops unique constraints on `users.email` and `establishments.email`; adds non-unique indexes. |
| `2026_02_25_00_00_00_add_pos_columns_and_establishment_isolation.sql` | Adds `tips`, `change`, `establishment_id` to orders; `description` to order_items; `establishment_id` to categories, products, orders, sub_bills, business_settings; creates indexes. |
| `2026_02_25_00_15_00_create_setup_progress_tables.sql` | Creates `establishment_setup_progress` and `establishment_setup_steps` (and adds missing columns if tables already existed from older scripts). |
| `2026_02_25_00_30_00_create_status_transitions_table.sql` | Creates `establishment_status_transitions`. |
| `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql` | Converts timestamp columns to TIMESTAMPTZ (Europe/Paris) for legal journal and closure correctness. |
| `2026_02_26_01_00_00_accounting_decimal_precision.sql` | Accounting decimal precision. |
| `2026_02_26_02_00_00_add_establishment_id_to_closure_bulletins.sql` | Adds establishment scoping to closure bulletins. |
| `2026_03_05_12_00_00_rate_limit_store.sql` | Creates `rate_limit_store` table for PostgreSQL-backed rate limiting (shared across processes, survives restart). |

**Not run by the CLI:**  
The reference schemas in `models/*.sql` are **not** run by `npm run migration:migrate`; they are for documentation and manual bootstrap. All schema changes applied by the app are in `migrations/files/` (timestamped migrations). Orphan root-level SQL files were removed; establishment fields and email-constraint changes are in the chain (see [24-MIGRATION-CHAIN-FRESH-DB-FIX.md](../patch-notes/24-MIGRATION-CHAIN-FRESH-DB-FIX.md), [51-ORPHAN-MIGRATION-SQL-FILES-AUDIT-44-FIX.md](../patch-notes/51-ORPHAN-MIGRATION-SQL-FILES-AUDIT-44-FIX.md)).

### 1.2 Reference schemas (documentation / manual setup)

These describe the intended shape of the DB but are **not** applied by the migration CLI:

| File | Role |
|------|------|
| `models/schema.sql` | Base POS reference schema used for documentation/bootstrap context; migration chain remains the authoritative runtime evolution path. |
| `models/legal-schema.sql` | Legal tables: legal_journal, closure_bulletins, audit_trail, archive_exports, triggers. |
| `models/multi-tenant-schema.sql` | Establishments and auth/tenant support structures; runtime compatibility still depends on applying the migration chain. |

At that snapshot, the running application assumed a DB already brought to a V2 shared-table state.  
Current branch has additional migration/hardening work beyond this baseline; rely on `migration:status` for live applied state.

---

## 2. What the code expects (contract)

All of the following are required for the current routes and models to work.

### 2.1 Core POS tables

**categories**

| Column | Type | Required by |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | productModel, interfaces |
| name | VARCHAR | productModel |
| default_tax_rate | DECIMAL | productModel |
| color | VARCHAR | productModel |
| is_active | BOOLEAN | productModel |
| **establishment_id** | **UUID REFERENCES establishments(id)** | productModel (all queries filter by it) |
| created_at, updated_at | TIMESTAMP | productModel |

**products**

| Column | Type | Required by |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | productModel, interfaces |
| name, price, tax_rate, category_id | … | productModel |
| happy_hour_discount_percent, happy_hour_discount_fixed | DECIMAL | productModel |
| is_happy_hour_eligible, is_active | BOOLEAN | productModel |
| **establishment_id** | **UUID REFERENCES establishments(id)** | productModel (all queries filter by it) |
| created_at, updated_at | TIMESTAMP | productModel |

**orders**

| Column | Type | Required by |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | orderModel, interfaces |
| total_amount, total_tax, payment_method, status, notes | … | orderModel |
| **tips** | DECIMAL (default 0) | orderModel.create, orderCRUD |
| **change** | DECIMAL (default 0) | orderModel.create, orderCRUD |
| **establishment_id** | **UUID REFERENCES establishments(id)** | orderModel (all queries filter by it) |
| created_at, updated_at | TIMESTAMP | orderModel |

**order_items**

| Column | Type | Required by |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | orderModel, interfaces |
| order_id, product_id, product_name, quantity | … | orderModel |
| unit_price, total_price, tax_rate, tax_amount | … | orderModel |
| happy_hour_applied, happy_hour_discount_amount | … | orderModel |
| sub_bill_id | INTEGER (nullable) | orderModel, schema |
| **description** | **TEXT (nullable)** | orderModel.create (INSERT), interfaces |
| created_at | TIMESTAMP | orderModel |

**sub_bills**

| Column | Type | Required by |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | orderModel |
| order_id | INTEGER REFERENCES orders(id) | orderModel |
| payment_method, amount, status | … | orderModel |

No `establishment_id`; scoping is via `order_id` → `orders.establishment_id`.

### 2.2 Users and auth

**users** (from `models/user.ts` and multi-tenant usage)

- id, email, password_hash, is_admin
- **establishment_id** UUID REFERENCES establishments(id) (nullable for system admins)
- first_name, last_name, role (e.g. 'establishment_admin', 'cashier', 'system_admin')
- email_verified, email_verification_token, password_reset_token, password_reset_expires
- invitation_token, invitation_expires
- last_login, updated_at, created_at

**permissions** — id, name (UNIQUE).  
**user_permissions** — user_id, permission_id (PK).

### 2.3 Business and legal

**business_settings**

- id, name, address, phone, email, siret, tax_identification
- **establishment_id** UUID REFERENCES establishments(id) (used in establishment delete and scoping)
- updated_at

**establishments** — as in multi-tenant-schema (id UUID, name, email, subscription_plan, subscription_status, etc.).  
**Note:** `schema_name` exists in legacy data/models but Phase **B1** commits to shared-table multi-tenancy; `schema_name` is not a runtime isolation mechanism.

**legal_journal, closure_bulletins, audit_trail, archive_exports** — defined in legal schema and further hardened by later migration passes; current branch uses per-establishment scoping/guards for legal surfaces.

### 2.4 Summary of historical “must have” contract deltas

- **orders:** `establishment_id`, `tips`, `change`
- **categories:** `establishment_id`
- **products:** `establishment_id`
- **business_settings:** `establishment_id`
- **order_items:** `description`

Plus the whole **establishments** table and **users** extensions from multi-tenant-schema.

---

## 3. Compatibility status (historical snapshot framing)

| Area | Status | Notes |
|------|--------|------|
| Migration CLI | ✅ | Migration chain is authoritative; confirm live DB state with `npm run migration:status`. |
| Reference schemas | ✅ | Useful for documentation/bootstrap context, but not a replacement for migration-chain verification. |
| Code vs DB contract | ✅ Clear | Models and routes consistently assume the columns in §2. If your DB has them, the app is compatible. |
| Legal tables | ✅ | legal-schema matches what legalJournal/ and auditTrail models expect. |
| User/role tables | ✅ | user.ts and auth routes expect users.establishment_id and role; multi-tenant-schema defines them. |

---

## 4. Ensuring your DB matches the contract

1. **Initial setup**  
   Prefer migration-driven setup and avoid manual schema drift:
   - run `npm run migration:migrate` on a clean DB,
   - use schema SQL files as reference material, not as a competing source of truth.

2. **Apply migrations**  
   Run `npm run migration:migrate`. The migration `2026_02_25_00_00_00_add_pos_columns_and_establishment_isolation.sql` adds, in an idempotent way:
   - `establishment_id` to orders, categories, products, sub_bills, business_settings  
   - `tips` and `change` to orders  
   - `description` to order_items  
   and creates the necessary indexes. The migration `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql` converts timestamp columns to TIMESTAMPTZ.

3. **Verify**  
   Run the verification queries in §5 to confirm all expected columns exist.

---

## 5. Quick verification queries

Run these against your DB to confirm the contract is satisfied (replace `your_establishment_id` if needed):

```sql
-- 1. establishments exists and has UUID id
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'establishments' AND column_name = 'id';

-- 2. orders has establishment_id, tips, change
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('establishment_id','tips','change');

-- 3. categories/products have establishment_id
SELECT table_name, column_name FROM information_schema.columns
WHERE table_name IN ('categories','products') AND column_name = 'establishment_id';

-- 4. order_items has description
SELECT column_name FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'description';

-- 5. users has establishment_id and role
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('establishment_id','role');
```

If any of these return fewer rows than expected, run `npm run migration:migrate` (or ensure the `2026_02_25_00_00_00` migration has been applied).

---

## 6. Recommended next steps

1. Run `npm run migration:status` and `npm run migration:migrate` in every environment (dev/staging/prod).  
2. Treat the migration chain as the canonical runtime source of truth; keep reference schema docs aligned as secondary artifacts.  
3. Keep all future schema changes in `migrations/files/` with `-- UP` and `-- DOWN`.
