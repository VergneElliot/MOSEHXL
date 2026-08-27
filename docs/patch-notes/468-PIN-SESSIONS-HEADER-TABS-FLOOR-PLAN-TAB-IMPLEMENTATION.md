# 468 — PIN session header tabs + Plan de salle tab — Implementation

Date: 2026-08-27  
Branch: `development`  
Plan: [`467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md`](./467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md)

---

## Slice A shipped

### Header
- Removed EN/FR `LanguageSwitcher` from authenticated `AppHeader`.
- `PinSessionsProvider` wraps the business shell.
- Session tabs next to MuseBar POS brand + **Session** button (PIN pad).
- Multiple concurrent PIN sessions; dismiss via tab ×.
- Per-session **cart** + **active table** persisted in `sessionStorage` (`mosehxl.pinSessions.v1`); migrates legacy single `mosehxl.pinActor`.

### POS
- Blue badge strip reduced to session hint + table chip (sessions live in header).
- `useFloorService` reads/writes the active session from context.
- Switching header tabs swaps the POS cart.

### Plan de salle
- New sidebar tab (gated by `access_pos`), consult-only canvas + table detail dialog.
- Admin editor unchanged under Administration → Plans de tables.

---

## Not in this slice (plan B/C)
- 2 / 4–8 digit PIN rules  
- Step-up authorize (mode A)  
- Require session for all sales  
- Move Menu under Settings  

---

## Verify
1. Soft-refresh: no EN/FR in header; **Session** opens PIN pad (still 6 digits until B).
2. Open two sessions → two tabs → each keeps its own cart when switching.
3. Sidebar **Plan de salle** shows layout; click table → info dialog only.
