# 483 — Profile security + spectrum color picker (IMPLEMENTATION)

## Summary

Profil now uses a full spectrum / hex color picker (with taken-color warnings and quick suggestions), plus self-service **Changer le mot de passe** and **Changer mon PIN**.

## Backend

- `POST /auth/pin/set` and `GET /auth/pin/status/:userId`: self allowed; other users still require `access_user_management`
- Password change unchanged: `POST /auth/password/change` (session revoke)

## Frontend

- `ProfileSettings.tsx`: native `<input type="color">` + hex field; used-color chips; optional palette suggestions
- Password dialog → change + logout
- PinPadDialog for own PIN via `floor.setPin`

## Verification

- [x] Self PIN path no longer gated solely by user-management
- [x] Color API still accepts any `#RRGGBB` with `COLOR_TAKEN` uniqueness
- [ ] Manual: spectrum pick + collision + password/PIN from Profil

## Fiscal impact

**MINOR** — account UX only.
