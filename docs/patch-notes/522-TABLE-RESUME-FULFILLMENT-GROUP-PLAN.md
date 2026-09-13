# 522 — Plan de salle resume: fulfillment + qty + group (PLAN)

## Context

Table resume dialog still shows only draft/validated (« Validée ») and ignores
`kitchen_sent_at` / `served_at` updated from Historique En cours. Qty renders as
`1.000×` from numeric PG/decimal. POS cart keeps lines ungrouped for per-line
actions; resume is consult-only and should group identical products.

## Scope

1. Resume chips/ages: Non validé / Validé / Envoyé / Servi / Annulée (same pipeline as En cours).
2. Qty display: integer units (`1×`, `2×`), no three-decimal padding.
3. Group lines by product identity + same display status (+ same unit price / options when present).
4. Summary counts reflect fulfillment stages.

## Out of scope

- Changing POS cart grouping
- Fulfillment actions inside the resume dialog

## Fiscal impact

PATCH (UI / consult display only).
