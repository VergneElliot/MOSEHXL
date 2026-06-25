# Restore Drill Record

Status: To fill before first attestation signature and quarterly afterward  
Related control: `../04-OPERATIONAL-CONTROLS.md#control-4---restore-drill`

---

## Record Identity

| Field | Value |
|-------|-------|
| Drill date | To fill |
| Operator | To fill |
| Reviewed by | To fill |
| Backup used | To fill |
| Backup date/time | To fill |
| Restored environment | To fill |
| Covered release/tag | To fill |

---

## Restore Procedure

| Step | Result | Evidence |
|------|--------|----------|
| Restore backup into isolated non-production database | To fill | To fill |
| Apply/replay migrations if needed | To fill | To fill |
| Verify migration status | To fill | To fill |
| Run legal journal integrity verification | To fill | To fill |
| Verify sample closure bulletin readability | To fill | To fill |
| Verify sample archive readability | To fill | To fill |
| Verify archive download/export works | To fill | To fill |
| Confirm no production data was modified | To fill | To fill |

---

## Suggested Commands

Capture exact command output in the evidence folder.

```bash
cd MuseBar/backend
npm run migration:status
npm test -- src/integration/real-db/compliance.real-db.test.ts
```

If using an API smoke test, also capture:

```text
GET /api/legal/journal/verify
GET /api/legal/archive/:id/verify
GET /api/legal/archive/:id/download
```

Replace paths with the actual mounted production API paths used by the release.

---

## Results

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Database restored | To fill | To fill |
| Migrations valid | To fill | To fill |
| Legal journal integrity valid | To fill | To fill |
| Closure records readable | To fill | To fill |
| Archive records readable | To fill | To fill |
| Archive export/download valid | To fill | To fill |
| RLS/tenant isolation valid | To fill | To fill |

---

## Issues and Corrective Actions

| Issue | Severity | Corrective action | Owner | Due date | Closed? |
|-------|----------|-------------------|-------|----------|---------|
| To fill | To fill | To fill | To fill | To fill | To fill |

---

## Approval

| Field | Value |
|-------|-------|
| Drill accepted? | To fill |
| Approved by | To fill |
| Approval date | To fill |
| Next scheduled drill | To fill |
