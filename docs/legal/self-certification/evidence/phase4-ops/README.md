# Phase 4 — Operational controls evidence

**Date:** 2026-07-16  
**Environment:** production host `209.38.223.91` + DigitalOcean managed PostgreSQL  
**Covered release/tag:** `self-cert-v2.0.0` (live deploy of this tag still deferred)  
**Operator:** MOSEHXL publisher (Thomas / Cursor-assisted execution)

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
3. Daily logical backup cron is now installed; **true off-site / WORM** and **6-year monthly vault** remain open follow-ups before signature.
4. Live cloud still runs a pre-freeze build until explicit deploy of `self-cert-v2.0.0`.

## Repo companions

- `scripts/backup-production-db.sh`
- `scripts/restore-drill.sh`
- `MuseBar/backend/src/models/archiveService.ts` (PENDING insert / bigint size verify fixes)
