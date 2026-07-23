# Archive Export Record — Production

Status: Completed 2026-07-23 — COMP-4  
Related control: `../04-OPERATIONAL-CONTROLS.md#control-5---archive-export-procedure`  
Companion (restore-drill proof): `ARCHIVE-EXPORT-RECORD.md`

---

## Record Identity

| Field | Value |
|-------|-------|
| Export date/time | 2026-07-23 |
| Exported by | MOSEHXL publisher (Cursor-assisted COMP-4) |
| Reviewed by | Pending |
| Reason | Inspector-facing production archive row (live DB) |
| Covered release/tag | `self-cert-v2.0.2` (live) |

---

## Scope

| Field | Value |
|-------|-------|
| Establishment id | `ce1b61b1-10e7-430c-97aa-69297fafb780` |
| Establishment name | MuseBar |
| Period start | 2026-06-01T00:00:00.000Z |
| Period end | 2026-06-30T23:59:59.999Z |
| Archive type | MONTHLY |
| Archive id | **1** (production `archive_exports`) |
| Database | `mosehxl_production` |

---

## Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Archive exists | Pass | production id 1 |
| Archive verification passed | Pass | `isValid: true`, status `VERIFIED` |
| Signature/integrity metadata present | Pass | HMAC present; SHA-256 `c5ad0d4dda5c09dd…7769e9` |
| Export stored in evidence | Pass (metadata) | `raw/prod-archive-june-2026.meta.json` |

---

## Export Package

| Field | Value |
|-------|-------|
| Export path (server) | `/var/www/MOSEHXL/MuseBar/backend/exports/temp_1784824784984.json` |
| Export size | 5042565 bytes |
| Export checksum/hash | `c5ad0d4dda5c09ddc45802b79db091bf1046ed98c48cdb2f02c07c96b77769e9` |
| Retention | Keep with dossier ≥ 6 years |

---

## Approval

| Field | Value |
|-------|-------|
| Export accepted? | Yes |
| Approval date | 2026-07-23 (operator) |
| Notes | Created under `runWithTenantContext` as `mosehxl_app` |
