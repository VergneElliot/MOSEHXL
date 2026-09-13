# Admin Space — email inbox & document storage

Operational checklist for the establishment Administration space
(`Documents`, `Boîte mail`, `Réservations`, `Planning`, `Pointage`).

## 0. SendGrid Domain Authentication (required for `slug@mosehxl.com`)

Reservation mails and inbox replies send **From** `Name <slug@mosehxl.com>`.
A single verified sender (`noreply@…`) is **not** enough — authenticate the whole domain.

1. SendGrid → **Settings → Sender Authentication → Authenticate Your Domain**.
2. Choose DNS host for `mosehxl.com` and leave **Automated Security** on (CNAME mode).
3. Add the **3 CNAME** records SendGrid shows to your DNS (host + value exactly as given).
4. Optionally add / confirm **DMARC** TXT on `_dmarc.mosehxl.com`, e.g.  
   `v=DMARC1; p=none; rua=mailto:support@mosehxl.com`
5. Click **Verify** in SendGrid until the domain shows as authenticated.
6. Set production env:

```bash
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@mosehxl.com
FRONTEND_URL=https://app.mosehxl.com   # or your SPA origin
APP_URL=https://api.mosehxl.com        # public API origin
PUBLIC_API_URL=https://api.mosehxl.com
```

7. Confirm health: as establishment admin, `GET /api/admin/email-status` should report
   `sendgrid_configured: true` and `from_email: noreply@mosehxl.com`.

## 1. DigitalOcean Spaces (document / attachment storage)

1. Create a **private** Spaces bucket (e.g. `mosehxl-admin-docs`) in a region close to the droplet (`fra1` recommended).
2. Create Spaces access keys (Spaces Keys in the DO control panel).
3. On the droplet, set in the backend `.env`:

```bash
SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
SPACES_REGION=fra1
SPACES_BUCKET=mosehxl-admin-docs
SPACES_KEY=...
SPACES_SECRET=...
```

4. Restart the backend (`pm2 restart mosehxl-backend` or equivalent).
5. Confirm uploads work from **Administration → Documents**.

Object keys are namespaced as `establishments/<uuid>/documents|inbox/...`.

## 2. Inbound email (`slug@mosehxl.com`)

Prerequisites: Domain Authentication for `mosehxl.com` is verified (section 0) and
`FROM_EMAIL=noreply@mosehxl.com`.

### DNS

Add an MX record for `mosehxl.com` pointing to SendGrid Inbound Parse:

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | @ | `mx.sendgrid.net` | 10 |

**Warning:** this MX receives **all** mail for `@mosehxl.com`. Confirmed: no existing mailboxes on this domain.

### SendGrid Inbound Parse

1. SendGrid → Settings → Inbound Parse → Add Host & URL.
2. Hostname: `mosehxl.com` (or the subdomain if you later switch).
3. Destination URL (HTTPS, publicly reachable API host):

```
https://<your-public-api-host>/api/inbound-email/<INBOUND_EMAIL_WEBHOOK_TOKEN>
```

4. Leave **POST the raw, full MIME message** **unchecked**. The backend expects
   SendGrid's default multipart fields (`to`, `from`, `subject`, `text`, `html`, file attachments).
5. Generate a long random token and set on the server:

```bash
# example: openssl rand -hex 32
INBOUND_EMAIL_WEBHOOK_TOKEN=<long-random-secret>
```

6. Restart the backend.
7. `GET /api/admin/email-status` should report `inbound_webhook_token_set: true`.

### Establishment addresses

Each establishment gets a unique `slug` (generated from the name, unique). Mail to:

```
<slug>@mosehxl.com
```

is stored in the in-app inbox. Optional autoforward sends a copy to the establishment contact email (default on; From = `FROM_EMAIL`).

## 3. Database migration

Run migrations so tables/permissions/slugs exist:

```bash
cd MuseBar/backend
npm run migration:migrate
```

This creates `admin_documents`, `inbox_*`, `reservations`, `staff_shifts`, `time_entries`,
seeds the four `access_*` permissions, backfills `establishments.slug`, and grants
admin-space permissions to existing `establishment_admin` users.

## 4. ICS calendar feeds

- Reservations: `GET /api/admin/reservations/ics/token` (auth) → public URL `/api/public/ics/reservations/<token>.ics`
- Staff planning: `GET /api/admin/planning/ics/token/:userId` → `/api/public/ics/planning/<token>.ics`

Subscribe from Google Calendar / Apple Calendar / Outlook using the URL shown in the UI.

## 5. Smoke test

1. Open **Administration** as an establishment admin.
2. `GET /api/admin/email-status` → SendGrid + inbound token + Spaces as expected.
3. Upload a document with an expiry date; confirm download URL works.
4. Send a test email to `<slug>@mosehxl.com` (after MX/Inbound Parse are live); confirm it appears in **Boîte mail** and autoforward arrives.
5. Reply from the inbox UI; guest should receive From `slug@mosehxl.com`.
6. Create a public reservation; guest mail From should be `Name <slug@mosehxl.com>`; reply should land in Boîte mail.
7. Create a **manual** reservation on the agenda (with customer email); confirm a seed row in Boîte mail and that a guest reply still lands as a new inbox message.
8. Import an attachment into Documents.
9. Create a reservation and a staff shift; open the ICS URLs in a calendar app.

## 6. Incident: “customer replied, I see nothing”

Guest reservation emails use Reply-To `slug+r{reservationId}@mosehxl.com` so inbound
can attach to that booking. Plain mail still uses `slug@mosehxl.com`.
Optional autoforward copies to `establishments.email` (personal mailbox).

**Renaming the establishment display name does not change `slug` or the inbox
address.** `musebar@mosehxl.com` stays until `establishments.slug` is changed deliberately.

Checklist:

1. Confirm you looked in **Boîte mail**, not only personal Gmail (autoforward may be off).
2. `GET /api/admin/email-status` → `inbound_webhook_token_set` + SendGrid configured.
3. **DNS MX** for `mosehxl.com` → `mx.sendgrid.net` (if missing, Gmail replies never hit SendGrid Activity).
4. SendGrid → **Inbound Parse** host `mosehxl.com` URL =
   `https://<api>/api/inbound-email/<INBOUND_EMAIL_WEBHOOK_TOKEN>`.
5. SendGrid → **Activity** for the guest’s reply (accepted / bounced / dropped).
6. Backend logs `INBOUND_EMAIL` (`ignored`, unknown slug, autoforward fail).
7. Venue copy to `contact@…` blocked with `error dialing remote address` = **their** MX/host unreachable — unrelated to guest inbox.

### Self-hosted SMTP / leave SendGrid (later)

Inbound today **depends** on SendGrid Inbound Parse + MX. Replacing it means swapping
outbound (`EmailSender`) and inbound (IMAP or provider webhook) plus SPF/DKIM/DMARC.
**Recommendation:** fix MX/Parse first (required for any stack), keep plus-address
threading, then plan SES/Mailgun/Postfix as a separate project.
