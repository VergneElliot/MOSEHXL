# Production Configuration Snapshot

Status: Filled 2026-07-16 — secrets redacted; live binary still pre-`self-cert-v2.0.0` deploy  
Related controls: `../04-OPERATIONAL-CONTROLS.md#control-7---environment-configuration-evidence`,
`../06-RELEASE-FREEZE-CHECKLIST.md`

---

## Record Identity

| Field | Value |
|-------|-------|
| Snapshot date/time | 2026-07-16 |
| Operator | Thomas (MOSEHXL publisher) |
| Reviewed by | Pending Phase 5 |
| Covered release/tag | Target `self-cert-v2.0.0`; host git at snapshot ≈ `13a2485` on `main` (not yet the frozen tag deploy) |
| Environment | Production (`mosehxl.com`) |

---

## Safety Rule

No secrets pasted. Secret keys confirmed present only as `[REDACTED]`.

---

## Runtime Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| `NODE_ENV` | `production` | `production` |
| CORS allowed origins | Production domains only | `https://mosehxl.com,https://www.mosehxl.com` |
| Listen port | Documented | `3001` (PM2 `mosehxl-backend` online) |
| Swagger try-it-out in prod | Disabled | Not re-validated in this snapshot — confirm at deploy of frozen tag |
| Error stack exposure | Disabled in production responses | Rely on production env path; confirm at deploy smoke |
| Structured log redaction | Enabled | Not separately dumped here |

---

## Database Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| DB TLS enabled | Yes | `DB_SSL=true` |
| DB TLS certificate verification | Enabled unless documented exception | **Exception:** `DB_SSL_REJECT_UNAUTHORIZED=false` (DO managed cert chain) |
| Application DB role | Least privilege | **Exception:** `DB_USER=doadmin` (superuser-equivalent managed role) — open remediation |
| Superuser access | Restricted/audited | Same as app role today — open |
| Backup user | Read-only where possible | Cron uses same `.env` credentials (`doadmin`) — open |
| Migration role | Controlled | Same credentials; migrations tracked in git |
| DB name / host | Documented | Host `mosehxl-production-do-user-…ondigitalocean.com:25060`, DB `mosehxl_production` |
| Legal journal triggers | Enabled | All three triggers `tgenabled=O` on production |

---

## Auth/Security Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| Access token lifetime | Short-lived | `AUTH_ACCESS_TOKEN_EXPIRES_IN=12h` |
| Refresh session windows | Documented | Session 1d / remember 30d / absolute max 180d |
| Refresh token transport | httpOnly cookie | Not re-dumped from code in this snapshot — see auth middleware at freeze tag |
| Admin 2FA enforcement | Enabled for production unless deferred | **Deferred:** `AUTH_ENFORCE_ADMIN_2FA=false` |
| JWT signing material | Present, protected | `JWT_SECRET` present (redacted) |
| Archive integrity key | Present, protected | `ARCHIVE_SECRET_KEY` present (redacted) |

---

## Fiscal Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| Legal journal DB triggers | Enabled | Confirmed on production |
| Archive storage location | Controlled/off-site preferred | Local `MuseBar/backend/exports/` on app host |
| Archive signing/integrity key storage | Secret manager / protected env | Env file on host (protected root); secret manager TBD |
| Closure scheduler | Configured | Production closures present (364 DAILY in dump) |
| Establishment legal identity fields | Required before fiscal docs | In product; not re-audited this snapshot |

---

## Backup/Retention Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| Daily backup | Enabled | Cron `15 3 * * * /var/www/MOSEHXL/scripts/backup-production-db.sh` |
| Long-retention backup | 6 years minimum | **Open** — 35-day rolling only today |
| Off-site copy | Enabled | **Partial** — `/root/mosehxl-backups` same host |
| Immutable/WORM copy | Preferred | **Open** |
| Restore drill cadence | Quarterly minimum | Drill done 2026-07-16; next ≤ 2026-10-16 |

---

## Approval

| Field | Value |
|-------|-------|
| Snapshot accepted? | Yes as dated Phase 4 capture |
| Approved by | Pending Phase 5 |
| Approval date | 2026-07-16 (operator) |
| Notes | Documented exceptions: TLS verify off, admin 2FA off, `doadmin` app role, incomplete off-site/WORM. Live deploy of frozen tag still pending by design. |
