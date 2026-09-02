---
name: legal-journal-compliance
description: >-
  French fiscal legal journal, hash chain, closure bulletins, archives, and
  business-day logic for MOSEHXL/MuseBar. Use when modifying legal_journal,
  closures, refunds, order completion, journal verify, archive exports, invoices,
  business-day cut, or any ISCA compliance code.
---

# Legal Journal Compliance

MOSEHXL implements Article 286-I-3 bis CGI pillars (ISCA). **Does not claim NF525/LNE certification.**

## Write path decision tree

```
Order completed (status=completed)?
  → SALE via orderCreationService → LegalJournalModel.logTransaction
  → FAIL-CLOSED: delete order if journal append fails

Cancellation / partial refund?
  → REFUND (negative amount) via orderCancellationService → addEntry('REFUND')

Faire de la monnaie (change)?
  → CHANGE via orderChange.ts

Daily/weekly/monthly/annual closure?
  → Create closure_bulletin → CLOSURE journal entry → finalize (atomic)

Software event (startup, permission change)?
  → CORRECTION via softwareEventJournal.ts
```

**Never** edit an existing SALE. Corrections are new append-only entries.

## Hash chain

- **Algorithm:** SHA-256 chained per `establishment_id`
- **Genesis:** `previous_hash` = 64× `'0'`
- **Payload:** `sequence|type|orderId|amount(4dp)|vat(4dp)|payment|timestamp(UTC ISO)|register_id`
- **Append:** `journalAppend.ts` — `SERIALIZABLE` transaction, max 3 retries on `40001`/`40P01`

```typescript
// MuseBar/backend/src/models/legalJournal/journalAppend.ts
await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
const amountForHash = value.toFixed(4);
const currentHash = JournalSigning.generateHash(dataString, previousHash);
```

## Business day

Source of truth: `MuseBar/backend/src/models/legalJournal/businessDayPeriod.ts`

- Cut time from `closure_settings.daily_closure_time` (default `02:00`)
- Timezone from `closure_settings.timezone` (default Europe/Paris)
- Business day = cut → cut+1day−1ms (not calendar midnight)

## Key files

| Area | Path |
|------|------|
| Append | `backend/src/models/legalJournal/journalAppend.ts` |
| Signing / verify | `backend/src/models/legalJournal/journalSigning.ts` |
| Closures | `backend/src/models/legalJournal/closureOperations.ts` |
| Routes | `backend/src/routes/legal/` |
| Order SALE | `backend/src/services/orders/orderCreationService.ts` |
| Order REFUND | `backend/src/services/orders/orderCancellationService.ts` |
| Archives | `backend/src/models/archiveService.ts` |
| Invoices | `backend/src/routes/legal/invoices.ts` |

## Verification

```bash
GET /api/legal/journal/verify          # per-establishment integrity
GET /api/legal/compliance/status
POST /api/legal/archive/:id/verify       # HMAC + file hash
```

Real-db tests (opt-in): `cd MuseBar/backend && RUN_REAL_DB_TESTS=true npm run test:real-db`

## Before merging fiscal changes

- [ ] Journal append still fail-closed on order create?
- [ ] Closure + CLOSURE entry still atomic?
- [ ] Amounts stored as DECIMAL(12,4), not float?
- [ ] Scoped by `establishment_id` everywhere?
- [ ] CHANGELOG fiscal impact line if fiscal paths touched?
- [ ] No migration disables immutability triggers without recreating them?

## Invariants

See [invariants.md](invariants.md) — **15 non-negotiable rules (H1–H15).**

## Docs

- `docs/course/07-LEGAL-COMPLIANCE.md`
- `docs/legal/self-certification/`
- `docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.md`
