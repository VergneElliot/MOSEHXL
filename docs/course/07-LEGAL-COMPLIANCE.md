# Chapter 7 — Legal Compliance

This chapter explains the French legal requirements for cashier software and exactly how our system implements them technically. This is the most complex part of the project, so we'll go step by step.

---

## Why Does This Exist?

French law (Article 286-I-3 bis du CGI) requires that any software used for recording sales transactions must be **certified** or comply with specific technical requirements. The goal is to prevent tax fraud — businesses can't secretly delete or modify sales records to underreport income.

The fine for non-compliance is **€7,500 per non-compliant register**. Inspectors can audit your system at any time.

---

## The Four ISCA Pillars

The law defines four properties the software must have. They're known as the **ISCA pillars** (from the French initials):

```
I — Inaltérabilité (Immutability)      "You can't change past records"
S — Sécurisation   (Security)          "You can track who did what"
C — Conservation   (Preservation)       "You keep summary records"
A — Archivage      (Archiving)          "You can export data safely"
```

Let's see how each one works in our code.

---

## Pillar I — Inaltérabilité (Immutability)

### The concept

Every sale, refund, or correction must be recorded in a **legal journal** that cannot be modified or deleted after the fact. If you sell a beer for 6.50€ and record it, that record exists forever. Even if the sale is later cancelled, the cancellation is a new record — the original sale record is never changed.

### The hash chain

This is the clever part. Each journal entry contains a **hash** that depends on the previous entry's hash. Think of it like a chain:

```
Entry 1:  data="SALE|15.00|card"    previous_hash="0000...0000"
          current_hash = SHA256("0000...0000" + "SALE|15.00|card") = "a1b2c3..."

Entry 2:  data="SALE|8.50|cash"     previous_hash="a1b2c3..."
          current_hash = SHA256("a1b2c3..." + "SALE|8.50|cash") = "d4e5f6..."

Entry 3:  data="REFUND|-6.50|card"  previous_hash="d4e5f6..."
          current_hash = SHA256("d4e5f6..." + "REFUND|-6.50|card") = "g7h8i9..."
```

Each entry's hash includes the previous entry's hash. If someone tries to modify entry 1 (change 15.00 to 10.00), entry 1's hash changes, which means entry 2's `previous_hash` no longer matches, which means entry 2's hash is wrong, which breaks entry 3, and so on. **Modifying any entry breaks every entry after it.**

This is the same principle as blockchain (but much simpler — no mining, no distributed network).

### SHA-256

SHA-256 is a **hash function** — it takes any input and produces a fixed-size output (64 hexadecimal characters):

```
SHA256("hello")           = "2cf24dba..."
SHA256("hello!")          = "ce06092f..."  (completely different!)
SHA256("a very long text...") = "abc123..."  (still 64 chars)
```

Properties:
- Same input always gives same output (deterministic)
- Even a tiny change in input gives a completely different output (avalanche effect)
- You can't reverse it — given the hash, you can't find the input
- It's extremely unlikely that two different inputs give the same hash

### One journal chain per establishment (multi-tenant)

In production, `legal_journal` has an **`establishment_id`** on every row. **Sequence numbers** and the **hash chain** are independent **per establishment** — tenant A’s sequence 1, 2, 3 has nothing to do with tenant B’s 1, 2, 3. Integrity checks and `MAX(sequence_number)` are always run **in SQL with `WHERE establishment_id = $1`**, so a fiscal review for one bar never includes another bar’s lines.

The DB trigger on **UPDATE/DELETE** still applies in normal running code; only a controlled **migration** may temporarily remove it to add the column, then the trigger is put back (same rule as before: the journal is inalterable in operation).

### How it's implemented

```typescript
// models/legalJournal/journalOperations.ts (simplified)
static async addEntry(establishmentId: string, transactionType, orderId, amount, vatAmount, paymentMethod, ...) {
  // 1. Next sequence number for *this* establishment only
  const sequenceNumber = await JournalQueries.getNextSequenceNumber(establishmentId);

  // 2. Previous entry in the same establishment’s chain
  const lastEntry = await JournalQueries.getLastEntry(establishmentId);
  const previousHash = lastEntry
    ? lastEntry.current_hash
    : '0000000000000000000000000000000000000000000000000000000000000000';

  // 3. Build the data string (pipe-separated values)
  const dataString = `${sequenceNumber}|${transactionType}|${orderId}|${amount}|${vatAmount}|${paymentMethod}|${timestamp}|${registerId}`;

  // 4. Hash: SHA256(previousHash + "|" + dataString)
  const currentHash = JournalSigning.generateHash(dataString, previousHash);

  // 5. Persist with establishment_id (and the trigger still blocks UPDATE/DELETE)
  return await JournalQueries.insertEntry(
    establishmentId, sequenceNumber, transactionType, orderId, amount, vatAmount,
    paymentMethod, transactionData, previousHash, currentHash, timestamp, userId, registerId
  );
}
```

```typescript
// models/legalJournal/journalSigning.ts
static generateHash(dataString: string, previousHash: string): string {
  const content = `${previousHash}|${dataString}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

### The integrity check

To verify no entries have been tampered with, we load **all rows for one establishment** ordered by `sequence_number`, then recompute every hash and check chain continuity. There is no global “all tenants” report — verification is always **`verifyJournalIntegrity(establishmentId)`** (see `journalSigning.ts`).

```typescript
// models/legalJournal/journalSigning.ts (logic outline)
static async verifyJournalIntegrity(establishmentId: string) {
  const result = await pool.query(
    `SELECT * FROM legal_journal WHERE establishment_id = $1 ORDER BY sequence_number ASC`,
    [establishmentId]
  );
  const entries = result.rows;
  const errors: string[] = [];
  // ... recompute each hash, compare to entry.current_hash, check previous_hash links ...
  return { isValid: errors.length === 0, errors };
}
```

### The database trigger

Even with the hash chain, someone with database access could theoretically modify an entry AND recompute all subsequent hashes. The trigger prevents even that:

```sql
CREATE TRIGGER trigger_prevent_legal_journal_modification
    BEFORE UPDATE OR DELETE ON legal_journal
    FOR EACH ROW
    EXECUTE FUNCTION prevent_legal_journal_modification();
-- This BLOCKS any UPDATE or DELETE on the legal_journal table
```

The trigger runs at the PostgreSQL level — even if someone bypasses our application code and connects directly to the database, they can't modify entries.

---

## Pillar S — Sécurisation (Security)

### The concept

Every significant action must be logged with who did it, when, from where, and what they did. This creates an **audit trail** — a history of all operations.

### What's logged

```
┌──────────────────┬──────────────────────────────────────────────────────┐
│ Action Type      │ When it's logged                                     │
├──────────────────┼──────────────────────────────────────────────────────┤
│ LOGIN            │ User successfully logs in                            │
│ LOGIN_FAILED     │ Invalid email or password                            │
│ LOGOUT           │ User logs out                                        │
│ CREATE_USER      │ Admin creates a new user                             │
│ SET_PERMISSIONS  │ Admin changes user permissions                       │
│ CREATE_ORDER     │ New order is created (sale)                          │
│ CANCEL_ORDER     │ Order is cancelled                                   │
│ RETOUR_ITEM      │ Item is returned                                     │
│ TOKEN_REFRESH    │ JWT token is refreshed                               │
│ AUTH_FAILED      │ Invalid or missing token on a request                │
└──────────────────┴──────────────────────────────────────────────────────┘
```

### How it's implemented

```typescript
// models/auditTrail.ts (simplified)
// Rows include establishment_id: passed explicitly or resolved from the acting user's users.establishment_id
await pool.query(`
  INSERT INTO audit_trail (
    user_id, action_type, resource_type, resource_id,
    action_details, ip_address, user_agent, session_id, establishment_id
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
`, [ ... , establishment_id ]);
```

Each entry records:
- **Who**: `user_id` — which user did this
- **What**: `action_type` — what action (LOGIN, CREATE_ORDER, etc.)
- **Which**: `resource_type` + `resource_id` — which resource was affected (ORDER #42)
- **Tenant**: `establishment_id` — which establishment the event belongs to (for filtering in multi-tenant audits)
- **Details**: `action_details` — JSON with full context (items, amounts, reason)
- **Where**: `ip_address` + `user_agent` — the user's IP and browser info
- **When**: `timestamp` — automatically set by PostgreSQL

---

## Pillar C — Conservation (Preservation)

### The concept

At regular intervals (daily, monthly, annually), you must create a **closure bulletin** — a summary of all transactions in that period. Think of it as a daily receipt for the whole register. It captures:

- Total number of transactions
- Total amount (TTC)
- Total VAT (broken down by rate — 10%, 20%, etc.)
- Payment method breakdown (how much in cash, how much by card)
- First and last journal sequence numbers in the period

### The closure bulletin

```typescript
// A closure bulletin looks like this in the database:
{
  id: 1,
  closure_type: 'DAILY',
  period_start: '2026-02-25 02:00:00',
  period_end: '2026-02-26 01:59:59',
  total_transactions: 47,
  total_amount: 1234.50,
  total_vat: 205.75,
  vat_breakdown: {
    "10": { "subtotal_ht": 300.00, "vat": 30.00 },    // 10% rate: soft drinks, food
    "20": { "subtotal_ht": 879.75, "vat": 175.75 }     // 20% rate: alcohol
  },
  payment_methods_breakdown: {
    "card": 850.00,
    "cash": 384.50
  },
  first_sequence: 101,
  last_sequence: 147,
  closure_hash: "abc123...",   // integrity hash for this bulletin
  is_closed: true,
  closed_at: '2026-02-26 02:00:05'
}
```

### Automatic daily closure

The `ClosureScheduler` in `utils/closureScheduler.ts` runs automatically in production. It checks every minute whether it's past the closure time (configurable, default 02:00 Paris time). When it is, it creates the daily closure bulletin for the previous business day.

### Business day concept

A bar's business day doesn't end at midnight — it ends at closing time (2 AM by default). So the business day "February 25" runs from 2:00 AM on the 25th to 1:59 AM on the 26th. This is why the closure time is configurable in `closure_settings`.

---

## Pillar A — Archivage (Archiving)

### The concept

All data must be exportable in a format that can be given to inspectors. The export must include a digital signature or hash to prove it hasn't been modified after creation.

### How it's implemented

The `ArchiveService` in `models/archiveService.ts` can export data to CSV, XML, PDF, or JSON. Each export:

1. Is tied to an **`establishment_id`** in `archive_exports` (and to the same tenant’s legal data when the export builds on closures or the journal).
2. Writes a file, computes a SHA-256 hash, and stores metadata including the hash and signature.

**API rule:** there is **no** “list all establishments’ exports.” List and get-by-id require an authenticated user **with** an `establishment_id` and use **only** that tenant in SQL (`WHERE establishment_id = $1`). A platform `system_admin` user without a tenant does not receive a cross-tenant dump — they are not a substitute for an on-site inspection account at the bar.

If an inspector receives the file, they can recompute the hash and verify it matches the stored hash.

---

## Transaction Types in the Legal Journal

| Type | When | Amount | Example |
|------|------|--------|---------|
| `SALE` | Customer pays for items | Positive | +15.00€ for 2 beers |
| `REFUND` | Customer returns an item or order is cancelled | Negative | -6.50€ for 1 returned beer |
| `CORRECTION` | System correction (rare) | Either | Rounding adjustment |
| `CLOSURE` | Daily/monthly closure created | 0 | Summary of the day's transactions |
| `ARCHIVE` | System event (init, export) | 0 | "Legal journal initialized" |

**Key rule**: we never modify a `SALE` entry. If a sale is reversed, we add a new `REFUND` entry. The original sale remains. This is why the system has both positive and negative amounts.

---

## VAT (TVA) Rates

In France, there are different VAT rates:

| Rate | Applies to | Example products |
|------|-----------|-----------------|
| 20% | Alcohol, most goods | Beer, wine, cocktails |
| 10% | Non-alcoholic drinks, food | Coca-Cola, chips, coffee |
| 5.5% | Basic food items | Bread, milk (not used in a bar typically) |

Each product in our system has a `tax_rate` field. When we create an order, we calculate the tax per item:

```
Item: Heineken 33cl
Price TTC (all taxes included): 6.50€
Tax rate: 20% = 0.20
Tax amount: 6.50 × 0.20 / (1 + 0.20) = 6.50 × 0.20 / 1.20 = 1.08€
Price HT (before tax): 6.50 - 1.08 = 5.42€
```

The closure bulletin aggregates these by rate so inspectors can see total revenue and VAT at each rate.

---

## Register ID

Each cash register has a unique identifier (`MUSEBAR-REG-001`). This is stamped on every legal journal entry and every receipt. It allows inspectors to trace which register produced which transactions. If a business has multiple registers, each has its own journal.

---

## Receipts — Legal Requirements

French law requires receipts to contain specific information:

```
┌────────────────────────────────────────────┐
│           MUSEBAR                           │
│    123 Rue Example, 75001 Paris             │
│    SIRET: 12345678900012                    │
│    TVA: FR12345678900                       │
│                                             │
│    Date: 25/02/2026 17:30                   │
│    Ticket #: 000042                         │
│    Registre: MUSEBAR-REG-001                │
│                                             │
│    2x Heineken 33cl      13.00€             │
│    1x Coca Cola 33cl      4.00€             │
│    ──────────────────────────────            │
│    Sous-total HT:        14.17€             │
│    TVA 20%:               2.17€             │
│    TVA 10%:               0.36€             │
│    ──────────────────────────────            │
│    TOTAL TTC:            17.00€             │
│    Paiement: Carte bancaire                 │
│                                             │
│    Hash: a1b2c3d4e5f6...                    │
│    Réf légale: Art. 286-I-3 bis du CGI      │
└────────────────────────────────────────────┘
```

The receipt hash ties the receipt to the legal journal entry, making the chain of evidence complete.

---

## How It All Connects

```
Customer                                                    Inspector
   │                                                            │
   │  "2 beers please"                                         │
   │                                                            │
   ▼                                                            │
┌─────────────────┐                                            │
│ 1. Order created │ → INSERT INTO orders                      │
│                  │ → INSERT INTO order_items                  │
│                  │                                            │
│ 2. Legal journal │ → INSERT INTO legal_journal               │
│    entry created │   (SALE, 15.00€, hash chain)              │
│                  │                                            │
│ 3. Audit trail   │ → INSERT INTO audit_trail                 │
│    logged        │   (CREATE_ORDER, user, IP, details)       │
│                  │                                            │
│ 4. Receipt       │ → Printed/displayed with hash             │
│    generated     │                                            │
└─────────────────┘                                            │
                                                                │
... later that night at 2AM ...                                │
                                                                │
┌──────────────────┐                                           │
│ 5. Daily closure │ → INSERT INTO closure_bulletins           │
│    auto-created  │   (totals, VAT breakdown, payment split)  │
│                  │   → INSERT INTO legal_journal (CLOSURE)   │
└──────────────────┘                                           │
                                                                │
... months later ...                                           │
                                                                │
┌──────────────────┐                                           │
│ 6. Archive export│ → Create CSV/JSON file                    │
│    created       │ → SHA-256 hash of file                    │
│                  │ → INSERT INTO archive_exports              │
│                  │                                            ▼
│                  │                              ┌──────────────────────┐
│                  │ ────── file + hash ────────► │ Inspector verifies:  │
│                  │                              │  - Hash chain valid  │
│                  │                              │  - Closures exist    │
│                  │                              │  - File hash matches │
│                  │                              │  - Receipts match    │
└──────────────────┘                              └──────────────────────┘
```

---

## Pricing and TVA (TTC)

In France, **displayed prices are always TTC** (toutes taxes comprises — all tax included). When you set a product at 8€, the customer pays 8€; the 10% or 20% TVA is already included in that amount.

- **Product price in the DB and in the POS** is TTC. The two tax rates used are 10% (e.g. non-alcoholic) and 20% (e.g. alcohol).
- **Cart line totals** are TTC: `unitPrice * quantity`. The tax component for each line is derived for reporting only: `taxAmount = totalPrice * (taxRate / (1 + taxRate))`.
- **Order total** (amount due) = sum of line totals (TTC). The sum of `taxAmount` across items is **not** added on top — it is only used for the legal breakdown (Sous-total HT, TVA, Total TTC) and for journal/closure records.

In the code, `usePOSLogic` exposes `orderSubtotal` (sum of line TTC totals), `orderTax` (sum of tax components), and `orderTotal`. For French TTC, **orderTotal = orderSubtotal**; `orderTax` is for display and compliance only.

### Tax and rounding (accounting vs display)

For **display** (UI, receipts, closure printouts), amounts and TVA are shown rounded to 2 decimals (e.g. `formatCurrency`, `.toFixed(2)`).

For **accounting and legal compliance**, we store **exact** values so that week/month/year closures sum to the true totals:

- **Database**: Monetary and tax columns use `DECIMAL(12,4)` (orders, order_items, legal_journal, closure_bulletins) so that the exact tax per line and per order is stored. Summing these values gives the correct period totals without rounding drift.
- **Frontend**: When adding to cart or updating quantity, `taxAmount` is computed with full precision and sent to the API **without rounding**. Rounding is applied only when rendering (e.g. `formatCurrency(orderTax)`).
- **Closure bulletins**: Totals and VAT breakdown are computed from stored order/order_items values (exact sums). The bulletin stores these exact numbers; printing/export services round to 2 decimals for human-readable output.

Never round tax or sale amounts before persisting; round only for display.

---

## Summary

| Pillar | Mechanism | Tables | Code |
|--------|-----------|--------|------|
| **I** Immutability | SHA-256 hash chain + DB trigger | `legal_journal` | `legalJournal/journalSigning.ts`, `journalOperations.ts` |
| **S** Security | Action logging with user/IP/details and **establishment** where applicable | `audit_trail` | `models/auditTrail.ts`, logged in every route |
| **C** Conservation | Periodic summary bulletins | `closure_bulletins`, `closure_settings` | `legalJournal/closureOperations.ts`, `utils/closureScheduler.ts` |
| **A** Archiving | Signed file exports | `archive_exports` | `models/archiveService.ts` |

| Concept | What it is | Why it matters |
|---------|-----------|----------------|
| Hash chain | Each entry's hash includes the previous hash | Tamper detection — changing one entry breaks the chain |
| SHA-256 | Cryptographic hash function | Irreversible, deterministic, collision-resistant |
| Trigger | Database-level UPDATE/DELETE blocker | Even direct DB access can't modify entries |
| Closure bulletin | Period summary (daily/monthly/annual) | Required by law for reconciliation |
| Business day | 2AM to 2AM (not midnight to midnight) | Matches actual bar operating hours |
| VAT breakdown | Totals by tax rate (10%, 20%) | Inspectors verify VAT declarations match records |
| Register ID | Unique ID per cash register | Traces transactions to specific physical registers |
