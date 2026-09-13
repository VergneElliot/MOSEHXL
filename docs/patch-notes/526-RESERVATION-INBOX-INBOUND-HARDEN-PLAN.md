# 526 — Reservation inbox parity + inbound harden (PLAN)

## Context

Customer replied to a reservation email; venue saw nothing. Likely causes: inbound
Parse/MX/ops, checking personal mail without autoforward, or soft-failed outbound.
Manual calendar creates also skip the inbox seed that public booking creates.

## Scope

1. Seed `inbox_messages` + `inbox_message_id` on admin/manual reservation create (parity with public).
2. Exempt `/api/inbound-email` from global rate limit and raise/skip 1 MB body size gate.
3. Harden recipient parsing for SendGrid `envelope` JSON.
4. Runbook note: where replies land (Boîte mail vs autoforward) + SendGrid Activity check.

## Out of scope

- Replacing SendGrid with self-hosted SMTP (later)
- Full RFC email threading (Message-ID / In-Reply-To)

## Fiscal impact

PATCH (admin/ops; no fiscal path).
