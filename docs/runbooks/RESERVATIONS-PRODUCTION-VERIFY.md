# Reservations + email — production verification checklist

Run this **on DigitalOcean** before going live with the Administration/reservations update.

## 1. Backend environment (`/var/www/MOSEHXL/MuseBar/backend/.env`)

Required keys:

```bash
SENDGRID_API_KEY=SG....          # must start with SG.
FROM_EMAIL=noreply@mosehxl.com
FRONTEND_URL=https://app.mosehxl.com   # or your SPA URL
APP_URL=https://api.mosehxl.com
PUBLIC_API_URL=https://api.mosehxl.com
INBOUND_EMAIL_WEBHOOK_TOKEN=<32+ char secret>
JWT_SECRET=<32+ chars>
```

Optional but recommended:

```bash
RESERVATION_REMIND_SECRET=<optional; defaults to JWT_SECRET>
SPACES_*                         # inbox attachments only
```

Restart after changes:

```bash
pm2 restart musebar-backend --update-env
```

## 2. DNS (mosehxl.com)

| Check | Record |
|-------|--------|
| SendGrid domain auth | 3 CNAME records from SendGrid dashboard → **Verified** |
| Inbound mail | MX `@` → `mx.sendgrid.net` priority **10** |
| Optional DMARC | TXT `_dmarc` |

## 3. SendGrid dashboard

- [ ] **Settings → Sender Authentication → Domain Authentication** = verified for `mosehxl.com`
- [ ] **Settings → Inbound Parse** → POST to  
      `https://api.mosehxl.com/api/inbound-email/<INBOUND_EMAIL_WEBHOOK_TOKEN>`  
      (raw MIME, **do not** check “POST the raw, full MIME message” off if your handler expects it)
- [ ] Activity feed: no recent auth failures for `slug@mosehxl.com`

## 4. API health (establishment admin JWT)

```bash
curl -s -H "Authorization: Bearer <JWT>" \
  https://api.mosehxl.com/api/admin/email-status | jq
```

Expected:

```json
{
  "sendgrid_configured": true,
  "from_email": "noreply@mosehxl.com",
  "inbound_webhook_token_set": true
}
```

## 5. Per-establishment database

For each live venue:

```sql
SELECT id, name, slug, email FROM establishments WHERE id = '<uuid>';
```

- [ ] `slug` is set (lowercase, unique) — required for `slug@mosehxl.com` From address
- [ ] `email` is set — venue notification on new bookings
- [ ] Opening hours configured (Settings → Plages de réservations, or `GET/PUT /api/settings/opening-hours`)

## 6. End-to-end smoke test

1. Open `https://app.mosehxl.com/reserve/<slug>` (or public link from Administration → Réservations).
2. Submit a test booking with **your real email**.
3. Confirm:
   - [ ] Guest receives **Demande reçue** from `{Venue Name} <slug@mosehxl.com>`
   - [ ] Venue receives notification at `establishments.email`
   - [ ] Administration → **Boîte mail** shows the request
4. Reply to the guest email → should appear in Boîte mail (inbound parse).
5. From Boîte mail or Réservations, **confirm** the booking → guest receives confirmation with cancel link.
6. Optional: use cancel link (≥ 48 h before slot) → guest + venue cancellation emails.

## 7. Known limitations (not blockers)

- Venue email skipped if `establishments.email` is null (inbox still works).
- Remind cooldown is in-memory (resets on PM2 restart).
- Staff-driven `cancelled` / `no_show` / `seated` do not email the guest.
- Emails are fire-and-forget: API returns 201 even if SendGrid fails — check Activity feed if mail missing.

## 8. If mail does not arrive

1. SendGrid Activity → bounce / blocked / auth error?
2. Backend logs: `RESERVATION_EMAIL`, `EMAIL_SENDER`
3. `sendgrid_configured: false` → fix `SENDGRID_API_KEY`
4. From rejected → complete domain authentication (not single-sender only)
5. `FRONTEND_URL` wrong → links in mail point to localhost

See also: [ADMIN-SPACE-INBOUND-AND-STORAGE.md](./ADMIN-SPACE-INBOUND-AND-STORAGE.md)
