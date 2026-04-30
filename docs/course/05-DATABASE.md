# Chapter 5 — Database

This chapter explains PostgreSQL, how tables work, SQL, indexes, foreign keys, and migrations.

---

## What Is a Database?

A database is a program that stores data permanently and lets you query it efficiently. When you restart the server, your variables in Node.js are gone — but the database remembers everything.

We use **PostgreSQL** (often called Postgres) — a relational database. "Relational" means data is organized into **tables** (like spreadsheets) with **relationships** between them.

---

## Tables — Where Data Lives

A table has **columns** (like spreadsheet headers) and **rows** (like spreadsheet rows):

```
orders table:
┌────┬──────────────┬───────────┬────────────────┬───────────┐
│ id │ total_amount │ total_tax │ payment_method │ status    │
├────┼──────────────┼───────────┼────────────────┼───────────┤
│  1 │        15.00 │      2.50 │ card           │ completed │
│  2 │         8.50 │      1.42 │ cash           │ completed │
│  3 │        22.00 │      3.67 │ split          │ completed │
└────┴──────────────┴───────────┴────────────────┴───────────┘
```

Each column has a **type** (number, text, date, boolean, etc.) and optional **constraints** (can it be empty? must it be unique?).

---

## SQL — The Language

SQL (Structured Query Language) is how you talk to the database. There are four core operations:

### SELECT — Read data

```sql
-- Get all products
SELECT * FROM products;

-- Get only active products in a specific category
SELECT * FROM products WHERE is_active = TRUE AND category_id = 3;

-- Get the 10 most recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- Count how many orders exist
SELECT COUNT(*) FROM orders;

-- Get total sales amount for today
SELECT SUM(total_amount) FROM orders
WHERE created_at >= '2026-02-25' AND status = 'completed';
```

### INSERT — Create data

```sql
-- Create a new order
INSERT INTO orders (total_amount, total_tax, payment_method, status)
VALUES (15.00, 2.50, 'card', 'completed')
RETURNING *;
-- RETURNING * gives back the complete row including auto-generated id
```

### UPDATE — Modify data

```sql
-- Update a product's price
UPDATE products SET price = 7.00, updated_at = CURRENT_TIMESTAMP
WHERE id = 5;
```

### DELETE — Remove data

```sql
-- Delete an order (cascades to order_items and sub_bills thanks to foreign keys)
DELETE FROM orders WHERE id = 42;
```

---

## Schema — The Blueprint

The schema defines what tables exist and what columns they have. Ours is in `models/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,              -- auto-incrementing integer
    total_amount DECIMAL(10,2) NOT NULL, -- decimal number, 10 digits, 2 after decimal
    total_tax DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash', -- text, max 20 chars, default is 'cash'
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,                          -- text of any length (nullable by default)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- auto-set to current time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Let's break down the column definitions:

| Keyword | Meaning |
|---------|---------|
| `SERIAL` | Auto-incrementing integer (1, 2, 3, ...) |
| `PRIMARY KEY` | Uniquely identifies each row. Cannot be NULL or duplicate. |
| `NOT NULL` | This column must have a value. Cannot be empty. |
| `DEFAULT 'cash'` | If no value is provided, use 'cash' |
| `DECIMAL(10,2)` | Number with up to 10 digits and 2 decimal places |
| `VARCHAR(20)` | Text up to 20 characters |
| `TEXT` | Text of any length |
| `TIMESTAMP` | Date and time |
| `BOOLEAN` | true or false |
| `INTEGER` | Whole number |

---

## Primary Keys and IDs

Every table has a `PRIMARY KEY` — a column (usually `id`) that uniquely identifies each row. Our tables use `SERIAL PRIMARY KEY`, which means PostgreSQL automatically assigns the next number (1, 2, 3, ...) on insert.

```sql
INSERT INTO orders (total_amount, total_tax) VALUES (15.00, 2.50);
-- PostgreSQL automatically assigns id = next available number
```

---

## Foreign Keys — Relationships Between Tables

Tables reference each other. An order has many items. Each item belongs to one order. This is represented with **foreign keys**:

```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    --       ^^^^^^^                       ^^^^^^^^^^^^^^^^^
    --       must be an existing order id   if order is deleted, delete items too
    product_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);
```

`order_id INTEGER REFERENCES orders(id)` means: "the value in `order_id` must exist as an `id` in the `orders` table." If you try to insert an item with `order_id = 999` and order 999 doesn't exist, PostgreSQL rejects it.

`ON DELETE CASCADE` means: "if the referenced order is deleted, automatically delete all its items too."

### Relationship types in our schema

```
categories  ──┐
              │ 1:many (one category has many products)
products  ◄───┘
    │
    │ referenced by
    ▼
orders  ──────┐
              │ 1:many (one order has many items)
order_items ◄─┘
              │
              │ 1:many (one order has many sub-bills)
sub_bills  ◄──┘

users  ──────┐
             │ many:many (users have many permissions, permissions belong to many users)
permissions  │
             │ (joined through user_permissions table)
user_permissions ◄──┘
```

---

## Indexes — Speed

When you search for `WHERE order_id = 42` in a table with 100,000 rows, PostgreSQL normally checks every single row (a **full table scan**). An **index** is like a book's index — it tells PostgreSQL exactly where to find matching rows.

```sql
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

After creating this index, `WHERE order_id = 42` is nearly instant instead of scanning all rows. Our schema creates indexes on every foreign key and commonly queried column.

The cost: indexes make INSERT/UPDATE slightly slower (the index must be updated too) and use disk space. Worth it for columns you search on frequently.

---

## Triggers — Automatic Actions

A **trigger** is code that PostgreSQL runs automatically when something happens to a table. Our legal journal has a critical trigger:

```sql
CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_legal_journal_modification
    BEFORE UPDATE OR DELETE ON legal_journal
    FOR EACH ROW
    EXECUTE FUNCTION prevent_legal_journal_modification();
```

This trigger fires before any UPDATE or DELETE on `legal_journal`. If someone tries to modify or delete an entry, it raises an exception and blocks the operation. This is how we enforce **immutability** for legal compliance — not even a database admin can change historical entries (without first dropping the trigger, which is itself an auditable action).

---

## Migrations — Schema Evolution

When you need to add a column, create a table, or modify the schema, you write a **migration** — a SQL script that transforms the database from one version to the next.

Our project has a migration CLI:

```bash
npm run migration:status   # show which migrations have been applied
npm run migration:migrate  # apply pending migrations
npm run migration:rollback # undo the last migration
```

Migration files live in `src/migrations/files/` and are named with timestamps to ensure ordering:

```
2025_09_12_07_30_00_remove_email_unique_constraints.sql
```

The migration manager (`migration-manager.ts`) tracks which migrations have been applied in a `migrations` table in the database. Running `migrate` applies any migration not yet in that table.

### Why migrations instead of editing schema.sql?

Because the production database already has data. You can't DROP and re-CREATE a table without losing everything. Migrations add/modify columns **in place** without losing data:

```sql
-- This is a migration — it modifies the existing table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'staff';

-- This is NOT a migration — it destroys data
DROP TABLE users;
CREATE TABLE users ( ... );
```

Role note: older samples used `DEFAULT 'cashier'` before the auth-role normalization
wave. Current canonical establishment role is `staff` (`cashier` is legacy and is
normalized during auth/migration compatibility flows).

---

## Connection Pool

Opening a database connection is slow (~50ms). If every API request opens a new connection, performance suffers. A **connection pool** pre-opens several connections and reuses them:

```typescript
const pool = new Pool({
  host: 'localhost',
  database: 'mosehxl_development',
  max: 20,                    // keep up to 20 connections open
  idleTimeoutMillis: 30000,   // close idle connections after 30 seconds
});
```

When `pool.query(...)` is called, it grabs an available connection, runs the query, and returns it to the pool. If all connections are busy, the query waits until one is free.

---

## Decimal Precision for Money

A critical detail for any system that handles money: never use **floating point** types (`float`, `double`, `real`) for monetary amounts. They have rounding errors:

```
0.1 + 0.2 = 0.30000000000000004  (in JavaScript/floating point)
```

Instead, PostgreSQL provides `DECIMAL(precision, scale)`:
- `DECIMAL(10,2)` — up to 10 digits, 2 after the decimal point (good for display amounts: 12345678.99)
- `DECIMAL(12,4)` — up to 12 digits, 4 after the decimal point (good for exact accounting)

Our system uses `DECIMAL(12,4)` for tax amounts and monetary values that need accounting precision (order totals, tax amounts, closure bulletin totals). This extra precision means that when you sum up thousands of line items for a monthly closure, the total is exact — no rounding drift accumulates.

For **display**, amounts are rounded to 2 decimal places (e.g., `12.50 €`). For **storage and computation**, the exact 4-decimal value is preserved. This was added by a migration (`2026_02_26_01_00_00_accounting_decimal_precision.sql`).

---

## Our Database Tables at a Glance

### POS Core

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  categories  │     │   products    │     │    orders    │
├──────────────┤     ├───────────────┤     ├──────────────┤
│ id           │◄────│ category_id   │     │ id           │
│ name         │     │ id            │     │ total_amount │
│ default_tax  │     │ name          │     │ total_tax    │
│ color        │     │ price         │     │ payment_meth │
│ is_active    │     │ tax_rate      │     │ status       │
└──────────────┘     │ is_active     │     │ tips         │
                     │ happy_hour_*  │     │ change       │
                     └───────────────┘     └──────┬───────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    │              │              │
                              ┌─────▼──────┐ ┌────▼─────┐ ┌─────▼──────────┐
                              │order_items │ │sub_bills │ │legal_journal   │
                              ├────────────┤ ├──────────┤ ├────────────────┤
                              │ order_id   │ │ order_id │ │ order_id       │
                              │ product_id │ │ pay_meth │ │ sequence_num   │
                              │ quantity   │ │ amount   │ │ current_hash   │
                              │ unit_price │ │ status   │ │ previous_hash  │
                              │ total_price│ └──────────┘ │ transaction_type│
                              │ tax_amount │               └────────────────┘
                              └────────────┘
```

### Legal Compliance

```
┌────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│ legal_journal  │     │ closure_bulletins │     │  audit_trail    │
├────────────────┤     ├───────────────────┤     ├─────────────────┤
│ sequence_number│     │ closure_type      │     │ user_id         │
│ transaction_type│    │ period_start      │     │ action_type     │
│ order_id       │     │ period_end        │     │ resource_type   │
│ amount         │     │ total_transactions│     │ action_details  │
│ vat_amount     │     │ total_amount      │     │ ip_address      │
│ previous_hash  │     │ total_vat         │     │ user_agent      │
│ current_hash   │     │ vat_breakdown     │     │ timestamp       │
│ timestamp      │     │ closure_hash      │     └─────────────────┘
│ register_id    │     │ is_closed         │
└────────────────┘     └───────────────────┘
```

---

### Multi-Tenant & Auth

```
┌─────────────────────┐     ┌────────────────┐     ┌───────────────────┐
│   establishments    │     │     users      │     │  user_permissions │
├─────────────────────┤     ├────────────────┤     ├───────────────────┤
│ id (UUID)           │◄────│ establishment_id│     │ user_id           │
│ name                │     │ id             │────►│ permission_id     │
│ email               │     │ email          │     └───────────────────┘
│ schema_name         │     │ password_hash  │              │
│ subscription_plan   │     │ role           │              │
│ subscription_status │     │ is_admin       │     ┌────────▼──────────┐
└─────────────────────┘     └────────────────┘     │   permissions    │
                                                    ├───────────────────┤
                                                    │ id               │
                                                    │ name             │
                                                    └───────────────────┘
```

### Infrastructure

```
┌──────────────────────────┐     ┌───────────────────────────────┐
│   rate_limit_store      │     │  establishment_setup_progress  │
├──────────────────────────┤     ├───────────────────────────────┤
│ key (TEXT, PK)           │     │ establishment_id              │
│ count (INT)              │     │ step_name                     │
│ reset_time (TIMESTAMPTZ) │     │ status                        │
└──────────────────────────┘     └───────────────────────────────┘
```

---

## Multi-Tenancy Model (V2): Shared tables + `establishment_id`

As of Phase **B1** of the April 2026 audit remediation, V2 uses **shared tables** (single schema) for multi-tenancy.

- Each tenant-owned row carries **`establishment_id`**
- The application scopes every read/write to the authenticated establishment
- Legal/fiscal tables are also per-establishment (journal chain, closures, archives)

This model is compatible with French fiscal compliance because what matters is **per legal entity evidence** (no cross-tenant mixing), not the physical schema layout.

### Legacy note (historical)

Earlier versions of the project experimented with **schema-per-tenant** (`establishment_<uuid>` schemas created by `SchemaManager`). The audit found this was **not used at runtime** and created documentation drift. The current (V2) reference model is shared tables with strict tenant isolation.

```
Database: mosehxl_development
└── public schema (shared tables)
    ├── establishments
    ├── users
    ├── permissions
    ├── user_permissions
    ├── categories
    ├── products
    ├── orders
    ├── order_items
    ├── sub_bills
    ├── legal_journal
    ├── closure_bulletins
    ├── audit_trail
    └── rate_limit_store
```

This isolation means that Bar A's products and orders are completely separate from Bar B's through strict `establishment_id` scoping and DB guardrails (including RLS policies on tenant-owned tables).

---

## Summary

| Concept | What it does | Where in the project |
|---------|-------------|---------------------|
| Table | Stores rows of data | `schema.sql`, `legal-schema.sql` |
| Primary key | Uniquely identifies each row | `id SERIAL PRIMARY KEY` on every table |
| Foreign key | Links rows between tables | `order_id REFERENCES orders(id)` |
| Index | Speeds up searches | `CREATE INDEX` statements in schema files |
| Trigger | Automatic code on INSERT/UPDATE/DELETE | Legal journal immutability trigger |
| Migration | Schema change without data loss | `src/migrations/files/` |
| Connection pool | Reuses DB connections for performance | `new Pool({...})` in `app.ts` |
| Parameterized query | Prevents SQL injection | `$1`, `$2` in every `pool.query()` |
| DECIMAL(12,4) | Exact monetary arithmetic (no floating point drift) | All monetary columns |
| Shared-table multi-tenancy | All tenants share tables; rows are scoped by `establishment_id` | Models + routes; Phase B1 adds DB guardrails |
