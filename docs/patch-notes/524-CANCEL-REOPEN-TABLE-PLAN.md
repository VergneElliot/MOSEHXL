# 524 — Cancel payment and reopen table (PLAN)

## Context

Mistaken full payment on a table requires Historique annulation (REFUND) then
manually rebuilding the order. Staff need « Annuler et rouvrir la table ».

## Constraints

- Fiscal cancel stays append-only REFUND via existing `cancel-unified` (never edit SALE).
- Reopen is a **new** open ticket + copied lines (closed ticket stays closed with `order_id`).
- Full cancel only; partial retour does not reopen.
- If the table is already occupied, cancel still succeeds; reopen reports a conflict.

## Scope

1. After successful full `cancel-unified`, optional `reopen_table: true`.
2. Resolve closed ticket by `order_id` (fallback: `table_label` → dining table).
3. Open/reuse empty ticket; copy prior ticket lines as **validated** (fulfillment reset).
4. Historique ReturnDialog checkbox when the order has a table label.
5. En cours: group identical products (same status) like Plan de salle resume.

## Fiscal impact

PATCH (operational reopen after existing REFUND path; journal unchanged beyond cancel).
