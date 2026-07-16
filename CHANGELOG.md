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

## [2.0.0] — 2026-07-16 — `self-cert-v2.0.0`

**Fiscal impact:** MAJOR (first attested release line).

First release intended for publisher self-certification under CGI art. 286-I-3° bis.

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
- Live cloud deploy of this tag is staged after operational evidence (Phase 4)
  and dossier finalization (Phase 5); git tag is the freeze identity

---

## Pre-2.0.0 (unversioned production history)

Prior to formal SemVer tagging, the product ran in production from mid-2025 with
incremental fiscal hardening (hash-chain DB triggers, closures, archives, auth,
multi-tenancy). See `docs/patch-notes/LATEST-INDEX.md` and
`docs/audits/2026-05-28-code-closure-pass.md`.
