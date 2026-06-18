# Deploy Print and Email to Production (mosehxl.com)

Date: 2026-06-11  
Scope: thermal printing (Epson Server Direct) + SendGrid document email (receipts, invoices, closure bulletins)

---

## 1) Preconditions

Before deploying:

1. `development` branch changes reviewed and merged to `main` via PR.
2. Production database backup completed.
3. SendGrid account active with verified sender domain.
4. Epson printer(s) reachable from establishment network and able to poll HTTPS.

---

## 2) Release steps (ordered)

### Step A — Backup database

```bash
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -Fc -f "mosehxl-backup-$(date +%Y%m%d-%H%M).dump"
```

### Step B — Deploy application artifact

Repo CI builds frontend/backend on `main` push. Deploy the artifact to the production host (process is configured outside this repository: nginx + systemd).

On server after deploy:

```bash
cd /path/to/MOSEHXL/MuseBar/backend
npm ci
npm run build
```

Restart backend service (systemd unit name depends on host configuration).

### Step C — Run migrations

```bash
cd MuseBar/backend
npm run migration:status
npm run migration:migrate
```

Minimum migrations for print + invoice + email features (if production predates May 2026):

| Migration | Purpose |
|-----------|---------|
| `2026_04_24_02_00_00_printing_tables_in_migration_chain.sql` | `printing_configurations`, `printing_history` |
| `2026_05_28_20_30_00_add_legal_invoices.sql` | Invoice subsystem |
| `2026_05_28_21_15_00_add_invoice_legal_fields.sql` | Mandatory B2B legal fields |

### Step D — Environment variables

Set in production `.env`:

| Variable | Required | Example / note |
|----------|----------|----------------|
| `NODE_ENV` | yes | `production` |
| `DB_*` | yes | production Postgres |
| `JWT_SECRET` | yes | strong secret |
| `ARCHIVE_SECRET_KEY` | yes | ≥ 32 chars |
| `SETUP_SECRET` | yes | bootstrap protection |
| `CORS_ORIGIN` | yes | `https://mosehxl.com` |
| `SENDGRID_API_KEY` | yes for email | `SG....` |
| `FROM_EMAIL` | yes for email | verified sender, e.g. `noreply@mosehxl.com` |
| `APP_URL` | yes for printing | `https://mosehxl.com` (poll URL generation) |

Optional: `PUBLIC_API_URL` if API base differs from `APP_URL`.

Restart backend after env changes.

---

## 3) SendGrid verification

1. Verify sender domain for `FROM_EMAIL` in SendGrid dashboard.
2. Smoke test (admin session):

```bash
curl -X POST "https://mosehxl.com/api/test-email" \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@yourdomain.com","subject":"MOSEHXL prod email smoke"}'
```

---

## 4) Epson Server Direct Print (per establishment)

1. Log into POS as establishment admin.
2. **Settings → Printer** — run wizard, save `epson-server-direct` config (generates `pollKey`).
3. In Epson TMNet WebConfig, configure Server Direct Print:
   - **Poll URL:** `https://mosehxl.com/api/printing/epson/poll?establishment_id=<uuid>`
   - **Header:** `x-epson-poll-key: <pollKey from settings>`
4. Ensure nginx proxies `/api/printing/epson/poll` to backend (no JWT; key-protected).

Smoke from UI: Settings → Printer → test print.

---

## 5) Functional smoke tests (production)

Execute in order:

| # | Action | Expected |
|---|--------|----------|
| 1 | Sale → print ticket | Print job queued, printer receives XML |
| 2 | Sale → export PDF ticket | PDF downloads |
| 3 | Sale → email ticket | SendGrid delivery, PDF attachment |
| 4 | Create invoice → print / PDF / email | Same safeguards as UAT E-01..E-03 |
| 5 | Closure bulletin → print / PDF / email | PDF attachment; XLSX on monthly/weekly/annual |
| 6 | Monthly bulletin → export Excel | XLSX with daily rows + TOTAL |

Pair with `docs/runbooks/INVOICE-UAT-CHECKLIST-POS-HISTORY.md` (E-12+) for formal sign-off.

---

## 6) Known limitations

1. **Epson queue is in-memory** — backend restart drops pending print jobs. Re-print if needed after deploy.
2. **Email requires SendGrid** — `EmailReceiptService` (Nodemailer) is deprecated and not used.
3. **Closure XLSX** — only for `WEEKLY`, `MONTHLY`, `ANNUAL` bulletins (daily recap rows).

---

## 7) Rollback

1. Restore previous application artifact / restart previous service version.
2. DB rollback only if new migrations were applied and incompatible — prefer forward fix.
3. Re-verify printer poll URL and `pollKey` if printing config was changed during deploy.
