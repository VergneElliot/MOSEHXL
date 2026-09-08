# 497 — Cancel / retour by line status (IMPLEMENTATION)

## What shipped

- **Already in place:** comptoir / draft delete = basic; validated line retour and historique
  cancel = `orders_cancel` (FE step-up + `requirePinActor` / payment routes); draft sync cannot
  delete validated lines.
- **Abandon gap closed:** `assertCanAbandonTicket` requires `orders_cancel` when the ticket
  still has validated lines; FE `abandonFloorTicket` steps up the same way.
- **Label:** `orders_cancel` → « Annuler / retour (article validé ou vente encaissée) ».
- **Skill:** delete/retour matrix documented; open ticket always assigned on create.

## Fiscal impact

**PATCH** — no ISCA / journal hash change.
