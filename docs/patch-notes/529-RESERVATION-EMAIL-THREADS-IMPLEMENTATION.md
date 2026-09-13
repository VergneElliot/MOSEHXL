# 529 — Reservation email threads + inbound plus-address (IMPLEMENTATION)

## Delivered

- `inbox_messages.reservation_id` + `direction` (inbound|outbound); backfill from seeds.
- Guest emails Reply-To `slug+r{id}@mosehxl.com`; inbound parses and links reservation.
- Outbound copies stored for guest status/create mails and staff inbox replies.
- Seed messages linked to reservation after create (public + manual).
- Runbook: rename ≠ slug change; MX checklist; SMTP migration notes.

## Ops still required

MX `mosehxl.com` → `mx.sendgrid.net` + Inbound Parse URL — without this, Gmail replies
never appear in Activity or Boîte mail.

## Fiscal impact

PATCH.
