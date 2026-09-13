# 504 — PIN session lifetime: match remember-me (PLAN)

## Context

PIN badges currently end at the earliest of: **12 h** JWT hard cap, **60 min idle**,
or **daily closure**. Muse uses open PIN sessions for time clock / worked hours and
does not want to re-PIN after each service or overnight idle.

Account login with « remember me » keeps a **30-day** rolling refresh. Option B aligns
PIN lifetime with that window.

## Goal

1. PIN actor JWT + `staff_pin_sessions.expires_at` → **30 days** (env-overridable,
   defaulting to `AUTH_REFRESH_REMEMBER_DAYS` / `AUTH_PIN_ACTOR_TTL_DAYS`).
2. **No idle timeout** — activity is still touched for UX/audit, but does not kill the badge.
3. **Do not** close all badges on daily closure (explicit close / PIN change / deactivate still do).

## Out of scope

- Changing account access JWT (still 12h) or refresh defaults.
- Deploy to production in this patch (separate ops step).
