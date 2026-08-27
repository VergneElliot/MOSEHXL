# 467 — Soft-badge PIN sessions, header tabs, Plan de salle — Plan

Date: 2026-08-27  
Branch: `development`  
Prior: Floor visual editor `464`/`465`, floor permission `466`

---

## 1) Goal

Replace the single POS blue PIN badge with **multi-session PIN tabs in the app header**, redefine PIN lengths and base vs elevated rights, add a top-level **Plan de salle** tab, and use **one-shot step-up PIN** for restricted actions when the active session lacks permission.

Terminal stays one email/password login; PIN identifies who is acting for sales / Z / traceability.

---

## 2) Product model (decided)

| Concept | Decision |
|---------|----------|
| 2-digit PIN | Base staff only; unique per establishment; ≤100; identity + Z, not strong security |
| 4–8 digit PIN | Required if user has **any** elevated permission (min 4, max 8) |
| Uniqueness | All PINs unique per establishment regardless of length |
| Multi-session | Several active PIN sessions on one terminal; each has own cart / open ticket / waiter context |
| Header | Session tabs next to MuseBar POS brand; drop EN/FR switcher from app shell |
| Step-up | **Mode A**: restricted action → prompt PIN of a user who has the right → authorize that action only; do **not** force a manager session tab |
| Login → auto session | **Deferred** |

### Base vs elevated (v1)

**Base** (2-digit / no elevated grants):

- POS: order + checkout with an **active** PIN session; **not** Happy Hour / Offert / Perso  
- Plan de salle (new tab): **consult only** (tables, open ticket summary, waiter IDs)  
- Historique: view; **not** cancel/return  
- No Menu edition, Settings, Closures, Administration  

**Elevated** (tabs stay visible; step-up if active session lacks right):

- Happy Hour / Offert / Perso  
- Cancel / return (history + open tickets)  
- Floor mutations (open/transfer/merge/reassign/etc. beyond consult)  
- Settings (Menu edition moves under Settings later)  
- Closures, Administration  

---

## 3) Build slices

### Slice A — Shell (this pass)

1. Plan note `467`  
2. Remove EN/FR from authenticated `AppHeader`  
3. `PinSessions` context: list of sessions, active id, add / dismiss / switch; migrate off single `mosehxl.pinActor`  
4. Header tabs next to brand; remove POS `FloorBadgeStrip` badge UX (PIN entry via “+ session” / empty state)  
5. Per-session cart + active table binding (lift from single `usePOSState` currentOrder)  
6. Top-level sidebar **Plan de salle** (reuse floor canvas + status; consult-first; mutations still via POS/step-up later)

### Slice B — PIN rules

- Backend: validate 2 vs 4–8 by whether membership has elevated permissions; uniqueness; migrate off hard-coded 6  
- Admin User Management set-PIN UX  

### Slice C — Gates + step-up

- Require active session for creating orders / binding sales attribution  
- Step-up dialog for elevated actions (cancel, HH/Offert/Perso, settings tabs, etc.)  
- Plan de salle: enforce consult-only for base  

### Slice D — Polish

- Move Menu panel under Settings  
- Impl notes per slice; regenerate `LATEST-INDEX.md`

---

## 4) Technical notes

- Today: one `pinActor` in `useFloorService` + `sessionStorage`; one `currentOrder` in `POSContainer`  
- Header needs shared context above `AppRouter` / POS  
- `x-pin-actor-token` continues per request from **active** session (or step-up token for one-shot)  
- Plan de salle tab gate: visible with establishment membership / `access_pos` (exact filter in impl); editor remains Admin `manage_floor_plan`

---

## 5) Out of this plan’s first ship

- Subscription-tier permissions  
- Websockets / live multi-terminal sync  
- Auto PIN session on password login  
- Full feature-by-feature PIN authorize migration beyond the gates listed  

---

## 6) Ship

Implementation notes `468+` per slice; commit/push `development`.
