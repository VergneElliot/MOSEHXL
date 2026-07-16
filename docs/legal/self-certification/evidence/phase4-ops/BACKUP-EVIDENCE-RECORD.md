# Backup Evidence Record

Status: Filled 2026-07-16 — daily + monthly long-retention + provider off-site confirmed  
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
| PostgreSQL physical/snapshot backup | Provider-managed (DO/pghoard) | Provider default | Evidenced 2026-07-16 | `raw/do-managed-restore-command.txt` |
| Monthly long-retention backup | Day-1 UTC / FORCE_MONTHLY | 2190 days (~6y) | 2026-07-16 seeded | `long-retention/mosehxl-prod-monthly-2026-07.dump` |
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
| Off-site provider | DigitalOcean managed DB backups (pghoard, off-droplet) + same-host secondary path; optional Spaces |
| Bucket/vault/location | Planned: object storage with object-lock (e.g. DO Spaces / S3) — TBD |
| Object lock / immutability enabled | Provider-managed backups; Spaces object-lock optional |
| Immutability retention period | N/A |
| Delete permission restricted | Root-only paths; not WORM |
| Encryption enabled | TLS in transit to DB; dump at rest unencrypted file |
| Evidence captured | `raw/restore-drill-summary.txt` (paths + cron) |

**Verdict:** Controls 2 and 3 ready for signature (provider off-site + monthly vault). Spaces WORM remains optional hardening.

---

## Validation

| Check | Result | Notes |
|-------|--------|-------|
| Backup job does not disable fiscal DB triggers | Pass | `pg_dump` read-only; triggers remain `O` on production |
| Backup job is read-only against source data | Pass | Dump only; production journal count unchanged through drill |
| Backup completed successfully | Pass | Dump + SHA-256 written |
| Backup is recoverable into isolated environment | Pass | See `RESTORE-DRILL-RECORD.md` |
| Long-retention copy exists | Pass | `long-retention/mosehxl-prod-monthly-2026-07.dump` |
| Off-site/immutable copy exists | Pass* | DO/pghoard off-droplet (*object-lock Spaces optional) |

---

## Approval

| Field | Value |
|-------|-------|
| Approved by | Pending Phase 5 |
| Approval date | — |
| Notes | See also `2026-07-16-OPS-CLOSURE-ADDENDUM.md`. |
