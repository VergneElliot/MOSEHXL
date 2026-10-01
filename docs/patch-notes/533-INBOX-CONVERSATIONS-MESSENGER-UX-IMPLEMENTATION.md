# 533 — Inbox conversations + messenger UX (IMPLEMENTATION)

Plan: `docs/patch-notes/532-INBOX-CONVERSATIONS-MESSENGER-UX-PLAN.md`

## Delivered

- `listInboxConversations` — one list row per reservation thread (or unlinked message).
- `GET /admin/inbox` returns `conversations` (guest counterpart, unread inbound only).
- `GET /admin/inbox/:id` returns `thread` chronologically; marks whole reservation thread read.
- Archive applies to all messages in a reservation thread.
- Reply recipient resolver — never “reply to” venue outbound `from` as guest;
  rejects `@mosehxl.com` / `@local`; prefers `reservations.customer_email`.
- Staff reply + Valider/Attente/Refuser show **who** the mail was sent to (or warn if
  SendGrid failed while status still saved).
- SendGrid success logs include `to` / `replyTo` for ops debugging.
- Frontend: messenger bubbles + conversation list (`Administration/inbox/*`); thin
  `InboxPanel` re-export. Types/API live in `adminInboxApi.ts` (no growth of baselined
  `adminSpace.ts`).

## Root cause of “client did not receive my answer”

Opening an outbound confirmation (`musebar@…`) and clicking **Envoyer** used
`from_address` as the recipient → mail went back to the venue inbox, not the guest.
Fixed by reservation-first resolution + venue-domain hard reject.

## Verification

- [x] `resolveInboxReplyRecipient` unit tests (incl. never mosehxl.com)
- [ ] Manual: Envoyer / Valider shows green “envoyé à guest@…”
- [ ] Manual: list shows guest names, full thread bubbles

## Fiscal impact

MINOR (admin UX only).
