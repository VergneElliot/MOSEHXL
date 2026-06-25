# 422 - Self-Certification Operational Evidence Templates - Implementation

Date: 2026-06-25  
Scope: Documentation / self-certification operational controls

---

## 1) Context

Patch `421` created the initial self-certification dossier foundation. The main
remaining blocker before a real signature is operational evidence: retention,
backups, off-site/immutable storage, restore drills, archive exports, and
release-freeze command outputs.

This implementation turns those controls into fillable records.

---

## 2) What changed

Added `docs/legal/self-certification/evidence-templates/` with:

| Template | Purpose |
|----------|---------|
| `README.md` | Explains how to copy templates into dated evidence folders |
| `RETENTION-POLICY-RECORD.md` | Records 6-year retention policy, storage locations, owners, and approval |
| `BACKUP-EVIDENCE-RECORD.md` | Records backup schedule, latest backup sample, off-site/immutable storage, and validation |
| `RESTORE-DRILL-RECORD.md` | Records restore drill steps, migration status, journal/archive verification, and corrective actions |
| `ARCHIVE-EXPORT-RECORD.md` | Records archive export, verify, download, checksum, and storage evidence |
| `PRODUCTION-CONFIG-SNAPSHOT.md` | Captures production configuration posture without secrets |
| `RELEASE-EVIDENCE-CAPTURE.md` | Captures release tag/commit, quality gates, migration evidence, fiscal smoke evidence, and linked operations records |

Updated:

1. `README.md` to list `evidence-templates/` in the dossier contents.
2. `04-OPERATIONAL-CONTROLS.md` to point each control to its record template.
3. `05-EVIDENCE-INDEX.md` to catalogue the templates as operational evidence.
4. `06-RELEASE-FREEZE-CHECKLIST.md` to use `RELEASE-EVIDENCE-CAPTURE.md` as the primary release record.

---

## 3) Outcome

The self-certification dossier now has practical, fillable evidence records.
The next step is operational execution: choose the production backup/storage
approach, perform a restore drill, capture a production-safe config snapshot,
and run the release evidence capture against a frozen tag/commit.

---

## 4) Verification

Documentation-only change. Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```
