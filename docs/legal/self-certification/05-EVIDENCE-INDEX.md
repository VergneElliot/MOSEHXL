# 05 - Evidence Index

Status: Draft  
Purpose: catalogue the technical and operational evidence used by the
self-certification dossier.

---

## Evidence Rules

Evidence used for a signed attestation must be:

1. tied to a fixed release tag/commit,
2. reproducible from source,
3. traceable to a requirement in `02-REFERENTIEL-MAPPING.md`,
4. archived with the signed attestation,
5. updated when material fiscal behavior changes.

---

## Primary Documentation Evidence

| Evidence | Path | Purpose |
|----------|------|---------|
| Current truth index | `docs/CURRENT-TRUTH.md` | Points to live state sources and patch-note index |
| Legal compliance chapter | `docs/course/07-LEGAL-COMPLIANCE.md` | Explains ISCA implementation model |
| Hard-copy audit | `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` | Historical audit and closure matrix |
| Code closure pass | `docs/audits/2026-05-28-code-closure-pass.md` | Confirms code remediation closure; procedural tasks excluded |
| Cleanup/performance roadmap | `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md` | Tracks latest green baseline and remaining non-cert tasks |
| Patch-note index | `docs/patch-notes/LATEST-INDEX.md` | Chronological change evidence |
| Invoice verification runbook | `docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.md` | B2B invoice compliance verification support evidence |
| Self-cert / e-reporting roadmap | `docs/roadmaps/2026-07-16-SELF-CERTIFICATION-RELEASE-AND-EREPORTING-PLAN.md` | Execution plan for freeze, attestation, and reform readiness |
| Hash-format eras forensic report | `docs/legal/self-certification/evidence/phase1-forensics/2026-07-16-HASH-FORMAT-ERAS.md` | Proves historical “tamper” flags are format-era artefacts |
| Closure anomaly analysis | `docs/legal/self-certification/evidence/phase1-forensics/2026-07-16-CLOSURE-ANOMALIES.md` | Explains zero/duplicate/backfilled/gap closures |
| Dev→prod migration incident | `docs/legal/self-certification/evidence/INCIDENT-2025-07-DEV-TO-PROD-MIGRATION.md` | Dated incident record for seq 608/609 migration |
| Anomaly register | `docs/legal/self-certification/evidence/ANOMALY-REGISTER.md` | Inspector-facing index of all known anomalies |

---

## Core Fiscal Code Evidence

| Requirement area | Code evidence |
|------------------|---------------|
| Legal journal append/read/signing | `MuseBar/backend/src/models/legalJournal/` |
| Journal hash generation and integrity verification | `MuseBar/backend/src/models/legalJournal/journalSigning.ts` |
| Journal append transaction/retry behavior | `MuseBar/backend/src/models/legalJournal/journalAppend.ts` |
| Journal read/stat/query facade | `MuseBar/backend/src/models/legalJournal/journalRead.ts`, `journalStats.ts`, `journalQueries.ts` |
| Order creation fiscal write | `MuseBar/backend/src/routes/orders/orderCRUD.ts`, `MuseBar/backend/src/services/orders/orderCreationService.ts` |
| Cancellation/refund/change fiscal writes | `MuseBar/backend/src/routes/orders/orderCancel.ts`, `orderChange.ts`, `MuseBar/backend/src/services/orders/orderCancellationService.ts` |
| Closure operations | `MuseBar/backend/src/routes/legal/closure.ts`, `MuseBar/backend/src/models/legalJournal/closureOperations.ts`, `MuseBar/backend/src/utils/closureScheduler.ts` |
| Archive operations | `MuseBar/backend/src/routes/legal/archive.ts`, `MuseBar/backend/src/models/archiveService.ts` |
| Compliance report | `MuseBar/backend/src/routes/legal/compliance.ts` |
| Business-day stats | `MuseBar/backend/src/routes/legal/businessDayStats.ts` |
| Invoice subsystem | `MuseBar/backend/src/routes/legal/invoices.ts` |
| Receipt/document generation | `MuseBar/backend/src/services/receipts/`, `MuseBar/backend/src/services/documents/` |
| Printing and print bridge | `MuseBar/backend/src/routes/printing.ts`, `MuseBar/backend/src/printing/`, `MuseBar/bridge/` |
| Audit trail | `MuseBar/backend/src/models/auditTrail.ts` and route/service call sites |
| Auth/session/security controls | `MuseBar/backend/src/routes/authLogin/`, `MuseBar/backend/src/middleware/auth.ts`, `MuseBar/backend/src/security/` |

---

## Database and Migration Evidence

| Evidence | Path |
|----------|------|
| Per-establishment legal journal chain | `MuseBar/backend/src/migrations/files/2026_04_23_00_00_00_legal_journal_per_establishment.sql` |
| RLS/tenant isolation | `MuseBar/backend/src/migrations/files/2026_04_24_00_00_00_row_level_security_tenant_isolation.sql` |
| A3 constraints hardening | `MuseBar/backend/src/migrations/files/2026_04_29_18_00_00_a3_constraints_hardening.sql` |
| Block legal journal TRUNCATE | `MuseBar/backend/src/migrations/files/2026_05_21_18_30_00_block_legal_journal_truncate.sql` |
| Enforce legal journal hash chain on INSERT | `MuseBar/backend/src/migrations/files/2026_05_21_18_45_00_enforce_legal_journal_hash_chain_on_insert.sql` |
| Closure reconciliation columns | `MuseBar/backend/src/migrations/files/2026_05_21_20_20_00_add_closure_journal_reconciliation_columns.sql` |
| Legal invoices | `MuseBar/backend/src/migrations/files/2026_05_28_20_30_00_add_legal_invoices.sql` |
| Migration checksum enforcement | `MuseBar/backend/src/migrations/migration-manager.ts` |

Release freeze evidence should include:

```bash
cd MuseBar/backend
npm run migration:status
```

Store the output with the signed dossier.

---

## Test Evidence

| Evidence type | Representative tests |
|---------------|----------------------|
| Real DB legal journal immutability and RLS | `MuseBar/backend/src/integration/real-db/compliance.real-db.test.ts` |
| Legal journal hash-chain enforcement migration | `MuseBar/backend/src/migrations/legalJournalHashChainEnforcement.migration.test.ts` |
| A3 constraints migration hardening | `MuseBar/backend/src/migrations/a3ConstraintsHardening.migration.test.ts` |
| Journal append transaction behavior | `MuseBar/backend/src/models/legalJournal/journalQueries.appendEntryTransactional.test.ts` |
| Journal integrity verification | `MuseBar/backend/src/models/legalJournal/journalSigning.integrity.test.ts` |
| Order fail-closed journal behavior | `MuseBar/backend/src/routes/orders/orderCRUD.journalFailSafe.test.ts`, `orderPayment.journalFailSafe.test.ts` |
| Closure scheduler/journal behavior | `MuseBar/backend/src/utils/closureScheduler.test.ts` |
| Legal archive/closure permissions | `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts` |
| Legal permission gates | `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts` |
| Invoice route compliance | `MuseBar/backend/src/routes/legal/invoices.routes.test.ts` |
| Receipt legal mention/parity | `MuseBar/backend/src/services/printing/BasePrintingService.receiptLegalMention.test.ts`, `eposPrintXml.receiptParity.test.ts` |
| Archive export content | `MuseBar/backend/src/models/archiveService.generateExportContent.test.ts` |
| Auth/session hardening | `MuseBar/backend/src/routes/authLogin.*.test.ts`, `MuseBar/backend/src/middleware/security/` |
| Software events | `MuseBar/backend/src/services/legal/softwareEventJournal.runtime.test.ts`, `*.softwareEvents.test.ts` |

Release freeze evidence should include at minimum:

```bash
cd MuseBar/backend
npm run type-check
npm run lint
npm test
```

For complete product release evidence, also capture root/frontend/bridge quality
gates as defined by CI.

---

## Patch-Note Evidence Clusters

| Cluster | Patch notes |
|---------|-------------|
| Initial compliance hardening | `98` through `117` |
| Legal journal and closure wiring | `174` through `177`, `264` through `269`, `360` through `361` |
| Software event/fail-safe hardening | `180` onward, plus software-event implementation notes |
| DB immutability triggers | `280` through `281` |
| Real DB compliance tests | `308` through `309` |
| Admin/auth hardening supporting securisation | `365` through `389` |
| Receipt/invoice/closure printing parity | `390` through `412` |
| Cleanup green baseline and modularity | `413` through `420` |

Use `docs/patch-notes/LATEST-INDEX.md` as the generated source of truth for
exact patch-note paths.

---

## Operational Evidence To Attach Later

| Evidence | Required before signature? | Storage recommendation |
|----------|----------------------------|------------------------|
| Signed attestation PDF | Yes | Dossier archive + off-site copy |
| Release tag/commit output | Yes | Dossier archive |
| Test command outputs | Yes | Dossier archive |
| Migration status output | Yes | Dossier archive |
| Production env control checklist | Yes | Dossier archive |
| Backup schedule proof | Yes | Operations folder |
| Off-site/WORM backup proof | Yes | Operations folder |
| Restore drill record | Yes | Operations folder |
| Archive export sample | Strongly recommended | Dossier archive |
| Journal integrity verification output | Strongly recommended | Dossier archive |

Use the fillable templates in `evidence-templates/` to create these records:

| Template | Evidence produced |
|----------|-------------------|
| `evidence-templates/RETENTION-POLICY-RECORD.md` | Approved 6-year retention policy and storage ownership |
| `evidence-templates/BACKUP-EVIDENCE-RECORD.md` | Backup schedule, latest successful backup, long-retention/off-site/immutable proof |
| `evidence-templates/RESTORE-DRILL-RECORD.md` | Restore drill result and corrective actions |
| `evidence-templates/ARCHIVE-EXPORT-RECORD.md` | Archive export/verify/download evidence |
| `evidence-templates/PRODUCTION-CONFIG-SNAPSHOT.md` | Non-secret production configuration evidence |
| `evidence-templates/RELEASE-EVIDENCE-CAPTURE.md` | Release tag/commit, command outputs, and linked operational evidence |
