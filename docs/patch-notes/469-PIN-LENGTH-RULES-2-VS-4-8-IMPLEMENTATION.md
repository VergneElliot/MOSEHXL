# 469 — PIN length rules (2 vs 4–8) — Implementation

Date: 2026-08-27  
Branch: `development`  
Plan: [`467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md`](./467-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-PLAN.md)  
Prior slice: [`468`](./468-PIN-SESSIONS-HEADER-TABS-FLOOR-PLAN-TAB-IMPLEMENTATION.md)

---

## Slice B shipped

### Rules
- **Basic staff** (no elevated permission, not est/system admin): PIN must be **exactly 2 digits**.
- **Elevated** (any elevated permission, or est/system admin): PIN must be **4–8 digits**.
- **Verify** accepts 2–8 digits (existing 6-digit PINs still work until re-set).
- **Uniqueness** per establishment unchanged on `/auth/pin/set`.

Elevated permission list (backend + frontend, keep aligned): HH / Offert / Perso, cancel, menu, settings, closure, user management, documents, inbox, reservations, planning, manage floor, compliance.

### Backend
- `services/auth/pinRules.ts` (+ unit tests): `resolvePinLengthRules`, format helpers.
- `MembershipPinModel.setPin(..., rules)` enforces length for the target membership.
- `parsePinBody`: `/^\d{2,8}$/`.
- `/auth/pin/set` uses target role+permissions for rules.
- `/auth/pin/status/:userId` returns `pin_kind`, `min_length`, `max_length`.

### Frontend
- `utils/pinRules.ts` mirrors length resolution for self-set UX.
- `PinPadDialog`: variable length, submit via **OK** (no auto-submit at 6).
- Header + POS pass `setRules` from logged-in terminal user for “Définir mon PIN”.
- Admin **User Management** PIN dialog uses status API for 2 vs 4–8 labels/validation.

---

## Not in this slice
- Step-up authorize (mode A) — Slice C  
- Require active PIN session for sales — Slice C  
- Move Menu under Settings — Slice D  

---

## Ops note
Existing 6-digit PINs continue to verify. Re-set base staff to 2 digits (and elevated accounts to 4–8) via User Management when convenient.

## Verify
1. Admin → User Management: basic staff PIN field = 2 digits; elevated = 4–8; duplicate PIN rejected.
2. Header **Session** → enter 2-digit (or 4–8) PIN → session tab opens.
3. “Définir mon PIN” uses the terminal user’s kind (2 or 4–8) and OK to confirm.
