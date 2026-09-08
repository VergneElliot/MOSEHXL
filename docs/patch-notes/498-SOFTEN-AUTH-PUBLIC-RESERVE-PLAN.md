# 498 — Soften auth lockout + public reserve bootstrap (PLAN)

## Context

Muse-only cloud: HIBP breach checks and long progressive lockouts (15→240 min) block real staff
(e.g. `leobappel@gmail.com`). Guest reservation URLs must not wait on login bootstrap.

## Changes

1. Softer lockout defaults + higher login rate limit; document unlock SQL + HIBP off.
2. Gestion des utilisateurs: **Déverrouiller** button.
3. App: public paths (`/reserve/*`, planning confirm, setup) render without `authReady` gate.
4. Site vitrine reservation CTA deferred.

## Fiscal impact

**PATCH** — auth UX / ops only.
