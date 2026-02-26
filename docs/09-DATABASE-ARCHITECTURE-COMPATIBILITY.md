# Database Architecture — Compatibility Report

**Purpose:** Single source of truth for what the application expects from the database, and how it aligns with the reference schemas and migrations.

**Last updated:** February 2026

---

## 1. How the DB is set up today

### 1.1 Migration CLI (what actually runs)

The app uses **only** migrations in `MuseBar/backend/src/migrations/files/` that:

- Match the filename pattern: `YYYY_MM_DD_HH_MM_SS_descriptive_name.sql`
- Contain exactly two sections: `-- UP` and `-- DOWN`

**Currently in `migrations/files/`:**

| File | Purpose |
|------|---------|
| `2025_09_12_07_30_00_remove_email_unique_constraints.sql` | Drops unique constraints on `users.email` and `establishments.email`; adds non-unique indexes. |
| `2026_02_25_00_00_00_add_pos_columns_and_establishment_isolation.sql` | Adds `tips`, `change`, `establishment_id` to orders; `description` to order_items; `establishment_id` to categories, products, orders, sub_bills, business_settings; creates indexes. **This is the migration that makes the DB compatible with current code.** |
| `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql` | Converts timestamp columns to TIMESTAMPTZ (Europe/Paris) for legal journal and closure correctness. |

**Not used by the CLI:**  
Everything in `MuseBar/backend/src/migrations/*.sql` (e.g. `add-establishment-fields.sql`, `create-status-transitions-table.sql`) and the reference schemas in `models/*.sql` are **not** run by `npm run migration:migrate`. They are reference or manual scripts.

### 1.2 Reference schemas (documentation / manual setup)

These describe the intended shape of the DB but are **not** applied by the migration CLI:

| File | Role |
|------|------|
| `models/schema.sql` | Base POS: categories, products, orders, order_items, sub_bills, users, permissions, user_permissions, business_settings. **No** `establishment_id`, **no** `tips`/`change` on orders, **no** `description` on order_items. |
| `models/legal-schema.sql` | Legal tables: legal_journal, closure_bulletins, audit_trail, archive_exports, triggers. |
| `models/multi-tenant-schema.sql` | Establishments, user extensions (establishment_id, role, first_name, etc.), user_invitations, password_reset_requests, email_logs, roles, user_role_assignments. **Does not** add `establishment_id` to orders, categories, products, or business_settings. |

So the **running** application assumes a DB that has already been brought to a “V2 multi-tenant” state (e.g. by an older or one-off migration, or by running a combination of these scripts manually). The CLI only applies the email-constraint migration on top of that.

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

**establishments** — as in multi-tenant-schema (id UUID, name, email, schema_name, subscription_plan, subscription_status, etc.).

**legal_journal, closure_bulletins, audit_trail, archive_exports** — as in legal-schema (no `establishment_id` in current code; legal tables are global).

### 2.4 Summary of “must have” columns that are not in base schema.sql

- **orders:** `establishment_id`, `tips`, `change`
- **categories:** `establishment_id`
- **products:** `establishment_id`
- **business_settings:** `establishment_id`
- **order_items:** `description`

Plus the whole **establishments** table and **users** extensions from multi-tenant-schema.

---

## 3. Compatibility status

| Area | Status | Notes |
|------|--------|------|
| Migration CLI | ✅ One migration in `files/` (email constraints). Format and flow are correct. | Add any new schema changes as migrations in `files/` with `-- UP` / `-- DOWN`. |
| Reference schemas | ⚠️ Out of date | schema.sql and multi-tenant-schema do not define `establishment_id` (or tips/change/description). Use this doc + migration as source of truth. |
| Code vs DB contract | ✅ Clear | Models and routes consistently assume the columns in §2. If your DB has them, the app is compatible. |
| Legal tables | ✅ | legal-schema matches what legalJournal/ and auditTrail models expect. |
| User/role tables | ✅ | user.ts and auth routes expect users.establishment_id and role; multi-tenant-schema defines them. |

---

## 4. Ensuring your DB matches the contract

1. **Initial setup (if starting from scratch)**  
   Run in order:  
   - `models/schema.sql` (base POS + users/permissions/business_settings)  
   - `models/legal-schema.sql` (legal tables; ignore or adapt `GRANT musebar_user` if that role doesn’t exist)  
   - `models/multi-tenant-schema.sql` (establishments + user extensions + invitations, etc.)

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

1. Run `npm run migration:migrate` in every environment (dev/staging/prod) so all migrations, including `2026_02_25_00_00_00` and `2026_02_25_01_00_00`, are applied.  
2. Optionally update `models/schema.sql` and `models/multi-tenant-schema.sql` to document `establishment_id`, `tips`, `change`, and `description` so they match this report.  
3. Keep all future schema changes as migrations in `migrations/files/` with `-- UP` and `-- DOWN`.
