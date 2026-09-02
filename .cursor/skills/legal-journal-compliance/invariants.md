# Legal Journal Invariants (H1–H15)

**Never violate these.** DB triggers enforce many; application must enforce the rest.

| # | Invariant | Enforcement |
|---|-----------|-------------|
| H1 | No UPDATE/DELETE/TRUNCATE on `legal_journal` in production | DB triggers |
| H2 | Append-only corrections — never edit a SALE | Application design |
| H3 | Per-establishment contiguous sequence (MAX+1) | SERIALIZABLE txn + INSERT trigger |
| H4 | Hash chain continuity — `previous_hash` matches prior `current_hash` | INSERT trigger |
| H5 | Hash payload matches stored values at insert (4dp amounts, UTC ISO) | INSERT trigger + app |
| H6 | Fail-closed fiscal writes — abort order/change/cancel if journal fails | orderCreationService compensating delete |
| H7 | Closure bulletin + journal CLOSURE are atomic | closure routes + scheduler rollback |
| H8 | Closed closure bulletins immutable — only annulment stamp allowed | `prevent_closed_bulletin_modification` trigger |
| H9 | Annulment is one-way — void stamp cannot be cleared | DB trigger |
| H10 | No rounding before persist — DECIMAL(12,4) | Schema + closure sums |
| H11 | Tenant isolation — always scope by `establishment_id` | SQL WHERE + RLS |
| H12 | `legal_invoices` immutable once created | `legal_invoices_immutable_trigger` |
| H13 | Archive signing requires `ARCHIVE_SECRET_KEY` in prod | archiveService |
| H14 | `journalDevReset` forbidden in production | NODE_ENV guard |
| H15 | Never disable immutability triggers for routine backup/export | Operational controls doc |

## Transaction types

| Type | Sign | Typical writer |
|------|------|----------------|
| SALE | + | orderCreationService |
| REFUND | − | orderCancellationService |
| CHANGE | ± | orderChange.ts |
| CLOSURE | bulletin totals | closure routes, ClosureScheduler |
| CORRECTION | 0 | softwareEventJournal |
| ARCHIVE | 0 | rare; system init |

## Danger zones for agents

1. **Hash format changes** — update INSERT trigger, append path, and verifier era matrix together.
2. **Trigger vs app hash** — trigger uses `amount::text`; app uses `toFixed(4)` — must stay aligned.
3. **Migrations** may temporarily drop triggers — must recreate before prod deploy.
4. **DAILY archive export** uses UTC midnight window, not business-day cut — different from closure periods.
