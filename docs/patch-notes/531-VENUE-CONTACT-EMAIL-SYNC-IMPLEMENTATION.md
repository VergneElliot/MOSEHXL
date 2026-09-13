# 531 — Sync venue contact email + inbound diagnostics (IMPLEMENTATION)

## Delivered

- `resolveVenueContactEmail`: prefer `business_settings.email`, fallback `establishments.email`.
- Saving Paramètres contact email syncs `establishments.email`.
- Migration backfills establishments.email from business_settings.
- Public reservation venue notify + inbound autoforward use resolved contact email.
- Inbox UI shows contact email + warning for `@musebar.fr`.
- `email-status`: Activity is outbound-only; inbound Parse URL hint.

## Ops (inbound replies)

MX `mosehxl.com` → `mx.sendgrid.net` is correct. Confirm SendGrid Inbound Parse host +
URL matches production `/api/inbound-email/<token>`. Replies will not appear in Activity.

## Fiscal impact

PATCH.
