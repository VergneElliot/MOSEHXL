# 471 — Move Menu under Settings — Implementation

Date: 2026-08-27  
Branch: `development`  
Plan: [`467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md`](./467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md)  
Prior: [`468`](./468-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-IMPLEMENTATION.md)–[`470`](./470-PIN-SESSION-GATES-STEP-UP-IMPLEMENTATION.md)

---

## Slice D shipped

### Navigation
- Removed top-level **Menu** sidebar tab.
- **Paramètres** remains the entry; visible if the login user has `access_settings` **or** `access_menu`.
- Step-up for Paramètres accepts either elevated permission (settings or menu).

### Settings → Menu section
- New sub-tab **Menu** (after Établissement) when `canManageMenu` (`access_menu`).
- Lazy-loads `MenuContainer` with `embedded` chrome (no double page hero).
- Selecting the Menu sub-tab step-ups with `access_menu` if the active PIN session lacks it.

### Unchanged
- POS product browser (“Menu” in the cashier layout)  
- Backend `access_menu` on catalog APIs  
- Plan de salle / PIN session / step-up behavior from A–C  

---

## Verify
1. Sidebar has no standalone Menu; Paramètres → **Menu** edits categories/products.
2. User without `access_menu` does not see the Menu sub-tab.
3. Base PIN session → Paramètres → Menu → elevated PIN step-up.
