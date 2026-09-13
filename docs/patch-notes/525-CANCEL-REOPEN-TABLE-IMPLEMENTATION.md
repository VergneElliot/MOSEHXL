# 525 — Cancel payment and reopen table (IMPLEMENTATION)

## Delivered

- `reopen_table` on full `POST /orders/payment/cancel-unified`: after REFUND, opens a new
  ticket on the same table and copies lines as validated (fulfillment reset).
- Prefer closed `open_tickets` by `order_id`; fallback resolve `dining_tables` by `table_label`.
- Cancel still succeeds if reopen conflicts (occupied table) — `reopen_error` in response.
- Historique ReturnDialog: « Rouvrir la table… » + CTA « Annuler et rouvrir la table ».
- En cours: identical products with the same fulfillment status are grouped; advance applies
  to the whole group.

## Fiscal impact

PATCH (reopen is operational; journal path unchanged beyond existing cancel REFUND).
