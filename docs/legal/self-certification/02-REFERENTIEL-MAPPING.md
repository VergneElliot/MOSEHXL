# 02 - Referentiel Mapping

Status: **Reviewed** — 2026-07-16 against freeze line `self-cert-v2.0.1`  
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
| Append-only fiscal journal | Completed sales, refunds, cancellations, and change operations append legal journal entries | `models/legalJournal/`, `routes/orders/orderCRUD.ts`, `services/orders/orderCancellationService.ts`, `routes/orders/orderChange.ts` | **Done** — Phase 3 tests |
| Per-establishment sequence | Legal journal entries are scoped by `establishment_id` with independent sequence/hash chains | `2026_04_23_00_00_00_legal_journal_per_establishment.sql`, `journalSigning.ts` | **Done** — 44 migrations |
| Hash-chain integrity | Each entry stores previous/current hash; era-aware verifier + documented exceptions | `journalSigning.ts`, Phase 1 forensics | **Done** |
| DB-level mutation denial | UPDATE/DELETE/TRUNCATE blocked on `legal_journal` in normal operation | truncate/hash-chain migrations, real-db tests | **Done** |
| DB-level insert validation | INSERT trigger validates sequence/previous/current hash | hash-chain enforcement migration + tests | **Done** |
| Fail-closed fiscal writes | Fiscal routes abort when mandatory legal journal writes fail | journal fail-safe tests | **Done** |

Residual risk:

- Managed-cluster admin role `doadmin` retains elevated rights for migrations.
  Application runtime uses least-privilege role `mosehxl_app` (no Bypass RLS).
  See `evidence/phase4-ops/PRODUCTION-CONFIG-SNAPSHOT.md`.

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
| Data retention policy | 6-year minimum policy documented and owned | `evidence/phase4-ops/RETENTION-POLICY-RECORD.md` | **Done** |
| Backup/restore continuity | Daily dumps + monthly long-retention + restore drill | `evidence/phase4-ops/BACKUP-EVIDENCE-RECORD.md`, `RESTORE-DRILL-RECORD.md` | **Done** |

Residual risk:

- Conservation cannot be claimed by code alone. The operator must prove
  retention, backup, and restore operations over time.

---

## Pillar A - Archivage

Requirement: fiscal data must be exportable, verifiable, sealed/signed, and
available to the administration for the required period.

| Control | MOSEHXL implementation | Evidence | Before signature |
|---------|------------------------|----------|------------------|
| Archive creation/listing | Legal archive routes and archive service create/list fiscal archives | `routes/legal/archive.ts`, `models/archiveService.ts` | **Done** — Phase 4 sample |
| Archive verify/download | Verify path proven (`isValid: true`) on restore-drill DB | `evidence/phase4-ops/ARCHIVE-EXPORT-RECORD.md` | **Done** |
| Export integrity metadata | Archive content includes signature/integrity metadata | meta JSON + tests | **Done** |
| Document/PDF/XLSX support | Fiscal documents can be generated in human-readable/exportable formats | document/closure export services | Available in product |
| Off-site / long-retention storage | Provider-managed DB backups (pghoard) + monthly 6-year dump vault; optional Spaces/WORM via env | `BACKUP-EVIDENCE-RECORD.md` | **Done** (Spaces object-lock optional) |

Residual risk:

- HMAC/signature handling is strong engineering evidence, but it is not the
  same as a qualified electronic signature. The self-certification should avoid
  overclaiming qualified-signature status.

---

## Supporting Requirement - Scope and Version Identification

| Control | MOSEHXL implementation | Evidence | Before signature |
|---------|------------------------|----------|------------------|
| Fixed release identity | `self-cert-v2.0.1` / MOSEHXL 2.0.1 | `06-RELEASE-FREEZE-CHECKLIST.md`, `01-SCOPE.md` | **Done** |
| Change traceability | Patch-note index and audit docs record changes | `docs/patch-notes/LATEST-INDEX.md` | **Done** — Phase 3 capture |
| Migration traceability | Migration manager records checksums and migration state | migration status outputs | **Done** |
| Quality evidence | Type-check/lint/test gates pass | `evidence/phase3-release-freeze/` | **Done** |

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

Engineering + operational status (2026-07-16):

- Inalterabilite: code + release + forensic evidence complete.
- Securisation: code + production config snapshot complete (`mosehxl_app` least privilege).
- Conservation: retention policy, daily backups, monthly 6-year vault, restore drill complete;
  provider-managed DB backups evidenced via pghoard `restore_command`.
- Archivage: archive export/verify sample complete; optional object-lock Spaces is hardening only.

Conclusion:

> Mapping is complete for signature of `self-cert-v2.0.1`. Remaining work is
> publisher identity + wet signature (`07-SIGNING-PACKET.md`).
