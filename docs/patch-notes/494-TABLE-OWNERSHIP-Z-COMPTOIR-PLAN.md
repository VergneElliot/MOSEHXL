# 494 — Table ownership, intervene, and Z / Total comptoir (PLAN)

## Context

Table ownership and CA-par-serveur attribution drifted: à suivre / takeover could steal
`last_served_by_user_id`, comptoir pays inflated individual Z, and intervene UX claimed Z
stayed with the owner while attribution could follow the intervening PIN.

## Target model

- **Owner** = PIN that opens the table (`open_tickets` create); live field =
  `last_served_by_user_id`. `opened_by_user_id` is historical only.
- **Intervene** (`pos_intervene_table`): act on another’s table; **no** ownership or Z move.
- **Reassign** (`pos_reassign_waiter` / Assigner à): sole ownership + future Z transfer.
- **Comptoir**: `table_label` null → `waiter_user_id` null → **Total comptoir** in CA report;
  account + PIN session still traced.

## Scope

1. Backend floor: `touchActivity` (no ownership write); gate abandon/close/à suivre; remove
   takeover route/UI.
2. Sales attribution: table → owner; comptoir → null waiter.
3. Waiter-day report + Historique UI: Total comptoir row.
4. FE intervene consistency on abandon/close; skill + CHANGELOG.

## Fiscal impact

**PATCH** — reporting / attribution only; legal journal hash chain unchanged.

## Out of scope

Fiscal closure bulletin waiter breakdown; renaming `opened_by` / new `owner_user_id` column.
