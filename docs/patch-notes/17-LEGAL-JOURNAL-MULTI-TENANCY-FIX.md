# Fix: Legal Journal Missing Multi-Tenancy

This doc explains **what multi-tenancy means here**, **why the legal closure was wrong**, and **how we fixed it** so each establishment only closes its own orders.

---

## 1. What is multi-tenancy in this app?

The app serves **multiple establishments** (restaurants/bars). Each one must see and use **only its own data**:

- Its own products, categories, orders, order items.
- Its own closure bulletins and legal journal (per French fiscal rules).

So we must **never** mix data from different establishments: no “global” totals that sum every tenant’s orders, and no closure bulletin that aggregates more than one establishment.

**Isolation** is usually done by:

- Storing an **establishment_id** on each row (e.g. `orders.establishment_id`), and
- Every query that reads or writes orders (or other tenant data) **filtering by that establishment**.

If a query does **not** filter by establishment, it can see (or aggregate) data from **all** establishments — that’s a **multi-tenancy violation**.

---

## 2. What was wrong?

The **closure** code builds a **closure bulletin**: a summary of all completed/paid orders in a period (totals, VAT breakdown, payment methods, etc.) for legal/compliance.

It did:

```sql
SELECT * FROM orders
WHERE created_at >= $1 AND created_at <= $2
AND status IN ('completed', 'paid')
ORDER BY created_at ASC
```

So it took **every** order in the date range that was completed or paid, **from every establishment**, and aggregated them into **one** bulletin. That meant:

- **Wrong totals**: Bar A’s daily closure included Bar B’s and Bar C’s sales.
- **Wrong compliance**: The bulletin is supposed to reflect one establishment’s activity; it was actually a mix of all.
- **Privacy / isolation broken**: One establishment could effectively see that others had activity (e.g. through totals), and the system was treating all tenants as one.

So the bug was: **no establishment_id filter on orders**, and no notion of “this bulletin belongs to this establishment.”

---

## 3. Why it matters

- **Legally**: Closure bulletins are used for fiscal compliance (e.g. NF 525). They must reflect **one** establishment’s activity, not the sum of all.
- **Operationally**: Each establishment must be able to run and view its own closures without seeing or affecting others.
- **Architecture**: The rest of the app (orders, products, etc.) is scoped by `establishment_id`; the legal closure must follow the same rule.

So the fix is: **scope closure to one establishment** — filter orders by `establishment_id`, and store which establishment each bulletin belongs to.

---

## 4. How we fix it

### 4.1 Scope orders to one establishment

- Every place that fetches orders for a closure must pass an **establishment id** and add:

  `AND establishment_id = $<n>`

  so we only sum that establishment’s orders.

- The **order_items** used for VAT breakdown are already scoped by the list of **order IDs** we got from that filtered orders query, so they are implicitly per-establishment (as long as order_items are tied to those orders).

### 4.2 Store which establishment each bulletin belongs to

- The **closure_bulletins** table must know “this row is for establishment X”:
  - Add an **establishment_id** column (e.g. UUID, FK to `establishments.id`).
- When **inserting** a closure bulletin, set that column.
- When **checking** “does a closure already exist for this period?”, filter by **the same establishment_id** so we don’t mix bulletins across tenants.

### 4.3 Who passes the establishment?

- **Manual closure (API)**  
  The user is logged in and has an establishment (e.g. `req.user.establishment_id`). Use that. If the user has no establishment (e.g. system admin), the API can require an explicit establishment or return 400 so we never create a “global” closure by mistake.

- **Automatic closure (scheduler)**  
  There is no “current user”. The scheduler must run closure **per establishment** (e.g. fetch all establishments, then for each call “create daily closure for this date and this establishment_id”). That way each tenant gets its own bulletin and we don’t aggregate across tenants.

### 4.4 Optional: legal_journal per establishment

- Right now **legal_journal** might be global (one sequence, one hash chain). For full multi-tenancy you’d want either:
  - **legal_journal.establishment_id** and filter by it, or  
  - a separate journal per establishment (e.g. per-schema).
- This fix focuses on **closure bulletins and order aggregation**; making the journal itself per-establishment can be a later step. The important part is: **orders used for the closure are filtered by establishment_id**, and **closure_bulletins rows are tied to an establishment**.

---

## 5. Summary of code and DB changes

| What | Change |
|------|--------|
| **closure_bulletins** | Add column **establishment_id** (e.g. UUID, FK to establishments). Migration + use in INSERT and in “exists” check. |
| **ClosureOperations** | Accept **establishmentId** in createDailyClosure, createWeeklyClosure, createMonthlyClosure, createAnnualClosure and in createPeriodClosure. In every orders query, add **AND establishment_id = $n** and pass establishmentId. Pass establishmentId into JournalQueries.closureBulletinExists and insertClosureBulletin. |
| **JournalQueries** | closureBulletinExists(..., establishmentId) and insertClosureBulletin(..., establishmentId); include establishment_id in WHERE and INSERT. getClosureBulletins can optionally filter by establishment_id so the API returns only one tenant’s bulletins. |
| **Routes (legal/closure)** | When creating a closure, use **req.user.establishment_id**; if missing, return 400 (or equivalent) so closure is always scoped. When listing bulletins, filter by same establishment_id. |
| **ClosureScheduler** | Stop calling createDailyClosure once per “system”; instead, **for each establishment** (e.g. from a list of establishments or from per-establishment settings), call createDailyClosure(date, establishmentId). |

Result: each establishment’s closure uses **only that establishment’s orders**, and each bulletin is stored with that **establishment_id**, so there is no cross-tenant aggregation and no multi-tenancy violation.

---

## 6. Implemented details (scheduler, archive, routes)

- **ClosureScheduler** (`utils/closureScheduler.ts`): No longer checks "any daily closure for today" globally. It loads all establishment IDs from `establishments`, then for each calls `LegalJournalModel.createDailyClosure(businessDayDate, establishmentId)`. If a bulletin already exists for that establishment and period, it catches the "already exists" error and continues to the next establishment. Each automatic closure is audited with `establishment_id` in the action details.
- **ArchiveService** (`models/archiveService.ts`): For **DAILY** exports, `generateExportContent` now requires `establishment_id` on `ExportData` and passes it into `createDailyClosure(period_start, establishment_id)`. Callers must supply it so the generated closure bulletin is for a single establishment.
- **Archive route** (`routes/legal/archive.ts`): The `POST /create` handler reads `req.user?.establishment_id` and, for `archiveType === 'DAILY'`, returns 400 if missing. It passes `establishment_id` into `ArchiveService.exportData()` so DAILY archives are always scoped to the user's establishment.
