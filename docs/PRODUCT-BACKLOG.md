# MOSEHXL — Product backlog (living)

**Last refreshed:** 2026-09-30  
**Branch truth:** `development` @ patch notes through **531**  
**Rule:** feature pipeline is clean — pick from here when starting new work. Next patch-note number starts at **532**.

Use this as the “don’t forget” list. Tick items when done; add new ideas at the bottom of the right section. For compliance/ops rituals see `docs/roadmaps/2026-07-23-POST-FREEZE-THOROUGHNESS-ROADMAP.md` (IRL / COMP IDs). For live status pointers see `docs/CURRENT-TRUTH.md`.

---

## Snapshot (2026-09-30)

| Area | State |
|------|--------|
| Remediation audits (May 2026) | Code-closed |
| Floor service A–C + follow-ups | Shipped (fulfillment, ownership/Z, resume, split, etc.) |
| Admin space (docs, inbox, résa, planning, pointage, floor editor) | Shipped; polish remaining |
| Identity / PIN tiers / Caisse permissions | Shipped |
| Open PLAN without IMPLEMENTATION | None blocking (old umbrella plans 60 / 390 only) |
| Working tree | Clean aside from optional ops script `MuseBar/backend/scripts/resend-spore-invite.js` |

---

## A — Feature shortlist (sensible next product work)

Prioritized for venue value vs risk. Any of these is a valid next PLAN (532+).

### High leverage / user-visible

- [ ] **History parity** — order detail + receipt preview/print dialogs (V1 gap; `HistoryContainer` / DEVELOPMENT-STATE #15)
- [ ] **Settings → Printers wiring** — connect `PrinterSettings.tsx` to `services/printing/` + kitchen printers admin already elsewhere
- [ ] **Réservation ↔ salle** — seat a booking onto a free table / open ticket from Réservations (today: parallel tracks)
- [ ] **Planning hygiene + UX** — split `PlanningPanel.tsx` (~1067 LOC, baselined) before adding more planning features; then polish (conflicts, copy week, print/export)
- [ ] **Inbox / inbound ops close-out** — confirm SendGrid Inbound Parse host + URL on prod (called out in patch 531); treat reply threads as done once Activity shows inbound
- [x] **Inbox conversation UX** — list by conversation + messenger thread (patches 532–533); outbound copies kept in DB but not as separate list rows
- [x] **Reservation → conversation jump + commentaire/notes rules** — patches 534–535
- [ ] _(Strategy only — no code yet)_ Email provider path: stay SendGrid → adapter → SES/ESP when cost hurts; never self-host — see [`docs/EMAIL-PROVIDER-STRATEGY.md`](./EMAIL-PROVIDER-STRATEGY.md)

### Nice product increments

- [ ] **Seasonal / temp worker template** — one-click membership + PIN + basic perms (parked from floor Phase D+)
- [ ] **Waiter day report polish** — PDF / printable CA by waiter (non-fiscal; partial report may already exist from 463)
- [ ] **Documents reminders** — digest email for expiry (admin Documents already stores expiry)
- [ ] **Public reserve polish** — deposits / party size rules / no-show workflow beyond current flags
- [ ] **Multi-station live sync** — websockets (or poll hardening) for floor map across devices (parked Phase D+)

### Explicitly later / out of v1 shape

- [ ] Full **KDS** course firing (kitchen tickets exist; screen/workflow does not)
- [ ] Seat-level ordering / splitting one table across two fiscal registers
- [ ] NFC hardware badges
- [ ] SvelteKit POS rewrite (cleanup roadmap Phase 8 — only after venue lag gate)
- [ ] Stock / inventory, CRM / tabs comptes clients (not started; invent carefully)

---

## B — Soft debt (do when touching adjacent code)

- [ ] Refresh `DEVELOPMENT-STATE.md` — floor still marked “in progress”; known issues #14/#15 still accurate until A items land
- [ ] Explicit `mosehxl.com` in CORS defaults if env mis-set still hurts (DEVELOPMENT-STATE #11; env already covers prod when set)
- [ ] Drop or properly document `resend-spore-invite.js` (untracked one-shot ops)
- [ ] Module-size: never grow baselined monsters — split first (`PlanningPanel`, any other baseline hits)

---

## C — Don’t-forget compliance / ops (pointers only)

Not feature work; do not lose them behind product PRs.

| ID | Item | Status hint |
|----|------|-------------|
| IRL-1…8 | Company, IP, VAT recon, sign attestation 2.0.2, merchant copy, JeFacture | All **Pending** — post-freeze roadmap |
| COMP-1 | Spaces Object Lock WORM backups | Ready for keys |
| COMP-2 | Admin 2FA enroll + enforce | Ready for enrollment |
| COMP-3B | Secret manager step B | After Step A |
| COMP-7 | Flux 10.3 + Factur-X | Pending |
| COMP-8 | Quarterly restore drill | Due ≤ 2026-10-16 (check if still open) |
| COMP-9 | PA API connectivity | Toward 2027 |
| Ops | Production auto-closure re-enable checklist | Still off until checklist in patch 463 |

---

## D — Ideas parking lot

Capture here so they are not lost; promote to section A when chosen.

- [ ] _
- [ ] _

---

## How to use

1. Pick one item → write PLAN **532** (or next free) → implement → IMPLEMENTATION **533**.
2. Tick the checkbox here in the same PR (or a tiny docs follow-up).
3. If an item dies, move it to “Won’t do” with a one-line reason rather than deleting silently.

### Won’t do

_(empty)_
