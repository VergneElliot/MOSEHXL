# Fix: N+1 Query in setUserPermissions (Audit #35)

This doc explains **why** the original `setUserPermissions` implementation was a classic N+1 query problem, **what** we changed (single INSERT...SELECT in a transaction), and **how** batch queries and transactions work so you can spot and fix similar issues elsewhere.

---

## 1. What was the problem?

In `models/user.ts`, `setUserPermissions(userId, permissions)` did the following:

1. **One** `DELETE FROM user_permissions WHERE user_id = $1` to clear existing permissions.
2. **For each** permission name in `permissions`:
   - **One** `SELECT id FROM permissions WHERE name = $1` to resolve the name to an ID.
   - **One** `INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2)` to link the user to that permission.

So for **N** permissions, the total number of round-trips to the database was:

- **1** (DELETE) + **N** (SELECT) + **N** (INSERT) = **2N + 1** queries.

That pattern is called an **N+1 query** (or here, 2N+1): one “setup” query plus a loop that does multiple queries per item. The “1” often refers to the initial query that drives the loop; here we also have one DELETE, so 2N+1 total.

### Why this is bad

- **Latency:** Each query has a round-trip (network + DB). With 10 permissions that’s 21 round-trips instead of 2.
- **Load:** The database parses, plans, and executes 21 statements instead of 2.
- **No atomicity:** The original code did not run inside a transaction. If the process crashed after some INSERTs, the user could end up with a partial set of permissions (inconsistent state).

So we had **performance** and **consistency** issues.

---

## 2. Core concepts

### 2.1 N+1 queries

An **N+1 query** happens when:

1. You run one query (e.g. “get all X”).
2. For each row, you run another query (e.g. “get details for this X”).

So you do **1 + N** (or more generally, a small number + N) queries instead of one or two batched queries. It’s one of the most common performance anti-patterns in backends.

**How to spot it:** Look for loops that contain `await pool.query(...)` (or any DB call). If the loop size depends on data (e.g. number of permissions), you likely have an N+1.

**Fix direction:** Replace the loop with a single (or few) query that works on **sets**: e.g. `INSERT ... SELECT`, `WHERE id = ANY($1)`, or a single query that returns all needed rows and then process in memory.

### 2.2 Batch operations with INSERT...SELECT

Instead of:

- SELECT id for permission A → INSERT (user, id_A)  
- SELECT id for permission B → INSERT (user, id_B)  
- …

we can do:

- **One** INSERT that gets permission IDs from the `permissions` table and inserts into `user_permissions` in a single statement:

```sql
INSERT INTO user_permissions (user_id, permission_id)
SELECT $1, p.id FROM permissions p WHERE p.name = ANY($2::text[]);
```

Here, `$1` is the user ID and `$2` is the array of permission names (e.g. `['pos:create_order', 'menu:edit']`). PostgreSQL’s `ANY($2::text[])` means “where `p.name` is in the given array.” So we resolve all names to IDs and insert all pairs in **one** round-trip. The database does the join and insert in a single operation.

### 2.3 Transactions (BEGIN / COMMIT / ROLLBACK)

A **transaction** groups several statements so that they either **all** succeed or **all** are undone:

- **BEGIN** — start a transaction.
- **COMMIT** — make all changes since BEGIN permanent.
- **ROLLBACK** — discard all changes since BEGIN.

If we **DELETE** and then **INSERT** without a transaction, and the process crashes (or throws) after the DELETE but before the INSERT completes, the user could end up with **no** permissions. If we **COMMIT** after only some INSERTs, we could leave partial data. Wrapping both in a transaction guarantees: after COMMIT, the user has exactly the new set; on any failure we ROLLBACK and leave the previous set unchanged.

**In code:** Use a single **client** from the pool (so all queries run on the same connection), run `BEGIN`, then your DELETE and INSERT, then `COMMIT`, and in a `catch` block run `ROLLBACK` and rethrow. Always **release** the client in a `finally` block so it goes back to the pool.

---

## 3. What we changed

**File:** `MuseBar/backend/src/models/user.ts` — method `setUserPermissions`.

| Before | After |
|--------|--------|
| 1 DELETE + N SELECTs + N INSERTs (2N+1 queries) | 1 DELETE + 1 INSERT...SELECT (2 queries) when `permissions.length > 0`; only 1 DELETE when empty |
| No transaction | Single transaction (BEGIN → DELETE → INSERT → COMMIT; on error ROLLBACK) |
| Loop over permission names, query and insert one by one | One INSERT...SELECT with `WHERE p.name = ANY($2::text[])` and the array of names |

**Behaviour preserved:**

- Invalid permission names (not present in `permissions`) are still ignored: the INSERT...SELECT only inserts rows for names that exist in `permissions`.
- Empty `permissions`: we only run the DELETE, so the user ends up with no permissions.

**Implementation details:**

- We use `pool.connect()` to get a dedicated client, run BEGIN/DELETE/INSERT/COMMIT (or ROLLBACK on error), and `client.release()` in `finally`.
- The second parameter to the INSERT...SELECT is the JavaScript array `permissions`; node-pg serializes it as a PostgreSQL array, and `$2::text[]` in the SQL tells PostgreSQL to treat it as an array of text for the `ANY` predicate.

---

## 4. How to verify

- **Functionally:** Call the API that updates a user’s permissions (e.g. PATCH/PUT user with a new permission list). Confirm the user’s permissions match the list you sent; try with 0, 1, and several permissions, and with one invalid name (should be ignored).
- **Behaviour under failure:** In development you could temporarily throw after DELETE and before COMMIT; after restart, the user’s permissions should be unchanged (ROLLBACK semantics).
- **Performance:** Under load, compare latency of updating a user with many permissions before vs after; you should see a clear drop in DB round-trips and time.

---

## 5. Summary

| Topic | Takeaway |
|--------|----------|
| **N+1** | Loops that run a query per item cause 1+N (or 2N+1) round-trips; replace with set-based queries (INSERT...SELECT, ANY, etc.). |
| **INSERT...SELECT** | Use one statement to pull IDs (or rows) from one table and insert into another instead of many small queries. |
| **Transactions** | Use BEGIN/COMMIT/ROLLBACK when multiple statements must succeed or fail together; use one client and release it in `finally`. |
| **setUserPermissions** | Now 2 queries in a transaction instead of 2N+1 without a transaction; same behaviour, better performance and consistency. |

**Audit #35:** N+1 in `setUserPermissions` — fixed by batching with INSERT...SELECT and wrapping in a transaction.
