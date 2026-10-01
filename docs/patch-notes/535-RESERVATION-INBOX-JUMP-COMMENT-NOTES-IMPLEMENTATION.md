# 535 — Reservation → inbox jump + commentaire/notes rules (IMPLEMENTATION)

Plan: `docs/patch-notes/534-RESERVATION-INBOX-JUMP-COMMENT-NOTES-PLAN.md`

## Delivered

### Accéder à la conversation
- Reservation edit dialog button → Admin Boîte mail opens the right thread
  (works for archived threads via `GET /admin/inbox/by-reservation/:id`).

### Commentaire vs Notes
| Field | Rule |
|-------|------|
| **Commentaire** (`status_reason`) | Emailed on status change **or** commentaire text change |
| **Notes** (`notes`) | Staff-only; never emailed; public form no longer writes here |

- Public guest message → inbox seed + venue `guestMessage` only; `notes = null`.
- Guest/venue templates no longer use reservation `notes`.
- Dialog labels/helpers updated; `ReservationEditDialog` extracted (panel shrank).

## Fiscal impact

MINOR.
