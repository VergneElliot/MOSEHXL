# Archive Export Record

Status: Filled 2026-07-16 — procedure proven on isolated restore-drill DB (production untouched)  
Related control: `../04-OPERATIONAL-CONTROLS.md#control-5---archive-export-procedure`

---

## Record Identity

| Field | Value |
|-------|-------|
| Export date/time | 2026-07-16 (UTC evening session) |
| Exported by | Thomas (MOSEHXL publisher) / Cursor-assisted |
| Reviewed by | Pending Phase 5 |
| Reason | Release evidence — prove export + HMAC verify path without mutating production fiscal archives |
| Covered release/tag | Drill on restore-DB under 2.0.0-era code; **fixes live on `self-cert-v2.0.2`** — see also production archive record if present |

---

## Scope

| Field | Value |
|-------|-------|
| Establishment id | `ce1b61b1-10e7-430c-97aa-69297fafb780` |
| Establishment name | MuseBar |
| Period start | 2026-06-01T00:00:00.000Z |
| Period end | 2026-06-30T23:59:59.999Z |
| Archive type | MONTHLY |
| Archive id | 2 (on DB `mosehxl_restore_drill` only) |

---

## Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Archive exists | Pass | Drill `archive_exports` id 2 |
| Archive verification passed | Pass | `verification.isValid: true`, `errors: []` |
| Archive download/export succeeded | Pass | `/var/www/MOSEHXL/MuseBar/backend/exports/temp_1784224951819.json` |
| Signature/integrity metadata present | Pass | `digital_signature_present: true`; SHA-256 file hash recorded |
| Closure/journal data included | Pass | MONTHLY JSON package (~5.0 MiB) from restore of production data |
| Export stored in evidence archive | Pass (metadata) | `raw/archive-id-2.meta.json`; full JSON remains on server under `backups/phase4-archive-evidence/` |

**Production safety:** production `archive_exports` count remained **0**.

---

## API / Command Evidence

Export/verify executed via Node against compiled `ArchiveService` with `DB_NAME=mosehxl_restore_drill` (not via public HTTP against live prod, to avoid writing production archive rows).

Metadata evidence:

```text
raw/archive-id-2.meta.json
```

| Route / method | Response/evidence location |
|----------------|----------------------------|
| `ArchiveService.createArchiveExport` (MONTHLY JSON) | Server path above + meta JSON |
| `ArchiveService.verifyArchiveExport(2, …)` | `isValid: true` in meta JSON |

---

## Export Package

| Field | Value |
|-------|-------|
| Export filename/path | `…/exports/temp_1784224951819.json` (server) |
| Export size | 5042565 bytes |
| Export checksum/hash | `a2fd4cd9a445e1f6498b7a228a4dbc857ce6a25ff4b14a220f196eb9950aa77f` |
| Storage destination | App host exports + `backups/phase4-archive-evidence/`; meta in this evidence folder |
| Retention period | Keep with dossier ≥ 6 years |

---

## Approval

| Field | Value |
|-------|-------|
| Export accepted? | Yes as procedure proof |
| Approved by | Pending Phase 5 |
| Approval date | 2026-07-16 (operator) |
| Notes | After live deploy of fixed `archiveService`, optionally repeat one MONTHLY export into production `archive_exports` for inspector-facing production row evidence. **Done 2026-07-23:** see `ARCHIVE-EXPORT-RECORD-production.md`. |
