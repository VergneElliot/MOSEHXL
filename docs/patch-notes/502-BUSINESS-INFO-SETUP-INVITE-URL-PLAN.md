# 502 — Business-info upsert + setup invite URL (PLAN)

## Context

1. Paramètres → Établissement save returns 500: `ON CONFLICT (establishment_id)`
   on `business_settings` but no unique index exists on production.
2. New-establishment setup email link fails for customers: production `.env`
   lacks `FRONTEND_URL`, so invites defaulted to `http://localhost:3000/...`.

## Plan

1. Migration: unique index on `business_settings(establishment_id)`.
2. Set `FRONTEND_URL=https://mosehxl.com` on the live host; harden link builder
   to fall back to https CORS origin.
3. Resend Spore invite with the correct public URL.
