# 508 — Empty open-ticket shells vs free tables (PLAN)

## Context

Plan de salle showed tables as **Libre** (`has_validated_items = false`) while an
empty `open_tickets` row still existed (e.g. after « Laisser ouverte »). The resume
dialog then showed « Ouverte depuis … » with 0 lines, and **Transférer** greys out
those tables because the UI keyed off `open_ticket_id`.

## Goal

A table is **free** when no draft/validated order lines live on it. Empty ticket
shells must not block transfer, must not look « opened » in the resume dialog, and
should be cleaned up when leaving a table with no remaining lines.

## Approach

1. Add `has_active_items` to `GET /floor/status`.
2. Transfer / merge / map colors use active lines, not mere open-ticket presence.
3. Discard-drafts / last retour / transfer-onto-empty cancel empty shells.
4. `POST /floor/tickets` reuses an empty shell instead of 409.

## Verification

- [ ] Unit: occupancy helpers, transfer empty-target
- [ ] Route: open reuses empty; conflict when lines exist
- [ ] Manual: empty Libre table → resume « Table libre »; transfer allowed

## Fiscal impact

MINOR (non-ISCA UX / floor ops).
