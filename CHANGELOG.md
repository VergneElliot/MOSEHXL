# Changelog

All notable changes to MOSEHXL / MuseBar are documented here.

Versioning follows [SemVer](https://semver.org/) with a legal overlay for French
cash-register compliance (BOI-TVA-DECLA-30-10-30):

- **MAJOR** — change that modifies ISCA parameters (inalterability, security,
  conservation, archiving): legal journal, hash chain, closures, archives, or
  their enforcement. Requires a **new publisher attestation**.
- **MINOR** — new capability that does **not** modify ISCA parameters (features,
  exports, UI). Existing attestation remains valid.
- **PATCH** — bug fixes / non-fiscal hardening that do not modify ISCA parameters.

Fiscal sequence counters are never reset across versions.

---

## [2.0.1] — 2026-07-16 — `self-cert-v2.0.1`

**Fiscal impact:** PATCH relative to 2.0.0 (archive export bug fix + operational
controls). **First signed attestation targets this tag** so production runs the
fixed archive path and least-privilege DB role.

### Fixed

- Archive export: generate file before DB INSERT (PENDING `file_size=0` violated
  `file_size_positive`); verify compares `Number(file_size)` for pg bigint

### Added

- Production backup script with daily rolling + monthly 6-year long-retention vault
- Optional S3/Spaces upload hooks for true object-lock WORM
- Restore-drill helper script
- Phase 4–5 dossier close + signing packet

### Security / ops

- Application DB role `mosehxl_app` (no Bypass RLS / no CreateDB)
- Read-only `mosehxl_backup` role for `pg_dump` (BYPASSRLS only so dumps see all rows)
- Provider-managed DigitalOcean DB backups evidenced via pghoard `restore_command`

---

## [2.0.0] — 2026-07-16 — `self-cert-v2.0.0`

**Fiscal impact:** MAJOR (first attested release line / quality-gate freeze).

First release intended for publisher self-certification under CGI art. 286-I-3° bis.
Superseded for signature by **2.0.1** (same day) which includes archive fix + ops.

### Added

- Self-certification dossier and execution roadmap
- Phase 1–2 forensic evidence (hash-format eras, closure anomalies, migration incident)
- Era-aware legal journal integrity verification with `documented_exceptions`
- Compliance/journal API exposure of documented exceptions

### Fixed

- TypeScript strictness in era-aware verifier (backend production build)

### Notes for attestation

- Scope: B2C POS / cash-register fiscal core (see `docs/legal/self-certification/01-SCOPE.md`)
- Historical journal includes one documented dev→production migration (2025-07-30)
  and one documented recovery sale (seq 128); see anomaly register

---

## Pre-2.0.0 (unversioned production history)

Prior to formal SemVer tagging, the product ran in production from mid-2025 with
incremental fiscal hardening (hash-chain DB triggers, closures, archives, auth,
multi-tenancy). See `docs/patch-notes/LATEST-INDEX.md` and
`docs/audits/2026-05-28-code-closure-pass.md`.
