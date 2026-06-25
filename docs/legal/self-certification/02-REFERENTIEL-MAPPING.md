# 02 - Referentiel Mapping

Status: Draft mapping  
Scope source: `01-SCOPE.md`  
Evidence source: `05-EVIDENCE-INDEX.md`

---

## Mapping Method

This document maps the self-certification requirements at the level needed for
an engineering-backed attestation:

1. legal/fiscal requirement,
2. MOSEHXL implementation,
3. evidence to retain,
4. remaining operational action before signature.

This is not a full paid NF-525/LNE audit matrix. It is a self-certification
mapping aligned with CGI Article 286-I-3 bis and the ISCA pillars.

---

## Pillar I - Inalterabilite

Requirement: sales and correction records must be preserved without alteration;
any correction must be a new recorded event rather than a destructive edit.

| Control | MOSEHXL implementation | Evidence | Before signature |
|---------|------------------------|----------|------------------|
| Append-only fiscal journal | Completed sales, refunds, cancellations, and change operations append legal journal entries | `models/legalJournal/`, `routes/orders/orderCRUD.ts`, `services/orders/orderCancellationService.ts`, `routes/orders/orderChange.ts` | Capture test output and release commit |
| Per-establishment sequence | Legal journal entries are scoped by `establishment_id` with independent sequence/hash chains | `2026_04_23_00_00_00_legal_journal_per_establishment.sql`, `journalSigning.ts` | Verify migration status on frozen release |
| Hash-chain integrity | Each entry stores previous/current hash and verifier recomputes chain continuity | `journalSigning.ts`, `journalSigning.integrity.test.ts` | Export sample verification result |
| DB-level mutation denial | UPDATE/DELETE/TRUNCATE blocked on `legal_journal` in normal operation | `2026_05_21_18_30_00_block_legal_journal_truncate.sql`, real-db compliance tests | Attach real DB test output or controlled verification |
| DB-level insert validation | INSERT trigger validates sequence, previous hash, and current hash against expected chain state | `2026_05_21_18_45_00_enforce_legal_journal_hash_chain_on_insert.sql`, migration test | Attach migration/test evidence |
| Fail-closed fiscal writes | Fiscal routes abort when mandatory legal journal writes fail | `orderCRUD.journalFailSafe.test.ts`, `orderPayment.journalFailSafe.test.ts`, closure follow-up patch notes | Capture full backend test output |

Residual risk:

- Direct database superuser access can still bypass many database controls. This
  must be handled operationally through least-privilege production credentials,
  restricted DBA access, logging, and backup controls.

---

## Pillar S - Securisation

Requirement: operations must be attributable and protected; sensitive events
must be logged and unauthorized actions must be blocked.

| Control | MOSEHXL implementation | Evidence | Before signature |
|---------|------------------------|----------|------------------|
| User authentication | Modular auth routes with login, refresh rotation, logout, account lockout, TOTP, session revocation | `routes/authLogin/`, auth route tests | Capture auth-focused and full backend test output |
| Authorization and permissions | Legal and admin routes use role/permission gates | `middleware/auth.ts`, legal permission tests | Attach legal permission gate test results |
| Audit trail | Actions are written with user, tenant, resource, request context, details | `models/auditTrail.ts`, route/service call sites | Include audit model and sample output |
| Software events | Critical system/software events are journaled with fail-safe behavior | `services/legal/softwareEventJournal.runtime.test.ts`, `*.softwareEvents.test.ts` | Capture software-event test output |
| Token/session hardening | httpOnly refresh cookies, CSRF, refresh rotation/reuse detection, revoke-other-sessions, legacy claim metrics | auth hardening patch notes `365`-`389`, route tests | Include latest green suite output |
| Admin step-up controls | Admin TOTP lifecycle and login/support impersonation enforcement | `totpRoutes.ts`, `loginRoutes.ts`, `supportRoutes.ts`, admin 2FA tests | Confirm production env policy for admin 2FA |
| Tenant isolation | RLS and tenant context protect establishment-scoped data | `rls/`, RLS migration/test evidence | Attach real DB tenant isolation verification |

Residual risk:

- The attestation should include the production security configuration used at
  release freeze, especially CORS, DB TLS, JWT signing mode, admin 2FA policy,
  and backup access controls.

---

## Pillar C - Conservation

Requirement: fiscal data and summaries must be preserved for the legal retention
period and remain available for inspection.

| Control | MOSEHXL implementation | Evidence | Before signature |
|---------|------------------------|----------|------------------|
| Closure bulletins | Daily/monthly/annual closure paths with journal append and reconciliation metadata | `routes/legal/closure.ts`, `closureOperations.ts`, `closureScheduler.ts` | Capture closure tests and sample bulletin |
| Journal-based reconciliation | Closure totals reconciled against legal journal SALE aggregates | `2026_05_21_20_20_00_add_closure_journal_reconciliation_columns.sql` | Include sample closure reconciliation output |
| Receipt/document preservation | Receipt and document services preserve fiscal details for output/export | `services/receipts/`, `services/documents/` | Include sample receipt/archive output |
| Data retention policy | Retention is an operational requirement; code preserves fiscal rows but the operator must keep DB/backups for required duration | `04-OPERATIONAL-CONTROLS.md` | Implement and sign retention policy |
| Backup/restore continuity | Not purely code; must be proved through backup schedule and restore drills | `04-OPERATIONAL-CONTROLS.md` | Attach backup proof and restore drill logs |

Residual risk:

- Conservation cannot be claimed by code alone. The operator must prove
  retention, backup, and restore operations over time.

---

## Pillar A - Archivage

Requirement: fiscal data must be exportable, verifiable, sealed/signed, and
available to the administration for the required period.

| Control | MOSEHXL implementation | Evidence | Before signature |
|---------|------------------------|----------|------------------|
| Archive creation/listing | Legal archive routes and archive service create/list fiscal archives | `routes/legal/archive.ts`, `models/archiveService.ts` | Capture archive route/test output |
| Archive verify/download | HTTP surfaces exist for archive verification and download/export alias | Audit closure rows and archive route evidence | Include sample verify/download output |
| Export integrity metadata | Archive content includes signature/integrity metadata | `archiveService.ts`, `archiveService.generateExportContent.test.ts` | Attach sample archive package |
| Document/PDF/XLSX support | Fiscal documents can be generated in human-readable/exportable formats | `documentPdfService.ts`, `closureXlsxService.ts` | Include sample PDF/XLSX outputs if available |
| Off-site/WORM storage | Operational, not code-only | `04-OPERATIONAL-CONTROLS.md` | Implement before signing |

Residual risk:

- HMAC/signature handling is strong engineering evidence, but it is not the
  same as a qualified electronic signature. The self-certification should avoid
  overclaiming qualified-signature status.

---

## Supporting Requirement - Scope and Version Identification

| Control | MOSEHXL implementation | Evidence | Before signature |
|---------|------------------------|----------|------------------|
| Fixed release identity | Release tag/commit to be frozen before signature | `06-RELEASE-FREEZE-CHECKLIST.md` | Fill tag/commit/build version |
| Change traceability | Patch-note index and audit docs record changes | `docs/patch-notes/LATEST-INDEX.md` | Archive patch-note index at release freeze |
| Migration traceability | Migration manager records checksums and migration state | `migrations/migration-manager.ts` | Capture `npm run migration:status` output |
| Quality evidence | Type-check/lint/test gates pass | CI/local command outputs | Store command output with dossier |

---

## Supporting Requirement - Operator Controls

| Control | Owner | Evidence |
|---------|-------|----------|
| Production environment configuration | Operator/publisher | Release freeze checklist |
| Database least-privilege access | Operator | Operations policy and access log |
| Backup schedule | Operator | Backup logs |
| Off-site or immutable backup storage | Operator | Storage configuration/proof |
| Restore drill | Operator | Restore drill record |
| Archive export procedure | Operator | Runbook and sample export |
| Incident/change log | Operator/publisher | Patch notes, release notes, operations log |

These controls must be implemented before the attestation is signed, because
they are part of the practical ability to conserve and produce fiscal records.

---

## Current Mapping Verdict

Engineering status:

- Inalterabilite: code evidence strong, release evidence to attach.
- Securisation: code evidence strong, production configuration evidence to attach.
- Conservation: code evidence strong for fiscal records and closures, operational retention/backups still to implement and evidence.
- Archivage: code evidence strong for exports/verification, operational off-site/immutable storage still to implement and evidence.

Conclusion:

> MOSEHXL is ready for dossier assembly from a code-evidence perspective, but
> the attestation should not be signed until scope, release freeze, backup,
> retention, restore-drill, and archive-storage evidence are completed.
