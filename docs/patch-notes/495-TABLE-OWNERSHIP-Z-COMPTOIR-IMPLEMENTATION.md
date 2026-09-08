# 495 — Table ownership, intervene, and Z / Total comptoir (IMPLEMENTATION)

## What shipped

### Ownership (backend floor)

- `OpenTicketModel.touchActivity` updates `updated_at` only; print-suivre uses it (no
  `last_served` steal). Abandon no longer rewrites ownership.
- `requireOpenTicketForActor` centralizes load + `assertCanInterveneOnTicket` for mutate
  routes (items, validate, abandon, close, à suivre, transfer/merge/move, etc.).
- `POST .../takeover` removed; ownership transfer is **Assigner à** only
  (`assign-waiter` / `pos_reassign_waiter`).

### Sales attribution

- FE: table cart → `waiter_*` = table owner; comptoir → null waiter + null `table_label`.
- POST `/orders`: when `table_label` is null, force `waiter_user_id` /
  `waiter_display_name` null (never fall back to PIN actor for Z).

### Total comptoir

- `queryWaiterDayReport`: table rows (`table_label IS NOT NULL`) by waiter; single
  comptoir aggregate (`table_label IS NULL`).
- Historique « CA par serveur » shows **Total comptoir** as its own row.

### Frontend

- Shared `useTableInterventionGate` + attribution sync hook.
- Abandon / close paths step-up before mutate; « Prendre en charge » UI removed.
- Intervene copy: addition stays on assigned waiter’s Z; only Assigner à transfers.

## Fiscal impact

**PATCH** — attribution / informative CA only; journal hash unchanged.
