# Fix: Schema Creation Divergence (Data Integrity)

> **HISTORICAL — SUPERSEDED CONTEXT**
>
> This patch note documents a past architecture stage when the project still had
> per-establishment schema creation paths. The runtime model has since converged
> to shared-table multi-tenancy with `establishment_id` isolation and RLS.
> Keep this file for historical traceability, not as present-tense architecture
> guidance.

This doc explains **what “schema” means here**, **why having two different creators was a problem**, and **how we fixed it** so every establishment gets the same tables no matter which flow created it.

---

## 1. What is “schema” in this context?

In PostgreSQL, a **schema** is a namespace inside a database. You can have many schemas in one database (e.g. `public`, `establishment_abc123`, `establishment_def456`). Tables live inside a schema: `public.users`, `establishment_abc123.orders`, etc.

In this project we use **one schema per establishment** for data isolation: each establishment gets its own schema (e.g. `establishment_<uuid>`) with its own `orders`, `products`, `categories`, and so on. That way one tenant’s data is separated from another’s at the database level.

So when we say “create the establishment schema,” we mean: create that schema and **create the set of tables** the app expects inside it (orders, order_items, products, categories, legal_journal, audit_trail).

---

## 2. What was the problem?

We had **two different code paths** that created an establishment’s schema and tables:

| Path | Used when | Who creates the tables | What gets created |
|------|-----------|-------------------------|--------------------|
| **SchemaManager** | Admin creates establishment (enhanced flow), or legacy EstablishmentModel | `SchemaManager.createEstablishmentSchema()` | `orders`, `order_items`, `products`, `categories`, `legal_journal`, `audit_trail` |
| **SchemaOperations** | Invitee completes account setup (invitation flow) | `SchemaOperations.createEstablishmentSchema()` → `createBasicTables()` | `menu_items`, `orders`, `order_items`, `transactions`, `tables` |

So:

- **Path 1** creates: `products`, `categories`, `order_items` (with `product_id`, `product_name`, tax fields), `orders` (with `payment_method`, `total_tax`, `tips`, `change`), `legal_journal`, `audit_trail`.
- **Path 2** creates: `menu_items` (instead of `products`), `orders` (with `order_number`, `table_number`, `customer_name`, `payment_status` — different columns), `order_items` (with `menu_item_id`, no tax columns), plus `transactions` and `tables`.

So **depending on which flow created the establishment**, the database had **different tables and different column shapes**. The rest of the app (POS frontend, OrderModel, ProductModel, legal journal, stats) assumes the **SchemaManager** shape (products, categories, orders with payment_method/total_tax/tips/change, order_items with product_id and tax fields, legal_journal, audit_trail). If the establishment was created via the invitation flow, it had `menu_items` and a different `orders`/`order_items` instead, so the POS and backend would break or behave wrongly when using that establishment.

That’s a **data integrity / consistency** issue: the same “create establishment schema” operation must create the **same** structure everywhere.

---

## 3. Why did we have two implementations?

Likely evolution: one path was built for the “admin creates establishment” flow (SchemaManager with products/categories/orders/legal_journal), and another was added later for “invitee completes setup” (SchemaOperations with menu_items/orders/transactions/tables) without reusing the first. So we ended up with two separate “create establishment schema” implementations and no single source of truth.

---

## 4. How we fix it (single source of truth)

We keep **SchemaManager** as the single place that defines “what tables an establishment has.” It already matches what the rest of the app expects.

**SchemaOperations** is changed so it **no longer creates its own tables**. Instead it:

1. Computes the schema name (same as before): `establishment_${establishmentId}`.
2. Calls **SchemaManager.createEstablishmentSchema(client, schemaName)** so the same tables (orders, order_items, products, categories, legal_journal, audit_trail) are created.
3. Does the extra steps it already did: permissions (GRANTs) and audit log entry in `audit_trail`.
4. Returns the same “tables created” list that SchemaManager creates, so callers still get a consistent response.

So:

- **SchemaManager** = single source of truth for **what** tables exist and their structure.
- **SchemaOperations** = orchestration for the invitation flow: “create schema + tables (via SchemaManager), then permissions and audit.”

We **remove** the duplicate table creation in SchemaOperations (`createBasicTables`: menu_items, orders, order_items, transactions, tables). No new code path creates a different set of tables.

---

## 5. What you need to know as a developer

- **One definition of “establishment schema”**  
  Whenever we create an establishment’s schema, we must create the **same** set of tables. That definition lives in **SchemaManager**. Any other code that “creates establishment schema” should call SchemaManager instead of defining its own tables.

- **Naming**  
  Schema name format is `establishment_<id>` (e.g. `establishment_<uuid>`). SchemaManager already uses this when called with that name.

- **Existing establishments**  
  Establishments that were already created via the **old** SchemaOperations path may still have the old structure (menu_items, different orders, etc.). This fix only ensures **new** establishments get the unified structure. Migrating old schemas to the new shape would be a separate migration task if you need it.

---

## 6. Files changed

| File | Change |
|------|--------|
| **docs/15-SCHEMA-CREATION-DIVERGENCE-FIX.md** | This doc (teaching + summary). |
| **services/establishmentAccountCreation/database/SchemaOperations.ts** | Stop creating tables in `createBasicTables`. Call `SchemaManager.initialize(this.logger)` and `SchemaManager.createEstablishmentSchema(client, schemaName)` instead. Keep permissions and audit; return the list of tables that SchemaManager creates. |

Result: both the “admin creates establishment” flow and the “invitee completes account setup” flow create the **same** schema and tables, so the POS and backend see a consistent structure for every establishment.
