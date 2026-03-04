# Fix: SQL Keyword Stripping Corrupts User Data

This doc explains **why stripping SQL keywords from user input is wrong**, **why it doesn’t protect you**, and **how we fixed it** without losing real security.

---

## 1. What was the code doing?

The input sanitization middleware ran on every request and, for every string in the body, query, and params, it:

- Removed certain **SQL keywords** (SELECT, INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, EXEC, UNION) from the text.
- Also removed obvious XSS patterns (e.g. `<script>`, `javascript:`), trimmed whitespace, and limited length.

So for example:

- `"Select Blend Coffee"` → `" Blend Coffee"` (the word “Select” was removed).
- An address containing “DELETE” or “DROP” had those words removed.
- Any product name, note, or field that contained those keywords was **changed** before being saved.

So the code was **altering user data** in the name of “security.”

---

## 2. Why is that a problem?

### 2.1 Corrupting legitimate data

Users have every right to use those words in:

- Product names: “Select Blend Coffee”, “Union Beer”, “Create Your Own Pizza”.
- Addresses, company names, notes, descriptions.

Removing them **silently** corrupts data and confuses users (“I typed ‘Select Blend’ and it saved as ‘Blend’”). There is no security gain that justifies that.

### 2.2 It doesn’t actually prevent SQL injection

**SQL injection** happens when **untrusted input is concatenated into an SQL string** and the database then **parses** that string as SQL. For example:

```ts
// DANGEROUS
const query = `SELECT * FROM users WHERE name = '${req.body.name}'`;
// If name is "'; DROP TABLE users; --", the DB runs that too.
```

**The correct defence** is to **never** build SQL from concatenated user input. Use **parameterized queries** instead:

```ts
// SAFE
const query = 'SELECT * FROM users WHERE name = $1';
await pool.query(query, [req.body.name]);
```

Here the value is sent **as data** (e.g. a bound parameter). The database does **not** interpret it as SQL. So it doesn’t matter if the user types `SELECT`, `DELETE`, or anything else — it is never executed as SQL.

So:

- **Parameterized queries** = real protection against SQL injection.
- **Stripping keywords** = no real protection (attackers can use other syntax, encoding, etc.), and it **damages** valid data.

Once you use parameters everywhere, stripping “SELECT” / “DELETE” / etc. from input adds **zero** security and only causes bugs and data loss.

### 2.3 False sense of security

If developers think “we sanitize SQL in middleware,” they might:

- Assume it’s safe to concatenate input into SQL somewhere (it isn’t).
- Rely on a “magic” layer instead of using parameters consistently.

Real security comes from **never concatenating user input into SQL** and **always** using parameters. The middleware should not pretend to “fix” SQL injection by mutating strings.

---

## 3. What we should do instead

- **Rely on parameterized queries** for all SQL (as in your models and routes). Then user input is never interpreted as SQL, and we don’t need to strip “SQL-like” words.
- **Stop mutating user input** by removing those keywords. Data stays as the user sent it (subject only to length/format rules you explicitly want).
- **Keep** other sanitization that has a clear purpose and doesn’t corrupt normal content, for example:
  - XSS-oriented stripping (e.g. `<script>`, `javascript:`) **if** that input is later rendered in HTML and you want to reduce stored-XSS risk (knowing that proper output encoding is still required).
  - Trim and max length to avoid abuse and storage issues.

So: **remove the SQL-keyword stripping** from input sanitization; keep parameterized queries as the only “SQL injection” defence; keep or refine other sanitization (XSS, length) as needed.

---

## 4. How we fixed it

In `InputSanitization.ts` we:

1. **Removed** the line that stripped the words `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `EXEC`, `UNION` from every string. So `sanitizeString` no longer changes user data based on those keywords.
2. **Removed** the same SQL-keyword pattern from `containsDangerousPatterns`, so we don’t treat those words as “dangerous” for security purposes. (That check wasn’t used to block requests, but keeping it would suggest that those words are a security concern; they aren’t when queries are parameterized.)

We did **not** remove:

- XSS-related replacements (e.g. `<script>`, `javascript:`), trim, or length limit, so you can keep or tune those separately.
- Any of your existing use of **parameterized queries** in the app; that remains the actual protection against SQL injection.

Result: user input is no longer corrupted by SQL keyword stripping, and security continues to rest on **parameterized queries** plus whatever XSS/length rules you keep in sanitization.
