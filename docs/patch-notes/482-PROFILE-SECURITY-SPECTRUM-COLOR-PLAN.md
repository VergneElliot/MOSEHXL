# 482 — Profile security + spectrum color picker (PLAN)

## Context

Settings → Profil already covers personal fields and a unique calendar color, but the color UI was limited to a curated ~24-swatch palette. Staff also need self-service password and PIN changes from the same tab.

## Scope

- Replace palette-only picker with a full-spectrum color selector (`#RRGGBB` + native color input); keep per-establishment uniqueness
- Add **Changer le mot de passe** and **Changer mon PIN** on Profil
- Allow authenticated users to set/query their own PIN without `access_user_management` (admins still manage others)

## Approach

1. Profile UI: spectrum + hex + taken-color preview; reuse existing `POST /auth/password/change`
2. Soften `/auth/pin/set` and `/auth/pin/status/:userId` for self-service
3. Wire PinPadDialog for own PIN; logout after password change

## Verification

- [ ] Any `#RRGGBB` accepted if free; collision rejected
- [ ] Staff without user-management can change own PIN from Profil
- [ ] Password change revokes session and forces re-login
- [ ] Fiscal: MINOR

## Out of scope

- Softening PIN clear for self (admins only)
- Custom HSV canvas beyond the browser native color picker
