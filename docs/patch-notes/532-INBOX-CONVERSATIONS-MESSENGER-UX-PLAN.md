# 532 — Inbox conversations + messenger UX (PLAN)

## Context

Boîte mail lists every `inbox_messages` row, including **outbound** copies
(`musebar@mosehxl.com` confirmations / status mails). That clutters the left
pane and hides which guest conversation a row belongs to. Opening one message
does not show earlier messages even when `reservation_id` + `direction` already
exist (patch 529).

## Goals

1. **List conversations, not raw mails** — one row per reservation thread (or
   per unlinked message). Outbound copies stay in DB for history but do not
   appear as separate list items.
2. **Thread detail** — messenger-style bubbles (guest inbound vs venue outbound)
   in chronological order when opening any message in a thread.
3. **Modernize layout** — clearer counterpart (guest name/email), unread on
   inbound only, reservation card + actions kept.
4. **Hygiene** — split `InboxPanel.tsx` (~395) into focused modules; do not grow
   baselined files.

## Approach

### Backend

- Add `InboxModel.listConversations(establishmentId, { archived })`:
  - Group by `reservation_id` when set; else one conversation per message id.
  - Sort by latest `received_at`.
  - Counterpart = reservation guest (name/email) or first inbound `from_address`
    (never prefer venue `slug@` as the list identity).
  - `unread_count` = unread **inbound** only.
  - Archived view: conversations where all messages are archived (archive action
    archives the whole thread).
- `GET /admin/inbox` returns `conversations` (+ keep `messages` empty or omit;
  frontend switches).
- `GET /admin/inbox/:id` also returns `thread: InboxMessage[]` (via
  `listByReservation` or `[message]`).
- `POST .../archive`: if message has `reservation_id`, archive/unarchive **all**
  messages in that thread.
- Reply: when selected message is outbound, resolve guest `to` from linked
  reservation email / last inbound (fix “reply to ourselves”).

### Frontend

- Types: `direction`, `reservation_id` on DTOs; `InboxConversationDto`.
- New modules under `Administration/inbox/` (list, thread pane, bubbles,
  reservation actions, hook).
- `InboxPanel` becomes a thin shell (banner + settings + compose of children).

## Out of scope

- Changing SendGrid / autoforward-to-contact (separate toggle).
- Deleting historical outbound rows (keep for thread history).
- Full redesign of Réservations tab (only inbox ↔ reservation link UX).

## Verification

- [ ] Unit/integration: conversation grouping + archive-all-in-thread
- [ ] Manual: list no longer floods with `slug@mosehxl.com` status subjects
- [ ] Manual: open reply → see prior guest + venue bubbles; Valider still works
- [ ] Fiscal impact: none (admin UX)

## Risks

- Reply-to-self bug if outbound-selected reply not fixed — mitigate in same slice.
- Large threads: cap thread fetch reasonably (e.g. 200 messages).
