# Backup Evidence Record

Status: Filled 2026-07-16 — daily logical backup live; off-site/WORM incomplete  
Related controls: `../04-OPERATIONAL-CONTROLS.md#control-2---backup-schedule`,
`../04-OPERATIONAL-CONTROLS.md#control-3---off-site--immutable-backup`

---

## Record Identity

| Field | Value |
|-------|-------|
| Record date | 2026-07-16 |
| Operator | Thomas (MOSEHXL publisher) |
| Reviewed by | Pending Phase 5 |
| Covered release/tag | `self-cert-v2.0.0` |
| Production environment | App host `209.38.223.91`; DB DigitalOcean managed `mosehxl_production` |

---

## Backup Jobs

| Backup job | Frequency | Retention | Last success | Evidence |
|------------|-----------|-----------|--------------|----------|
| PostgreSQL logical backup (`pg_dump` custom) | Daily 03:15 UTC via cron | 35 days rolling | 2026-07-16 18:00:21 UTC (manual seed + cron installed) | `raw/mosehxl-prod-20260716-180021.dump.sha256`; cron `15 3 * * * /var/www/MOSEHXL/scripts/backup-production-db.sh` |
| PostgreSQL physical/snapshot backup | Provider-managed (DO) | Confirm in DO console | **Confirm** automated backups enabled on the managed cluster | Operator action: DO control panel → Databases → Backups |
| Monthly long-retention backup | Not yet automated | Target 6 years | — | Open before signature |
| Fiscal archive backup | At export | Target 6 years | 2026-07-16 (restore-drill sample) | `ARCHIVE-EXPORT-RECORD.md` |
| Signed dossier backup | At each signed release | 6 years | N/A until Phase 5 signature | — |

**Prior state:** no automated daily dump cron; only ad-hoc dumps. Phase 4 installed `scripts/backup-production-db.sh` and the cron entry above.

---

## Latest Backup Sample

| Field | Value |
|-------|-------|
| Backup identifier/path | `/var/www/MOSEHXL/backups/mosehxl-prod-20260716-180021.dump` |
| Backup date/time | 2026-07-16 18:00:21 UTC |
| Backup type | Logical `pg_dump --format=custom` |
| Size | ~6.0 MiB |
| Encryption status | At-rest via host filesystem / DO volume; dump file itself not passphrase-encrypted |
| Storage class/location | App host primary + copy `/root/mosehxl-backups/` |
| Retention/expiry date | Rolling delete after 35 days per script |
| Checksum/hash if available | `6505821e2ecec01d2b4fb8dded61abae56b524dc0e28572c88772ca21c8f30f9` |

---

## Off-Site / Immutable Copy

| Field | Value |
|-------|-------|
| Off-site provider | **Not yet** — second copy is on the **same** droplet (`/root/mosehxl-backups`) |
| Bucket/vault/location | Planned: object storage with object-lock (e.g. DO Spaces / S3) — TBD |
| Object lock / immutability enabled | No |
| Immutability retention period | N/A |
| Delete permission restricted | Root-only paths; not WORM |
| Encryption enabled | TLS in transit to DB; dump at rest unencrypted file |
| Evidence captured | `raw/restore-drill-summary.txt` (paths + cron) |

**Verdict:** Control 2 (daily logical backup) = ready. Control 3 (true off-site / immutable) = **not ready** for signature without follow-up or formal residual-risk acceptance.

---

## Validation

| Check | Result | Notes |
|-------|--------|-------|
| Backup job does not disable fiscal DB triggers | Pass | `pg_dump` read-only; triggers remain `O` on production |
| Backup job is read-only against source data | Pass | Dump only; production journal count unchanged through drill |
| Backup completed successfully | Pass | Dump + SHA-256 written |
| Backup is recoverable into isolated environment | Pass | See `RESTORE-DRILL-RECORD.md` |
| Long-retention copy exists | Fail / open | Monthly 6-year vault not configured |
| Off-site/immutable copy exists | Fail / open | Same-host copy only |

---

## Approval

| Field | Value |
|-------|-------|
| Approved by | Pending Phase 5 |
| Approval date | — |
| Notes | Daily cron is the material Phase 4 win. Finish DO backup confirmation + object-lock vault before signing. |
