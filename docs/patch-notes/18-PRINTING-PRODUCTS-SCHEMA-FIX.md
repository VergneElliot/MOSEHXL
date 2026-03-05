# Fix: Printing and Products Routes Query Wrong Schema

This doc explains **why** the printing and products routes were violating multi-tenant data isolation, **what** “establishment-specific schema” means in this app, and **how** we fixed it so orders and products are always read from the correct tenant schema.

---

## 1. How multi-tenant data is stored

The app uses **schema-based isolation** for POS data:

- The **public** schema holds shared tables: `establishments`, `users`, `closure_bulletins`, `printing_configurations`, `printing_history`, etc. These are shared across the system and often have an `establishment_id` column to link to a tenant.
- Each **establishment** has its **own schema** (e.g. `establishment_abc123`). That schema contains **that tenant’s** tables: `orders`, `order_items`, `products`, `categories`, `legal_journal`, `audit_trail`. There is no `establishment_id` on those tables — the **schema itself** is the boundary. So `establishment_foo.orders` is Bar A’s orders, and `establishment_bar.orders` is Bar B’s orders.

So to respect multi-tenancy, any code that reads or writes **orders**, **order_items**, **products**, or **categories** must do so in the **establishment’s schema**, not in `public`. If you query `public.orders` or unqualified `orders` (which defaults to `public` when it exists), you are either seeing the wrong data or mixing tenants.

---

## 2. What was wrong

Two route modules were querying **unqualified** table names (so PostgreSQL used the default search path, typically `public`):

1. **`routes/printing.ts`**  
   For **receipt** printing (`POST /api/printing/receipt/:orderId`), the code ran a single SQL query joining `orders`, `order_items`, `products`, and `establishments`. That hit `public.orders`, `public.order_items`, `public.products`. So:
   - If your DB only has data in establishment schemas, the receipt query would return no rows or wrong data.
   - If you had the same table names in `public` with `establishment_id`, you were at least filtering by `o.establishment_id = $2`, but then you were **not** using the intended per-tenant schema design and could mix or leak data if `public` was ever shared or misused.

2. **`routes/products.ts`**  
   The routes themselves call **ProductModel** (and CategoryModel) and one direct **`pool.query`** for counting `order_items` when deleting a product. **ProductModel** and **CategoryModel** in `models/database/productModel.ts` were written to query `products` and `categories` with a filter like `WHERE establishment_id = $1`. So they were targeting **public** (or whatever search_path), not the establishment schema. Same idea: data isolation was by column, not by schema, and the design intent is schema-per-tenant.

So the bug was: **printing and products (and the product/category model) did not use the establishment-specific schema**. Multi-tenant isolation was violated because they did not scope queries to `"<schema_name>".orders`, `"<schema_name>".products`, etc.

---

## 3. Why it matters

- **Isolation**: One establishment must never see or affect another’s orders or products. Schema-per-tenant guarantees that at the DB level; querying the wrong schema breaks that guarantee.
- **Consistency**: The rest of the app (e.g. order creation, legal journal, establishment stats) already uses the establishment schema for orders. Printing and products must use the same schema so they see the same data.
- **Security and compliance**: Mixing tenants’ data in one table (even with `establishment_id`) is riskier than strict schema separation; and for fiscal/receipt data, the correct scope is one establishment per schema.

So the fix is: **resolve the establishment’s schema name and run all orders/products/categories/order_items queries against that schema.**

---

## 4. How we fix it

### 4.1 Resolving the establishment schema

The **establishment** record (in `public.establishments`) has a column **`schema_name`** (e.g. `establishment_abc123`). Before using it in SQL, we **validate** it with a strict regex (same as in `establishment.ts`) so it is safe to interpolate into schema-qualified identifiers (no SQL injection). We do **not** trust client input as schema names.

We added a single place to resolve and validate the schema:

- **`EstablishmentModel.getSchemaNameForEstablishment(establishmentId: string): Promise<string>`**  
  Looks up the establishment by id, returns its `schema_name`, and throws if not found or if the name fails the safety check. All code that needs to query establishment-specific tables should use this and then use the returned string only in **quoted** identifiers, e.g. `"${schemaName}".orders`.

### 4.2 Printing route (`routes/printing.ts`)

- For **receipt** (`POST /api/printing/receipt/:orderId`):
  - We get `schemaName` via `EstablishmentModel.getSchemaNameForEstablishment(user.establishment_id)`.
  - The receipt query now uses:
    - `"${schemaName}".orders`
    - `"${schemaName}".order_items`
    - `"${schemaName}".products`
  - Establishment info still comes from `public.establishments` (e.g. `JOIN public.establishments e ON e.id = $2`). The `WHERE` clause uses `o.id = $1` and the join to `e` so we only get that establishment’s order in that establishment’s schema.
- **Closure bulletin** printing already reads from `closure_bulletins` and `establishments` in public, filtered by `establishment_id`; no change there.

### 4.3 Product and category models (`models/database/productModel.ts`)

- **CategoryModel** and **ProductModel** now:
  - Call `EstablishmentModel.getSchemaNameForEstablishment(establishmentId)` at the start of each method (via a small internal `schemaFor(establishmentId)` helper).
  - Run every query against `"${schema}".categories` or `"${schema}".products`.
  - No longer use `establishment_id` in `WHERE` or `INSERT` for these tables, because in the establishment schema there is only one tenant’s data (the schema is the boundary).

So all product and category reads/writes go to the correct tenant schema.

### 4.4 Products route (`routes/products.ts`)

- The **DELETE** handler had a direct `pool.query('SELECT COUNT(*) FROM order_items WHERE product_id = $1', [id])`. That was hitting `public.order_items` (or default schema). It now:
  - Resolves `schemaName` with `EstablishmentModel.getSchemaNameForEstablishment(establishmentId)`.
  - Runs `SELECT COUNT(*) FROM "${schemaName}".order_items WHERE product_id = $1` so the count is scoped to that establishment’s schema.

All other product operations go through ProductModel/CategoryModel, which are now schema-aware.

---

## 5. Summary of code changes

| Location | Change |
|----------|--------|
| **EstablishmentModel** (`models/establishment.ts`) | New `getSchemaNameForEstablishment(establishmentId)` that returns validated `schema_name` for use in schema-qualified queries. |
| **routes/printing.ts** | Receipt query uses `"<schemaName>".orders`, `"<schemaName>".order_items`, `"<schemaName>".products` and `public.establishments`; schema name resolved from `user.establishment_id`. |
| **models/database/productModel.ts** | CategoryModel and ProductModel resolve schema via `EstablishmentModel.getSchemaNameForEstablishment` and query `"<schema>".categories` and `"<schema>".products`; removed `establishment_id` from WHERE/INSERT for these tables. |
| **routes/products.ts** | DELETE handler uses `getSchemaNameForEstablishment` and queries `"<schemaName>".order_items` for the product usage count. |

Result: printing and products (and the models they use) now query the **establishment-specific schema** only, so multi-tenant data isolation is respected.

---

## 6. Note on establishment schema table structure

The **SchemaManager** (and any setup that creates establishment schemas) defines the initial columns for `orders`, `order_items`, `products`, `categories` in that schema. The app’s **ProductModel** and **CategoryModel** expect certain columns (e.g. `tax_rate`, `default_tax_rate`, `happy_hour_*`). If your establishment schema was created from an older or minimal definition, you may need migrations or schema updates so that those tables have the columns the code expects (e.g. `default_tax_rate` on categories, `tax_rate` on products). The fix in this document is about **which schema** we query; ensuring that the schema’s tables have the right columns is a separate step (migrations / SchemaManager updates) if needed.
