# Restore Drill Record

Status: Completed 2026-07-16 — accepted for Phase 4 exit (ops gaps tracked separately)  
Related control: `../04-OPERATIONAL-CONTROLS.md#control-4---restore-drill`

---

## Record Identity

| Field | Value |
|-------|-------|
| Drill date | 2026-07-16 |
| Operator | Thomas (MOSEHXL publisher) / Cursor-assisted |
| Reviewed by | Pending Phase 5 |
| Backup used | `/var/www/MOSEHXL/backups/mosehxl-prod-20260716-180021.dump` |
| Backup date/time | 2026-07-16 18:00:21 UTC |
| Restored environment | Isolated DB `mosehxl_restore_drill` on same DO managed cluster (created via `defaultdb`, not `template1`) |
| Covered release/tag | `self-cert-v2.0.0` era snapshot (drill 2026-07-16); **live app since then:** `self-cert-v2.0.2` |

---

## Restore Procedure

| Step | Result | Evidence |
|------|--------|----------|
| Restore backup into isolated non-production database | Pass | `mosehxl_restore_drill` created; custom-format restore completed |
| Apply/replay migrations if needed | Pass / N/A | Dump included schema; 44 migration rows present |
| Verify migration status | Pass | 44 migrations recorded on drill DB |
| Run legal journal integrity verification | Pass (with known documented exception) | 0 sequence gaps; 1 intentional link break (seq 609 / Phase 1–2 incident); era-D hashes 1931/1931 pass |
| Verify sample closure bulletin readability | Pass | DAILY 364, WEEKLY 54, MONTHLY 20, ANNUAL 1 |
| Verify sample archive readability | Pass | Archive id 2 created on drill DB |
| Verify archive download/export works | Pass | File ~5.0 MiB; verify `isValid: true` after `archiveService` fix |
| Confirm no production data was modified | Pass | Production `legal_journal` = 21293; production `archive_exports` = 0 |

Raw summary: `raw/restore-drill-summary.txt`.

---

## Suggested Commands

Drill used host-side `pg_dump` / `pg_restore` plus SQL checks and a Node one-shot against `dist/models/archiveService` pointed at `DB_NAME=mosehxl_restore_drill`.

Repo helper for repeats: `scripts/restore-drill.sh`.

---

## Results

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Database restored | Pass | Row parity: 21293 journal entries |
| Migrations valid | Pass | 44 rows |
| Legal journal integrity valid | Pass* | *1 documented chain break at seq 609 (migration markers); see Phase 1–2 evidence |
| Closure records readable | Pass | 364 daily closures |
| Archive records readable | Pass | Drill DB only |
| Archive export/download valid | Pass | Hash `a2fd4cd9…aa77f`; status `VERIFIED` |
| RLS/tenant isolation valid | Not re-run in this drill | Covered by real-DB suite in Phase 3 freeze evidence; not re-executed here |

---

## Issues and Corrective Actions

| Issue | Severity | Corrective action | Owner | Due date | Closed? |
|-------|----------|-------------------|-------|----------|---------|
| `archiveService` INSERT PENDING with `file_size=0` violated `file_size_positive` | Medium | Generate file before INSERT; verify with `Number(file_size)` for pg bigint | Engineering | 2026-07-16 | Yes — shipped in 2.0.1 / live on 2.0.2 |
| First verify reported size mismatch (stale meta) | Low | Re-verify after fix; keep `raw/archive-id-2.meta.json` | Engineering | 2026-07-16 | Yes |
| Same-host “off-site” copy only | Medium | Provider pghoard + monthly vault; Spaces WORM optional (COMP-1) | Operator | 2026-07-16 | Closed for signature; Spaces optional |
| App DB role is `doadmin` (not least privilege) | Medium | Create `mosehxl_app` / `mosehxl_backup` | Operator | 2026-07-16 | Yes — live `DB_USER=mosehxl_app` on 2.0.2 |

---

## Approval

| Field | Value |
|-------|-------|
| Drill accepted? | Yes for Phase 4 technical exit |
| Approved by | Pending Phase 5 reviewer countersign |
| Approval date | 2026-07-16 (operator) |
| Next scheduled drill | On or before 2026-10-16 (quarterly) |
