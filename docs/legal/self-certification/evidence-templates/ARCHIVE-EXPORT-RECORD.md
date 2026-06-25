# Archive Export Record

Status: To fill before signing and for each inspection/export event  
Related control: `../04-OPERATIONAL-CONTROLS.md#control-5---archive-export-procedure`

---

## Record Identity

| Field | Value |
|-------|-------|
| Export date/time | To fill |
| Exported by | To fill |
| Reviewed by | To fill |
| Reason | Release evidence / tax inspection / other |
| Covered release/tag | To fill |

---

## Scope

| Field | Value |
|-------|-------|
| Establishment id | To fill |
| Establishment name | To fill |
| Period start | To fill |
| Period end | To fill |
| Archive type | Daily / Monthly / Annual / Other |
| Archive id | To fill |

---

## Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Archive exists | To fill | To fill |
| Archive verification passed | To fill | To fill |
| Archive download/export succeeded | To fill | To fill |
| Signature/integrity metadata present | To fill | To fill |
| Closure/journal data included | To fill | To fill |
| Export stored in evidence archive | To fill | To fill |

---

## API / Command Evidence

Capture the exact API responses or command output. Do not include secrets.

```text
GET /api/legal/archive/:id
POST /api/legal/archive/:id/verify
GET /api/legal/archive/:id/download
```

If the release uses different route prefixes, record the exact routes here:

| Route | Response/evidence location |
|-------|----------------------------|
| To fill | To fill |

---

## Export Package

| Field | Value |
|-------|-------|
| Export filename/path | To fill |
| Export size | To fill |
| Export checksum/hash | To fill |
| Storage destination | To fill |
| Retention period | To fill |

---

## Approval

| Field | Value |
|-------|-------|
| Export accepted? | To fill |
| Approved by | To fill |
| Approval date | To fill |
| Notes | To fill |
