# 523 — Plan de salle resume: fulfillment + qty + group (IMPLEMENTATION)

## Delivered

- Resume dialog chips/ages: Non validé / Validé / Envoyé / Servi (reads `kitchen_sent_at` /
  `served_at` from GET ticket).
- Qty as integer units (`1×`, `2×`).
- Identical products with the same display status are grouped (qty + TTC summed; age from
  earliest step timestamp).
- Footer counts: non validé / validé / envoyé / servi.

## Fiscal impact

PATCH (consult UI only).
