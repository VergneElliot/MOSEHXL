# 458 — Floor service Phase B (POS badge + map + tickets) — Implementation

Date: 2026-08-13  
Plan: `docs/patch-notes/457-FLOOR-SERVICE-PHASE-B-POS-PLAN.md`  
Branch: `development`

---

## 1) What shipped

POS can now use the Phase A APIs end-to-end in one room:

| Feature | Behavior |
|---------|----------|
| Badge strip | Top of POS — Badge / name chip + table chip |
| PIN pad | 6-digit pad; verify or « Définir mon PIN » (user management) |
| Plan de salle | **Sélectionner une table** + map dialog from `GET /floor/status` |
| Open / load | Free → `POST /floor/tickets`; occupied → load items into cart |
| Sync | Debounced `PUT …/items` while a table is bound |
| Pay | Existing CB / espèces / Options → `createOrder` → `POST …/close` |
| Bar mode | No table selected → unchanged local cart |

Quick empty-state helper: create plan « Salle » + tables 1–12 if station has `manage_floor_plan`.

---

## 2) Key files

- `MuseBar/src/services/api/floor.ts`
- `MuseBar/src/hooks/useFloorService.ts`
- `MuseBar/src/components/POS/PinPadDialog.tsx`
- `MuseBar/src/components/POS/FloorMapDialog.tsx`
- `MuseBar/src/components/POS/FloorBadgeStrip.tsx`
- `MuseBar/src/components/POS/POSContainer.tsx` (+ OrderSummary / POSOrderPanel wiring)

Backend tweaks so bad PIN does not kick the station session:

- Invalid PIN → **400** (not 401)
- Missing/invalid pin-actor header → **403** (not 401)

---

## 3) How to try

1. Log into POS as establishment admin (station session).  
2. Badge → **Définir mon PIN** → enter 6 digits → then badge with that PIN.  
3. Open map → create quick plan if empty → tap a free table → add products → pay.  
4. Table should show free again after payment.

Pin actor is kept in `sessionStorage` (`mosehxl.pinActor`) for the browser tab.

---

## 4) Still Phase C+

- Visual floor editor in Administration  
- Transfer / merge / À suivre  
- JWT → PIN authorize migration for cancel/menu  
- Multi-station realtime
