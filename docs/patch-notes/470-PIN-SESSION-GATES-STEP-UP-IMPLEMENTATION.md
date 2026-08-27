# 470 — PIN session gates + Mode A step-up — Implementation

Date: 2026-08-27  
Branch: `development`  
Plan: [`467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md`](./467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md)  
Prior: [`468`](./468-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-IMPLEMENTATION.md) shell, [`469`](./469-PIN-LENGTH-RULES-2-VS-4-8-IMPLEMENTATION.md) PIN lengths

---

## Slice C shipped

### Require active PIN session for sales
- Adding lines / Divers / Pourboire / checkout / quick pay call `ensureSession()` (PIN pad if no active tab).
- `POST /api/orders` requires `x-pin-actor-token` (`requirePosPinActor`).
- Waiter attribution on create is taken from the PIN actor (not client-spoofable body alone).
- Frontend `createOrder` sends the active session token.

### Mode A step-up (one-shot, no manager session tab)
- `StepUpAuthProvider` + PIN pad: verify a PIN that holds the required permission; grant is cached until the active session changes.
- **POS**: Happy Hour / Offert / Perso (buttons still follow login-user capability; click step-ups if active session lacks the right).
- **Historique**: open + confirm cancel/return step-up with `orders_cancel`.
- **Nav**: Menu / Paramètres / Clôtures / Administration require step-up when the active PIN session lacks the matching elevated permission (tabs stay visible from login rights).

### Plan de salle
- Consult tab remains mutation-free; explicit info alert that opens/transfers stay on Caisse + PIN session.

---

## Not in this slice
- Move Menu under Settings — Slice D  
- Backend pin-actor enforcement on every elevated HTTP route (cancel still uses login `orders_cancel`; step-up is client ceremony + grant cache)  
- Auto PIN session on password login  

---

## Verify
1. No PIN session → add product → session pad opens; after PIN, line appears; sale attributed to that waiter.
2. Base PIN session → Offert → manager PIN step-up → Offert applies; no second session tab.
3. Base session → Historique cancel → step-up; Menu/Settings → step-up.
4. Plan de salle → table click → info only; no transfer/merge controls.
