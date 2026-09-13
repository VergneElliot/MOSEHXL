# 516 — Comptoir without PIN + Z attribution (PLAN)

## Context

Historique « CA par serveur » currently puts all `table_label IS NULL` sales in
**Total comptoir**, so PIN-session comptoir sales never hit an individual Z.
Bar teams also need direct comptoir sales with only the account login (no badge).

## Scope

1. **Attribution:** comptoir + PIN → waiter = PIN identity (individual Z).
   Comptoir without PIN → `waiter_user_id` null → **Total comptoir**.
   Table sales unchanged (owner snapshot; PIN still required).
2. **Report:** Total comptoir = `waiter_user_id IS NULL`; waiter rows = attributed
   sales (table + PIN comptoir).
3. **POS:** add-to-cart / checkout / create order allowed without PIN in comptoir
   only; table mode and floor APIs still require PIN.

## Out of scope

- Changing table ownership / intervene / reassign rules
- Fiscal closures / legal journal structure

## Fiscal impact

PATCH (informative CA attribution + POS UX; journal hash unchanged).
