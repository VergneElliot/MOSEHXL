# 296 — P3-L8 closure bulletin vs journal SALE reconciliation (plan)

## Objective

Add a deterministic reconciliation step between closure bulletin totals (order-derived) and legal journal `SALE` aggregates, then persist discrepancy flags for compliance review.

## Scope

### In scope

- Compute `SALE` summary from `legal_journal` per closure period/establishment.
- Compare closure totals against journal totals and derive a reconciliation status.
- Persist reconciliation facts (`ok` + details + journal totals) in `closure_bulletins`.
- Keep closure creation non-blocking while exposing discrepancy evidence.

### Out of scope

- Retroactive backfill of historical bulletins.
- Automatic remediation of journal/order divergence.

## Design decisions

1. Reconciliation is tenant-scoped and period-scoped.
2. Reconciliation checks:
   - transaction count (`orders` vs journal `SALE` count),
   - amount (`total_amount` vs sum of journal `SALE.amount`),
   - VAT (`total_vat` vs sum of journal `SALE.vat_amount`).
3. Closure creation remains allowed when mismatch exists; mismatch is explicitly flagged and stored.

## Verification plan

- Backend type-check.
- Closure route and scheduler regression tests.
- Full backend suite.
- Apply migration locally.
