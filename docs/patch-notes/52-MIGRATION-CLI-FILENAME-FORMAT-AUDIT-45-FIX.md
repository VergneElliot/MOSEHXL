# Fix: Migration CLI Creates Wrong Filename Format (Audit #45)

This doc explains **why** `migration:create` generated filenames that the migration manager could not parse, **what** we changed (timestamp format in `createMigration`), and **how** to keep the two in sync.

---

## 1. What was the problem?

The **migration manager** (`migration-manager.ts`) only parses files whose names match this regex:

```ts
/^(\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2})_(.+)\.sql$/
```

So the expected format is: **`YYYY_MM_DD_HH_MM_SS_name.sql`** (e.g. `2026_02_26_01_00_00_my_migration.sql`).

The **create** path in the same file was generating the timestamp like this:

```ts
const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
```

- `toISOString()` returns something like `"2026-03-05T14:30:00.123Z"`.
- After `replace(/[-:]/g, '')` you get `"20260305T143000.123Z"`.
- After `split('.')[0]` you get **`20260305T143000`** (no underscores, and a **`T`** in the middle).

So the created file was named e.g. **`20260305T143000_my_migration.sql`**, which **does not** match the regex (the parser expects underscores between each number segment, and no `T`). Result:

- **Created migrations were never parsed** and never showed up in status/migrate.
- Confusing for anyone running `npm run migration:create <name>` and then `migration:migrate` or `migration:status`.

---

## 2. What was changed

In **`migration-manager.ts`**, in **`createMigration(name: string)`**:

- **Before:**  
  `timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]`  
  → produced `20260305T143000`.

- **After:**  
  Build the timestamp explicitly in **`YYYY_MM_DD_HH_MM_SS`** using UTC components of `new Date()` and zero-padding:

  ```ts
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${d.getUTCFullYear()}_${pad(d.getUTCMonth() + 1)}_${pad(d.getUTCDate())}_${pad(d.getUTCHours())}_${pad(d.getUTCMinutes())}_${pad(d.getUTCSeconds())}`;
  ```

  So created filenames look like **`2026_03_05_14_30_00_my_migration.sql`**, which **matches** the parser regex.

- **UTC** is used so that the same moment produces the same filename regardless of the developer’s local timezone (consistent with typical migration timestamps).

A short comment was added above `createMigration` noting that the filename must match the `parseMigrationFile` regex (audit #45).

---

## 3. How to verify

1. Run:  
   `npm run migration:create test_audit_45`  
   (or any name) from `MuseBar/backend`.
2. Check the new file in `migrations/files/`: the name should be like **`2026_03_05_14_30_00_test_audit_45.sql`** (underscores, no `T`).
3. Run:  
   `npm run migration:status`  
   The new migration should appear in the list (e.g. PENDING). If it does, the parser is accepting the new format.
4. You can delete the test migration file afterward if you don’t need it.

---

## 4. Summary

| Before (audit #45) | After |
|--------------------|--------|
| `toISOString().replace(...).split('.')[0]` → `20260305T143000` | Explicit `YYYY_MM_DD_HH_MM_SS` with `getUTC*` and `padStart(2, '0')` |
| Created file: `20260305T143000_name.sql` (not parsed) | Created file: `2026_03_05_14_30_00_name.sql` (parsed) |
| New migrations invisible to status/migrate | New migrations are listed and can be run |

The migration CLI now creates filenames in the same format that the migration manager expects.
