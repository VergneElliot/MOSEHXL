# 536 — Venue login + PIN-only actors (PLAN)

## Context

Simplify identity: one email/password venue login (multi-venue allowed), staff are
PIN-only single-establishment actors. JWT alone grants no feature rights. All
permissions come from an active PIN session. Venue switch requires the login
account’s owner PIN on the target venue. Pointage = open/close PIN session.

## Slices

| Slice | Patch | Scope |
|-------|-------|--------|
| A | 537 | `can_login`, PIN-only feature gates, PIN-first shell, kill JWT-alone POS |
| B | 538 | PIN-only staff CRUD, owner PIN onboarding |
| C | 539 | Venue switch + owner PIN |
| D | 540 | Pointage ↔ PIN open/close; block close with open tables |
| E | 541 | Migration backfill + skills/docs/CHANGELOG |

## Locked rules

- Staff: `can_login = false`, one membership, no password login
- Venue login: `can_login = true`, may have many memberships
- Feature middleware requires PIN actor (exceptions: pin verify, logout, /me, switch)
- Open PIN = clock-in; close PIN = clock-out; no other punch paths
- Cannot close PIN while actor has open floor tickets

## Fiscal impact

MINOR (actor path unchanged for journal hash).
