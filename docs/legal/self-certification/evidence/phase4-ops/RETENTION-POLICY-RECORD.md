# Retention Policy Record

Status: Filled 2026-07-16 — policy accepted; long-retention vault still open  
Related control: `../04-OPERATIONAL-CONTROLS.md#control-1---data-retention`

---

## Record Identity

| Field | Value |
|-------|-------|
| Record date | 2026-07-16 |
| Operator | Thomas (MOSEHXL publisher) |
| Reviewed by | Pending accountant/lawyer review (Phase 5) |
| Covered release/tag | `self-cert-v2.0.0` |
| Covered production environment | mosehxl.com / `mosehxl_production` (DigitalOcean managed PG) |

---

## Retention Commitment

| Data class | Retention period | Storage location | Owner |
|------------|------------------|------------------|-------|
| Legal journal | 6 years minimum | DO managed PostgreSQL `mosehxl_production` | Publisher / production operator |
| Audit trail | 6 years minimum | Same production DB | Publisher / production operator |
| Closure bulletins | 6 years minimum | Same production DB + exported archives | Publisher / production operator |
| Fiscal archives | 6 years minimum | App export dir + evidence copies; production archive table when used | Publisher / production operator |
| Receipt/invoice records | 6 years minimum | Same production DB | Publisher / production operator |
| Signed attestations | 6 years minimum | Dossier under `docs/legal/self-certification/` + off-site copy at signature | Publisher |
| Release evidence package | 6 years minimum | `docs/legal/self-certification/evidence/` + git history | Publisher |

---

## Storage Controls

| Control | Value |
|---------|-------|
| Primary database provider/location | DigitalOcean Managed PostgreSQL (`mosehxl-production-do-user-…`, DB `mosehxl_production`) |
| Backup provider/location | Daily `pg_dump` on app host `/var/www/MOSEHXL/backups` + copy `/root/mosehxl-backups`; provider-managed DO backups to confirm in console |
| Archive storage provider/location | Backend `exports/` on app host; Phase 4 sample under `backups/phase4-archive-evidence/` |
| Off-site copy provider/location | **Partial:** second path on same droplet only — not true geographic off-site / WORM yet |
| Object lock / immutability | **Not yet** configured (open item before signature) |
| Encryption at rest | DO managed DB encryption at rest (provider default); host disk LUKS status not separately attested |
| Encryption in transit | `DB_SSL=true` (TLS to managed PG); HTTPS to `https://mosehxl.com` |
| Delete permissions restricted to | Root on droplet + `doadmin` DB role (least-privilege app role still open) |

---

## Review Checklist

| Check | Result | Evidence |
|-------|--------|----------|
| Retention period is at least 6 years | Pass (policy) | This record |
| Backup retention matches policy | Partial | Daily dumps: 35-day rolling (`MOSEHXL_BACKUP_RETENTION_DAYS=35`). 6-year monthly vault **not yet** |
| Archive retention matches policy | Partial | Sample verified; production archive cadence not yet operationalized |
| Signed dossier retention matches policy | Pass (intent) | Git + evidence folders; signed PDF at Phase 5 |
| Owner assigned for quarterly review | Pass | Publisher / production operator; next restore drill ≤ 2026-10-16 |

---

## Approval

| Field | Value |
|-------|-------|
| Approved by | Pending Phase 5 legal/accountant review |
| Approval date | — |
| Notes | Policy is explicit 6-year minimum. Signature blocked until monthly long-retention + true off-site/WORM are either implemented or formally accepted as residual risk by reviewers. |
