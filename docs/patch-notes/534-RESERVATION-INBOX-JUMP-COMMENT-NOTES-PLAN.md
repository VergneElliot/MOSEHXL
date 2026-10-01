# 534 — Reservation → inbox jump + commentaire/notes rules (PLAN)

## Context

Staff need to open the Boîte mail thread from a reservation (often months earlier,
buried in the inbox). Also clarify fields:

| Field | DB | Audience | Auto-fill | Emailed to guest |
|-------|-----|----------|-----------|------------------|
| **Commentaire** | `status_reason` | Client | Never auto | Yes — on **status** change **or** commentaire change |
| **Notes** | `notes` | Établissement only | Never | Never |

Prod bug: public guest text was stored in `notes` and could appear in venue/guest
payloads as “Notes”.

## Approach

1. Public booking: keep guest message in inbox seed only; `reservations.notes = null`.
2. Venue notify templates: use `guestMessage` (one-shot from public form), not `notes`.
3. Guest templates: only `commentaire` (`status_reason`); never `notes`.
4. PATCH: email guest when status **or** `status_reason` actually changes.
5. UI: clear helpers; always show both fields on edit; « Accéder à la conversation »
   switches Admin → Boîte mail and opens the reservation thread (incl. archived).
6. Extract `ReservationEditDialog` so baselined `ReservationsPanel.tsx` does not grow.

## Verification

- [ ] Public booking does not fill `notes`
- [ ] Changing only commentaire emails guest; changing only notes does not
- [ ] Button opens correct thread
- [ ] Fiscal: MINOR

## Risks

- Old rows may still have guest text in `notes` (no mass rewrite; staff can clear).
