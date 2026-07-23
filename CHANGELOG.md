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

## [2.0.3] — 2026-07-23 — post-freeze thoroughness (COMP batch)

**Fiscal impact:** PATCH (no ISCA parameter change — reconciliation tolerance,
duplicate DAILY guard, gap backfill; hash/trigger semantics unchanged).
Attestation `self-cert-v2.0.2` remains valid.

### Fixed

- Closure VAT reconciliation tolerates ≤ €0.01 drift (C-RECON)
- Block same-Paris-day DAILY duplicates with matching hash or ≥ amount
- Auto-closure backfills one missed sale-day per tick (C-GAP going forward)

### Added

- CI fiscal-path guard workflow
- Production MONTHLY archive evidence (COMP-4)
- COMP-1/2/3 operator setup docs; dossier hygiene supersession notes

---

## [2.0.2] — 2026-07-16 — `self-cert-v2.0.2`

**Fiscal impact:** PATCH (RLS tenant context for software-event journal writes).
**First signed attestation targets this tag.**

### Fixed

- Software-event journal appends now run under `runWithTenantContext`, so
  production can use least-privilege role `mosehxl_app` (no Bypass RLS) without
  failing `SERVER_STARTED` / critical software events

### Notes

- Continues 2.0.1 ops/dossier work; supersedes 2.0.1 as the live attested tip

---

## [2.0.1] — 2026-07-16 — `self-cert-v2.0.1`

**Fiscal impact:** PATCH relative to 2.0.0 (archive export bug fix + operational
controls). Superseded for signature by **2.0.2** same day.

### Fixed

- Archive export: generate file before DB INSERT; verify compares `Number(file_size)`

### Added

- Production backup script with daily rolling + monthly 6-year long-retention vault
- Optional S3/Spaces upload hooks; restore-drill helper; Phase 5 signing packet

### Security / ops

- Roles `mosehxl_app` / `mosehxl_backup`; DO/pghoard off-site backup evidence

---

## [2.0.0] — 2026-07-16 — `self-cert-v2.0.0`

**Fiscal impact:** MAJOR (first attested release line / quality-gate freeze).

### Added

- Self-certification dossier and execution roadmap
- Phase 1–2 forensic evidence; era-aware journal verifier

### Fixed

- TypeScript strictness in era-aware verifier

---

## Pre-2.0.0 (unversioned production history)

Prior to formal SemVer tagging, the product ran in production from mid-2025 with
incremental fiscal hardening. See `docs/patch-notes/LATEST-INDEX.md`.
