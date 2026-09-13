# 528 — Reservation email threads + inbound plus-address (PLAN)

## Context

Guest replies to `slug@mosehxl.com` never reach Boîte mail (inbound MX/Parse ops).
Product needs: status/create emails, stored conversation copies, and linking replies to
a specific reservation when one email has several bookings.

## Decisions

- Auto-email: manual create + status confirmed / on_hold / refused (already mostly wired).
- Store outbound copies in `inbox_messages`.
- Link via Reply-To plus-address: `slug+r{reservationId}@mosehxl.com` (not email alone).
- Renaming establishment display name does **not** change `slug` / inbox address.

## Scope

1. Migration: `inbox_messages.reservation_id`, `direction` (inbound|outbound).
2. Parse `slug+rN@` on inbound; set `reservation_id`.
3. Reservation + inbox reply emails use plus-address Reply-To; keep From `slug@`.
4. Persist outbound copies after staff reply and guest status/create mails.
5. Runbook: MX must be fixed for inbound; note on self-hosted SMTP later.

## Out of scope

- Replacing SendGrid with own SMTP (follow-up)
- Fixing `contact@musebar.fr` dial errors (venue MX)

## Fiscal impact

PATCH.
