# 530 — Sync venue contact email + inbound diagnostics (PLAN)

## Context

SendGrid Activity shows venue copies to `contact@musebar.fr` Blocked (domain has no MX).
Settings « email de contact » writes `business_settings.email`, while reservation venue
notify + autoforward use `establishments.email` — left as legacy `contact@musebar.fr`.

Inbound: public MX for `mosehxl.com` already points at `mx.sendgrid.net`. Gmail replies
do not appear in Activity (Activity is outbound-only). If Boîte mail is empty, Inbound
Parse URL/token is the remaining ops check.

## Scope

1. Prefer `business_settings.email` for venue notify; sync it onto `establishments.email` on settings save.
2. One-shot backfill establishments.email from business_settings.
3. Inbox / email-status: show contact email used for venue copies; note Activity ≠ inbound.
4. Skip venue notify when contact email empty after coalesce.

## Fiscal impact

PATCH.
