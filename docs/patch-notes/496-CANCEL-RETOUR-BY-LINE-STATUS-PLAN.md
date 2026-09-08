# 496 — Cancel / retour by line status (PLAN)

## Context

Delete and retour exist in several places (comptoir cart, table draft, table validated,
historique). Staff should freely remove lines with **no kitchen/fiscal status**; once a
line is **validated** or a sale is **encaissée**, cancellation needs the specific permission
`orders_cancel`.

Open tables already always have an assigned owner (create sets `last_served` = opener).

## Target rules

| Context | Gate |
|---------|------|
| Comptoir delete | basic |
| Table draft delete | basic (+ intervene if not owner) |
| Table validated retour | `orders_cancel` (+ intervene) |
| Abandon with only drafts | basic (+ intervene) |
| Abandon with validated | `orders_cancel` (+ intervene) |
| Historique retour | `orders_cancel` (already) |

## Scope

- Harden abandon when validated lines exist (BE + FE step-up).
- Clarify Gestion des utilisateurs label for `orders_cancel`.
- Document matrix in `pos-and-floor-service` skill.

## Fiscal impact

**PATCH** — permission UX / enforcement only; journal path for paid cancel unchanged.
