# 538 — Venue login PIN-only actors Slice B (IMPLEMENTATION)

Plan: `536-VENUE-LOGIN-PIN-ONLY-ACTORS-PLAN.md`

## Delivered

- `POST /api/auth/pin-staff` — create PIN-only staff (`can_login=false`, no usable password).
- Gestion des utilisateurs: add flow is name + PIN (no email invite for staff).
- Setup wizard: owner PIN required; set on membership after account creation (`bootstrapOwnerPin`).

## Fiscal impact

MINOR.
