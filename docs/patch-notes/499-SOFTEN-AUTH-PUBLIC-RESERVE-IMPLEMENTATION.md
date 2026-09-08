# 499 — Soften auth lockout + public reserve bootstrap (IMPLEMENTATION)

## Shipped

- Lockout defaults: 8 fails → 2 min base, 15 min cap (was 5 / 15 / 240).
- Login IP rate limit prod multiplier 3× (30 / 15 min).
- `.env.example`: `PASSWORD_BREACH_CHECK_ENABLED=false` recommended; `AUTH_LOCKOUT_*` documented.
- User management **Déverrouiller** → `PUT /auth/users/:id/unlock`.
- `App.tsx`: public paths skip auth bootstrap spinner (never fall through to Login wait).
- Runbook: [UNLOCK-LOGIN-AND-SOFTEN-AUTH.md](../runbooks/UNLOCK-LOGIN-AND-SOFTEN-AUTH.md)
  (SQL for Leo + HIBP off on cloud).

## Cloud follow-up (manual)

1. Set `PASSWORD_BREACH_CHECK_ENABLED=false` and restart backend.
2. Run unlock SQL for `leobappel@gmail.com` (or use Déverrouiller after deploy).
3. Smoke `https://mosehxl.com/reserve/musebar` in incognito.

## Fiscal impact

**PATCH**.
