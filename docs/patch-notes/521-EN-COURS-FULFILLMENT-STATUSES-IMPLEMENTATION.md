# 521 — En cours fulfillment: Validé → Envoyé → Servi (IMPLEMENTATION)

## Delivered

- Migration `served_at` on `open_ticket_items`; clears legacy `kitchen_sent_at` set at validate.
- Validate sets only `validated_at` (no longer stamps `kitchen_sent_at`).
- GET `/floor/ongoing-orders` returns service lines only with counts Validé / Envoyé / Servi.
- POST `/floor/tickets/:id/items/:itemId/fulfillment` `{ status: 'sent' | 'served' }` (PIN).
- Historique « En cours »: chips + chronos + actions Marquer envoyé / Marquer servi.
- POS cart: draft lines no longer show « En attente »; validated still « Validé ».
- Reprise table: « Non validé » instead of « En attente ».

## Fiscal impact

PATCH (operational fulfillment timestamps; legal journal unchanged).
