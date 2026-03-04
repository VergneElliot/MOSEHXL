# Fix: Dual Database Pool — Remove Unused config/database Module

This doc explains **why** having two separate database-pool layers was a problem, **how** the app actually uses the database, and **what** we removed so there is a single, clear source of truth for DB connections.

---

## 1. What was there: two pools, one unused

The backend had **two** different ways to talk to PostgreSQL:

1. **The pool the app actually uses**  
   In **`app.ts`**, the app creates a **`pg.Pool`** directly using the validated config from `config/environment.ts`:

   ```ts
   export const pool = new Pool({
     user: config.database.user,
     host: config.database.host,
     database: config.database.database,
     password: config.database.password,
     port: config.database.port,
     ssl: config.database.ssl ? { rejectUnauthorized: true } : false,
     max: config.database.maxConnections,
     idleTimeoutMillis: config.database.idleTimeoutMillis,
     options: '--timezone=Europe/Paris',
   });
   ```

   Every model, route, and service that needs the database **imports `pool` from `app`** (e.g. `import { pool } from '../app'`). So the **real** connection layer is this single `Pool` instance.

2. **A second, unused “database layer”**  
   The **`config/database/`** module (and its re-export file **`config/database.ts`**) defined a whole extra stack:

   - **DatabasePool** — wrapped `pg.Pool` with its own config and event hooks.
   - **DatabaseManager** — singleton that owned a `DatabasePool`, plus stats and health monitoring.
   - **DatabaseStatsManager** — tracked connection counts, query times, etc.
   - **DatabaseHealthMonitor** — ran periodic health checks on the **DatabasePool**’s pool.
   - **types.ts** — interfaces for stats, health, and config.

   That module **created and managed its own Pool** (via `DatabasePool.initialize()`). But **no code anywhere in the app** imported `DatabaseManager`, `DatabasePool`, or anything from `config/database`. So that second pool was never used — it was **dead infrastructure** (~500 lines across 5 files plus types and index).

So we had:

- **One pool** (in `app.ts`) — used everywhere.
- **Another pool** (inside `config/database/`) — never referenced, never used.

That’s the “dual database pool” problem: two ways to get a connection, but only one was wired in.

---

## 2. Why dead infrastructure is a problem

- **Confusion**  
  New (or existing) developers see two “database” things and don’t know which one to use. They might start using `DatabaseManager` and then wonder why the rest of the app doesn’t use it, or they might add features to the wrong layer.

- **Maintenance cost**  
  Unused code still has to be understood when touching nearby code, and it can break (e.g. type or config changes) without any test or route catching it. You pay for code you don’t run.

- **Risk of accidental use**  
  If someone later imports `DatabaseManager` “to be consistent” or for health checks, the app would then have **two** pools — two sets of connections, two connection limits, and potential for subtle bugs (e.g. transactions on one pool and queries on another).

- **Single source of truth**  
  For something as central as the DB connection, you want **one** place that creates and exports the pool. The app already had that in `app.ts`. The duplicate in `config/database/` added no benefit and only noise.

So the fix is: **remove the unused module** and keep the single pool in `app.ts` as the only database connection layer.

---

## 3. How the app uses the database (after the fix)

- **Config**  
  `config/environment.ts` reads env vars and exposes a validated **`config.database`** (host, port, database, user, password, ssl, maxConnections, idleTimeoutMillis). No pool is created there.

- **Pool creation**  
  **`app.ts`** creates **one** `Pool` from `config.database` and exports it:

  ```ts
  export const pool = new Pool({ ... });
  ```

- **Usage**  
  Models, services, and routes that need DB access do:

  ```ts
  import { pool } from '../app';   // or from '../../app' depending on path
  const result = await pool.query('SELECT ...', []);
  const client = await pool.connect();
  ```

There is no second pool and no `DatabaseManager`/`DatabasePool` layer. Health checks, if needed, can be done with a simple `pool.query('SELECT 1')` (e.g. in `/api/health` or a dedicated health route) without a separate monitoring class.

---

## 4. What we removed

We deleted the entire unused stack so that only the `app.ts` pool remains:

| Removed | Description |
|--------|-------------|
| **config/database/DatabaseManager.ts** | Singleton that owned DatabasePool, stats, and health monitor; exposed `getPool()`, `query()`, transactions, `getHealthStatus()`, etc. |
| **config/database/DatabasePool.ts** | Wrapper around `pg.Pool` with its own init, config, and event handlers; created a second Pool. |
| **config/database/DatabaseStats.ts** | DatabaseStatsManager — tracked connection and query stats; used only by the unused pool layer. |
| **config/database/DatabaseHealthMonitor.ts** | Periodic health checks and status for the unused pool. |
| **config/database/types.ts** | Interfaces (DatabaseStats, DatabaseHealthCheck, DatabaseInfo, QueryContext, TransactionCallback). |
| **config/database/index.ts** | Re-exports and `getDatabaseHealth(db)` for the unused DatabaseManager. |
| **config/database.ts** | Top-level re-export of the whole module for “backward compatibility” — nothing used it. |
| **config/database/** (directory) | Removed after deleting the files above (empty directory). |

We verified that **no file** in the codebase (outside `config/`) imported from `config/database` or `config/database.ts`. So removing this module does not break any existing behavior.

---

## 5. Summary

- **Before:** Two pools — one in `app.ts` (used), one in `config/database/` (unused). ~500 lines of dead infrastructure.
- **After:** One pool in `app.ts`, exported and used everywhere. No second pool, no DatabaseManager/DatabasePool/Stats/HealthMonitor.
- **Principle:** For critical shared resources like the DB pool, have a **single source of truth**. Remove unused alternatives so the codebase is clear and no one accidentally uses the wrong layer.

If you later want connection stats or health checks, you can add a small helper that uses the existing `pool` (e.g. `pool.query('SELECT 1')`, or reading `pool.totalCount` / `pool.idleCount` if you need basic metrics) without reintroducing a second pool or a large unused module.
