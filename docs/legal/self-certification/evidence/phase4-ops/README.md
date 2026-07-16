# Phase 4 — Operational controls evidence

**Date:** 2026-07-16  
**Environment:** production host `209.38.223.91` + DigitalOcean managed PostgreSQL  
**Covered release/tag:** `self-cert-v2.0.1`  
**Operator:** MOSEHXL publisher (Thomas / Cursor-assisted execution)  
**Closure addendum:** `2026-07-16-OPS-CLOSURE-ADDENDUM.md`

## Filled records

| Control | Record |
|---------|--------|
| Retention | `RETENTION-POLICY-RECORD.md` |
| Backups | `BACKUP-EVIDENCE-RECORD.md` |
| Restore drill | `RESTORE-DRILL-RECORD.md` |
| Archive export | `ARCHIVE-EXPORT-RECORD.md` |
| Production config | `PRODUCTION-CONFIG-SNAPSHOT.md` |

## Raw artefacts (non-secret)

| File | Description |
|------|-------------|
| `raw/mosehxl-prod-20260716-180021.dump.sha256` | SHA-256 of the drill source dump |
| `raw/restore-drill-summary.txt` | Counts, triggers, era-D hash check, cron |
| `raw/archive-id-2.meta.json` | Verified MONTHLY JSON archive metadata (restore-drill DB only) |

## Important boundaries

1. **Production journal untouched** during drill and archive test (`legal_journal` count stayed 21293; production `archive_exports` stayed 0).
2. Archive export/verify ran against isolated DB `mosehxl_restore_drill` only.
3. Daily cron + monthly 6-year vault + DO/pghoard off-site evidence closed for signature.
4. Optional hardening only: Spaces object-lock; admin 2FA after TOTP enrollment.

## Repo companions

- `scripts/backup-production-db.sh`
- `scripts/restore-drill.sh`
- `MuseBar/backend/src/models/archiveService.ts` (PENDING insert / bigint size verify fixes)
