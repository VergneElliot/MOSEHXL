# 04 - Operational Controls

Status: Draft operational policy  
Owner to complete: production operator / MOSEHXL publisher  

---

## Why This Document Exists

The code can implement immutability, auditability, closure, and archive features,
but self-certification also needs evidence that the operated system preserves
fiscal data over time.

This document defines the controls that must exist before signing the
attestation.

Fillable evidence records live in `evidence-templates/`. For each real release
or operational control, copy the relevant template into a dated evidence folder
and fill it there.

---

## Control 1 - Data Retention

Policy:

> Fiscal data produced by MOSEHXL must be retained for at least 6 years, or the
> longer period required by applicable French tax/accounting rules for the
> operator.

Covered data:

| Data | Storage |
|------|---------|
| Legal journal | PostgreSQL production database |
| Audit trail | PostgreSQL production database |
| Closure bulletins | PostgreSQL production database and exported archive packages |
| Fiscal archives | Archive storage configured by the operator |
| Receipts/invoices | Database records and generated/exported documents where applicable |
| Migration/version evidence | Source control + release dossier |
| Signed attestations | Dossier archive + off-site copy |

Required evidence before signature:

1. production database backup retention setting,
2. archive storage retention setting,
3. written confirmation of 6-year minimum retention,
4. person/team responsible for retention monitoring.

Record template: `evidence-templates/RETENTION-POLICY-RECORD.md`.

Template:

| Field | Value |
|-------|-------|
| Retention period | 6 years minimum |
| Primary storage | To fill |
| Backup storage | To fill |
| Archive storage | To fill |
| Retention owner | To fill |
| Review cadence | Quarterly recommended |

---

## Control 2 - Backup Schedule

Minimum recommended schedule:

| Backup type | Frequency | Retention |
|-------------|-----------|-----------|
| PostgreSQL logical backup (`pg_dump`) | Daily | 35 days rolling minimum |
| PostgreSQL physical/snapshot backup | Daily or provider-managed | 35 days rolling minimum |
| Monthly long-retention backup | Monthly | 6 years |
| Signed archive package backup | At archive creation | 6 years |
| Self-certification dossier backup | At each signed release | 6 years |

Required evidence before signature:

1. backup job configuration,
2. latest successful backup log,
3. backup destination and access controls,
4. retention settings.

Record template: `evidence-templates/BACKUP-EVIDENCE-RECORD.md`.

Backup command example:

```bash
pg_dump "$DATABASE_URL" > "mosehxl-prod-$(date +%Y-%m-%d).sql"
```

Production backup jobs should not disable database triggers or mutate fiscal
tables. Routine backups must be read-only against source data.

---

## Control 3 - Off-Site / Immutable Backup

Requirement:

At least one backup copy must be stored away from the primary production
database environment. Prefer immutable/WORM-style retention where available.

Acceptable options:

| Option | Status |
|--------|--------|
| Cloud object storage with object lock/immutability | Recommended |
| Provider-managed immutable backup vault | Recommended |
| Encrypted off-site backup with restricted delete permissions | Acceptable if immutability unavailable |
| Same-server local backup only | Not sufficient |

Required evidence before signature:

1. storage provider/bucket/vault name,
2. immutability or delete-protection configuration,
3. encryption setting,
4. access-control list or IAM policy,
5. sample backup object metadata.

Record template: `evidence-templates/BACKUP-EVIDENCE-RECORD.md`.

Template:

| Field | Value |
|-------|-------|
| Off-site provider | To fill |
| Storage location | To fill |
| Encryption enabled | To fill |
| Object lock / immutability enabled | To fill |
| Delete permission restricted to | To fill |
| Evidence captured at | To fill |

---

## Control 4 - Restore Drill

Policy:

> A restore drill must be performed before signing the first attestation and at
> least once per quarter afterward.

Minimum drill:

1. restore latest production backup into an isolated non-production database,
2. apply/replay migrations if needed,
3. run migration status,
4. run legal journal integrity verification for a sample establishment,
5. verify closure/archive records are readable,
6. record the result.

Restore drill template:

| Field | Value |
|-------|-------|
| Drill date | To fill |
| Backup used | To fill |
| Restored environment | To fill |
| Operator | To fill |
| Migration status result | To fill |
| Journal integrity result | To fill |
| Archive read/verify result | To fill |
| Issues found | To fill |
| Corrective action | To fill |
| Approved by | To fill |

Suggested commands:

```bash
cd MuseBar/backend
npm run migration:status
npm test -- src/integration/real-db/compliance.real-db.test.ts
```

The exact real-DB test command depends on environment variables and should be
captured in the release freeze evidence.

Record template: `evidence-templates/RESTORE-DRILL-RECORD.md`.

---

## Control 5 - Archive Export Procedure

Policy:

> The operator must be able to export and verify legal archives for an
> establishment upon tax inspection request.

Procedure:

1. identify establishment and requested period,
2. create or locate existing archive for the period,
3. run archive verification,
4. download/export the archive package,
5. record who exported it, when, why, and for which period,
6. retain the exported archive package and verification result.

Evidence template:

| Field | Value |
|-------|-------|
| Export date | To fill |
| Establishment | To fill |
| Period | To fill |
| Archive id | To fill |
| Verification result | To fill |
| Exported by | To fill |
| Destination | To fill |
| Notes | To fill |

Record template: `evidence-templates/ARCHIVE-EXPORT-RECORD.md`.

---

## Control 6 - Production Access and Change Control

Minimum controls:

1. production database credentials are not shared,
2. application role has the least privileges needed for normal operation,
3. superuser/owner credentials are restricted and audited,
4. direct database changes to fiscal tables are prohibited outside controlled migrations,
5. migrations are reviewed and tracked by git commit,
6. fiscal behavior changes require patch notes and release evidence updates.

Change log template:

| Field | Value |
|-------|-------|
| Change date | To fill |
| Commit/tag | To fill |
| Fiscal behavior affected? | Yes/No |
| Migration affected? | Yes/No |
| Tests run | To fill |
| Dossier update required? | Yes/No |
| Approved by | To fill |

---

## Control 7 - Environment Configuration Evidence

At release freeze, capture production-relevant configuration without secrets:

| Setting area | Evidence to capture |
|--------------|---------------------|
| `NODE_ENV` | `production` |
| DB TLS | TLS enabled, certificate verification policy |
| JWT signing | Algorithm, key rotation/JWKS policy if enabled |
| Refresh cookies | httpOnly/Secure/SameSite policy |
| CORS | allowed production origins |
| Admin 2FA | enforcement setting |
| Backups | schedule and destination |
| Archive storage | local/off-site/immutable destination |

Do not put secrets in the dossier.

Record template: `evidence-templates/PRODUCTION-CONFIG-SNAPSHOT.md`.

---

## Operational Readiness Verdict

Before signing the attestation, mark each item:

| Control | Ready? | Evidence path/location |
|---------|--------|------------------------|
| 6-year retention policy | No | To fill |
| Daily backup schedule | No | To fill |
| Monthly 6-year backup retention | No | To fill |
| Off-site/immutable backup | No | To fill |
| Restore drill completed | No | To fill |
| Archive export procedure tested | No | To fill |
| Production access/change control documented | No | To fill |
| Release configuration captured | No | To fill |

Until these are marked ready, the dossier is technically strong but not yet
complete for a signed self-certification claim.

Use `evidence-templates/RELEASE-EVIDENCE-CAPTURE.md` to gather all release-time
evidence and link the completed operational records.
