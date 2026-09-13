# 527 — Reservation inbox parity + inbound harden (IMPLEMENTATION)

## Delivered

- Manual/admin reservation create seeds `inbox_messages` and sets `inbox_message_id`
  (`seedReservationInboxMessage`).
- Public create uses the same helper.
- `/api/inbound-email` exempt from global rate limit and 1 MB request-size gate.
- `extractInboxLocalPart` handles SendGrid envelope JSON + display-name `to`.
- Runbook §6: reply incident checklist (Boîte mail vs personal, Parse, Activity).

## Fiscal impact

PATCH (admin/ops).
