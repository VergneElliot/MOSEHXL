# Self-Certification Release Plan & E-Reporting Readiness Roadmap

Date: 2026-07-16
Status: APPROVED PLAN — execution in progress
Owner: MOSEHXL publisher (Thomas Martins) with AI agent assistance
Supersedes nothing; complements `docs/legal/self-certification/` (the dossier) and
`docs/roadmaps/2026-07-01-PRODUCT-OPTIONS-AND-KITCHEN-PRINTING.md` (product track).

---

## 1. Purpose and how to read this document

This document is the single plan for taking MOSEHXL/MuseBar from its current state
("engineering complete, paperwork pending") to a **signed publisher self-certification
attestation** under article 286-I-3° bis of the CGI, and for preparing the system for
the **French e-invoicing/e-reporting reform** (deadlines 2026-2027).

It is written to serve three audiences:

- **Us, now** — as the execution checklist we follow phase by phase.
- **A future reader** (new developer, auditor, accountant, lawyer) — as the explanation
  of *why* each step was done and where its evidence lives.
- **The certification dossier** — several deliverables produced here are filed directly
  into `docs/legal/self-certification/` as evidence.

Each phase states: objective, why it matters, tasks, deliverables, and exit criteria.
Phases 1-5 happen **before** the version freeze and signature. Phases 6-7 happen
**after**, as minor/major updates per the legal versioning rules (§ 3).

---

## 2. Legal context (plain-language summary, verified July 2026)

### 2.1 Cash-register compliance (the attestation we are signing)

- French law requires any POS/cash-register software to guarantee four conditions,
  known as **ISCA**: Inaltérabilité (data cannot be altered), Sécurisation (secured),
  Conservation (retained), Archivage (archived).
- Proof is either a third-party certificate (NF525/LNE) **or an individual attestation
  signed by the software's publisher** ("self-certification").
- History that matters: the 2025 finance law (art. 43) had *abolished* the publisher
  attestation; the **2026 finance law (loi n° 2026-103 of 19 Feb 2026, art. 125)
  restored it**. As of today the publisher attestation is a fully valid proof.
  Sources: economie.gouv.fr, impots.gouv.fr FAQ, BOFiP BOI-TVA-DECLA-30-10-30.
- The merchant's exposure without proof: fine of 7 500 € per register
  (CGI art. 1770 duodecies), with 60 days to comply after a control.
- MOSEHXL is the publisher (éditeur). MuseBar (the bar) is the merchant (assujetti).
  The publisher signs the attestation; the merchant keeps a copy to show inspectors.

### 2.2 Major vs minor versions (when re-attestation is needed)

Per BOFiP BOI-TVA-DECLA-30-10-30:

- A **major version** modifies one or more parameters impacting the ISCA conditions
  (journal, hash chain, closures, archiving, their security). It **invalidates** the
  attestation → a new attestation must be issued for the new version.
- A **minor version** does not touch those parameters. The existing attestation
  **remains valid**. Renewal is based on this distinction, not on a calendar.
- Fiscal counters (journal sequence numbers) must NEVER reset across versions.

Practical policy adopted:

1. Every release gets a changelog entry stating whether fiscal modules were touched.
2. The compliance test suite runs before every release (CI + manual gate).
3. Any change under `MuseBar/backend/src/models/legalJournal/`,
   `routes/legal/`, `models/archiveService.ts`, `utils/closureScheduler.ts`,
   or the legal DB triggers/migrations ⇒ treated as **major** ⇒ new attestation.

### 2.3 E-invoicing / e-reporting reform (the 2026-2027 mandate)

- **1 Sept 2026** — every business must be able to *receive* electronic invoices.
  This is satisfied by the bar registering with a **Plateforme Agréée (PA)**;
  received invoices land on the PA's web portal. **No MuseBar change required.**
  The bar's accounting firm offers this via **JeFacture.com**, built on **Banqup
  (Unifiedpost)**, a registered PA. API specs: `dev.btx.banqup.com` (still in
  development on their side; usage will be billed — pricing TBD).
- **1 Sept 2027** — small businesses (the bar) must *emit* B2B invoices
  electronically (Factur-X/UBL/CII via a PA) and transmit **e-reporting** of B2C
  sales: daily aggregated totals (HT base per VAT rate + VAT amounts, per operation
  category) — essentially the data already in our daily closure bulletins.
- **Official formats** (this is what "compatible" means):
  - E-reporting B2C = **Flux 10.3** XML, per DGFiP *Spécifications externes* v3.2
    (30 Apr 2026), annexe 6, and AFNOR standard **XP Z12-012**.
    Aggregation per day × operation category × VAT rate. Category codes:
    `TPS1` (services — on-site consumption) / `TLB1` (goods — takeaway).
    Simplifications confirmed by DGFiP: no empty reports needed; transaction
    counts per rate no longer required.
  - B2B invoices = **Factur-X** (PDF with embedded XML), UBL 2.1 or CII D22B.
- Classification of the export work under § 2.2: **minor** (read-only export of
  existing closure/invoice data; no ISCA parameter touched) ⇒ ships post-freeze
  under the same attestation (Phase 6).

---

## 3. Decisions taken (with rationale)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Sign a **publisher self-attestation** now; no third-party NF525/LNE for v1 | Legally valid again (LF2026 art. 125); third-party cert re-evaluated later if law shifts or sales require it |
| D2 | First attestation scope = **B2C POS fiscal core**; B2B invoice subsystem documented as adjacent | Keeps the signed claim small and defensible; invoices are implemented but can join scope at a later attestation |
| D3 | Invoice **viewer** (received supplier invoices via Banqup API) deferred to **v2** | Duplicate of the JeFacture portal the bar gets anyway; PA API unfinished; keeps freeze scope clean |
| D4 | **Flux 10.3 XML export** of closure bulletins = **post-freeze minor release** (Phase 6) | Read-only export ⇒ minor per § 2.2; spec still evolving (v3.2 Apr 2026); no legal deadline before Sept 2027 |
| D5 | First PA integration target = **Banqup/JeFacture** | Accounting firm relationship; written spec link received; connector built behind an internal provider interface so other PAs can be added per-customer later |
| D6 | Historical journal anomalies handled by **investigation + documented incident report**, never by rewriting data | Rewriting the journal would be actual falsification; documented artifacts with reconciliation are the defensible path |

---

## 4. Phase 1 — Forensic investigation of production journal data

**Objective:** understand and characterize every integrity anomaly in the production
legal journal and closure history, with mathematical proof where possible.

**Why:** the attestation asserts the system detects alteration. Unexplained
"tampered" flags in production would contradict it; *explained* flags demonstrate
the control works. An inspector must find a written explanation for every anomaly.

### 4.1 Preliminary findings (read-only pass, 2026-07-16, production DB)

- One establishment journal: **21 281 entries**, sequences 1 → 21 281,
  **zero sequence gaps**, spanning 2025-07-17 → 2026-07-15.
- Exactly **one hash-chain link break**: sequence **609** (2025-07-30) — its
  `previous_hash` does not equal the `current_hash` of sequence 608. Working
  hypothesis: the dev→production data migration splice point (~first month of
  transactions were migrated from the local development DB).
- Recomputing `current_hash` with the **current** payload format (DB trigger
  format): all entries **before June 2026 fail**, June 2026 is mixed
  (884 pass / 945 fail), **July 2026 passes 100%**. This bucket pattern matches
  the dates when the hash payload format changed in code (decimal formatting
  `toFixed(4)`, timestamp serialization, order-id encoding — see git history of
  `journalAppend.ts`), **not** a pattern of data alteration.
- No NULL fiscal fields anywhere. Transaction mix: 20 945 SALE, 172 REFUND,
  116 CORRECTION, 34 CLOSURE, 12 CHANGE, 2 ARCHIVE.

### 4.2 Remaining tasks

1. **Era reconstruction:** from git history, enumerate each historical hash payload
   format ("era") with its date range (initial commit format → toFixed(4) change →
   TIMESTAMPTZ migration 2026-02-25 → DB trigger 2026-05-21 → current).
2. **Per-era verification:** re-run the read-only recomputation applying each era's
   own format to its own date range. Goal: demonstrate that (nearly) every entry
   verifies under the format in force when it was written ⇒ data intact, flags are
   format-evolution artifacts.
3. **Sequence 609:** characterize the break precisely (what changed, what the
   migration did, wall-clock context); verify amounts around the splice reconcile
   with that day's closure bulletin.
4. **Closure anomalies** (from the May 2026 report): list and explain the 35
   zero-amount closures, 17 same-day duplicates, the backfilled 2025-12-01 closure
   (closed 2026-01-02), the 0-transaction bulletin with non-zero revenue, and the
   ~54 calendar days without bulletins (expected: closed days + pre-auto-scheduler
   gaps).
5. **Reconciliation:** journal totals vs closure bulletins vs (with the accountant)
   VAT declarations for at least 2 sample months including the migrated month.

**Deliverables:** raw query outputs saved under
`docs/legal/self-certification/evidence/phase1-forensics/` (create folder);
all queries strictly read-only (`BEGIN READ ONLY`).

**Exit criteria:** every anomaly class has a root cause backed by evidence, or is
explicitly listed as "unexplained" with residual-risk assessment.

---

## 5. Phase 2 — Incident report and anomaly register

**Objective:** convert Phase 1 findings into permanent, dated documentation.

**Tasks:**

1. Write `docs/legal/self-certification/evidence/INCIDENT-2025-07-DEV-TO-PROD-MIGRATION.md`:
   what was migrated, when, why the chain shows one splice break, proof amounts are
   unchanged, reconciliation results.
2. Write `docs/legal/self-certification/evidence/ANOMALY-REGISTER.md`: one entry per
   anomaly class (hash format eras, seq 609, closure anomalies), each with cause,
   evidence pointer, and status.
3. Record a `SOFTWARE_EVENT` journal entry (via the existing software event journal)
   referencing the incident report, so the explanation lives inside the system.
4. Reference both documents from `05-EVIDENCE-INDEX.md` and scope wording in
   `01-SCOPE.md` ("journal history includes one documented migration event...").

**Exit criteria:** dossier reviewers can go from any flag to its explanation in
two clicks. Nothing in the journal itself is modified.

---

## 6. Phase 3 — Versioning and release freeze

**Objective:** a tagged, immutable, fully tested release that the attestation names.

**Tasks:**

1. Adopt semantic versioning with the legal overlay from § 2.2
   (MAJOR = fiscal-impacting, MINOR/PATCH = everything else).
2. Choose the freeze commit (current `main`/`development` HEAD after Phases 1-2
   merge), set `version` in `MuseBar/package.json`, `MuseBar/backend/package.json`,
   `packages/types/package.json` (proposal: **`2.0.0`** to mark the first attested
   line; bridge stays on its own versioning).
3. Create `CHANGELOG.md` (root): retroactive summary of major milestones, then the
   frozen release entry with the fiscal-impact statement.
4. Run all gates on the freeze commit: backend tests, frontend tests, lint,
   type-check, `check:schema-drift`, real-DB compliance suite. Capture outputs
   into `evidence-templates/RELEASE-EVIDENCE-CAPTURE.md` (filled copy under
   `evidence/`).
5. Execute `06-RELEASE-FREEZE-CHECKLIST.md` item by item.
6. Tag: `self-cert-v2.0.0` (annotated, signed if GPG available). Push tag.
7. Deploy the tag to production (mosehxl.com); record deployed commit hash in
   `evidence-templates/PRODUCTION-CONFIG-SNAPSHOT.md` (filled copy).
8. Branch policy after freeze: `main` = frozen tag only; feature work on
   `development`; hotfixes to the frozen line get PATCH versions after gate re-run.

**Exit criteria:** production runs the exact tagged commit; all gates green on that
commit with captured evidence; attestation draft references the tag.

---

## 7. Phase 4 — Operational controls execution

**Status (2026-07-16): DONE for technical exit** — filled records in
`docs/legal/self-certification/evidence/phase4-ops/`. Scripts:
`scripts/backup-production-db.sh`, `scripts/restore-drill.sh`. Daily cron installed
on the production host. Restore drill + archive verify on `mosehxl_restore_drill`
only (production `archive_exports` stayed 0).

**Still open before signature (not blocking Phase 4 exit):** true off-site/WORM
object vault; 6-year monthly retention; confirm DO managed DB backups in console;
least-privilege app DB role; live deploy of `self-cert-v2.0.0`.

| Control | Action | Evidence file (filled copy) |
|---------|--------|------------------------------|
| Backups | Daily `pg_dump` cron + 35-day rolling; same-host secondary path | `evidence/phase4-ops/BACKUP-EVIDENCE-RECORD.md` |
| Restore drill | Isolated restore of prod dump; integrity + closures + archive | `evidence/phase4-ops/RESTORE-DRILL-RECORD.md` |
| Archive export | MONTHLY JSON on restore-drill DB; verify VALID | `evidence/phase4-ops/ARCHIVE-EXPORT-RECORD.md` |
| Retention | 6-year policy documented | `evidence/phase4-ops/RETENTION-POLICY-RECORD.md` |
| Config snapshot | Redacted prod config + documented exceptions | `evidence/phase4-ops/PRODUCTION-CONFIG-SNAPSHOT.md` |

**Exit criteria:** every template has a dated, filled counterpart under
`docs/legal/self-certification/evidence/` — **met** (see `evidence/phase4-ops/`).

---

## 8. Phase 5 — Dossier finalization and signature

**Objective:** a signable dossier.

**Tasks:**

1. `01-SCOPE.md`: finalize per decision D2, mark Approved.
2. `02-REFERENTIEL-MAPPING.md`: re-read against the frozen tag; update file paths
   if refactors moved code; mark Reviewed.
3. `03-ATTESTATION-DRAFT.md`: fill all placeholders (publisher identity, software
   name, **tag/version**, date, scope), aligned with the official attestation model
   (BOFiP annex).
4. `05-EVIDENCE-INDEX.md`: point every line at real evidence produced in
   Phases 1-4.
5. External review: accountant and/or lawyer appointment (**owner: Thomas**).
   Print, sign, archive the signed original; deliver a copy to the merchant (bar).

**Exit criteria:** signed attestation naming `self-cert-v2.0.0`, filed in the
dossier; bar holds its copy.

**⚠ After signature:** the § 2.2 policy is in force — fiscal-module changes require
a new attestation. CI should flag PRs touching the fiscal paths (guard to be added
in Phase 3).

---

## 9. Phase 6 — Post-freeze minor release: reform-compatible exports

**Objective:** MuseBar produces its fiscal data in the reform's official formats,
ahead of need and before any PA transmission work.

**Scope (all read-only ⇒ minor version, same attestation):**

1. **Flux 10.3 XML export of closure bulletins** — new export format alongside
   Excel/PDF: daily aggregates per operation category × VAT rate per the DGFiP
   external specifications v3.2 annexe 6 / XP Z12-012 semantic model. Includes
   mapping decision: which sales map to `TPS1` (on-site service) vs `TLB1`
   (takeaway goods). Today the bar is on-site only (10%/20% service rates) —
   confirm and encode the default, but make the mapping configurable for future
   restaurant customers with takeaway.
2. **Factur-X groundwork for B2B invoices** — generate the embedded-XML PDF for
   the existing `FAC-YYYY-NNNNNN` invoices, including the reform's new mandatory
   mentions (client SIREN, delivery address if different, operation category).
3. **Validation:** XSD validation against the official schemas (downloadable from
   impots.gouv.fr, "Spécifications externes" page) as part of tests.

**Deliberately out of scope here:** any transmission to a PA (that is Phase 7);
anything touching journal/closure/archive write paths.

**Exit criteria:** a closure bulletin can be exported as schema-valid Flux 10.3 XML;
an invoice can be exported as valid Factur-X; release shipped as v2.1.0 with a
changelog entry stating "no fiscal-impacting change".

---

## 10. Phase 7 — v3 horizon: PA connectivity (deadline 1 Sept 2027)

Not planned in detail yet; direction only:

1. **PA provider interface** in the backend (send e-report, send invoice, fetch
   received invoices, fetch statuses) with **Banqup adapter** first (D5).
2. **E-reporting transmission** on the bar's VAT-regime cadence, from the Phase 6
   Flux 10.3 exports.
3. **Received-invoices viewer** in MuseBar (D3) using the same adapter.
4. Classification (major/minor) decided when designed: pure additions reading
   fiscal data remain minor; anything touching fiscal write paths is major.
5. Watch items: Banqup API GA + pricing; DGFiP spec version bumps; PA readiness
   reports (129 PAs registered as of May 2026).

Parallel (independent) product track: schedule manager, reservations, multi-table /
multi-room orders, administrative management — all expected minor unless stated.

---

## 11. Responsibilities

| Who | What |
|-----|------|
| AI agent (with Thomas) | Phases 1-4 execution, Phase 5 document finalization, Phases 6-7 development |
| Thomas (publisher) | Decisions D1-D6 sign-off, lawyer/accountant appointment, signing the attestation, PA contract with accounting firm |
| Accounting firm | Bar's PA registration on JeFacture (before 1 Sept 2026), VAT reconciliation support (Phase 1.5), review of attestation (Phase 5) |

## 12. Risks

| Risk | Mitigation |
|------|------------|
| Law changes again on self-attestation | Attestation signed ASAP; dossier structured so a third-party audit could reuse it; monitor finance laws each year |
| Some journal eras don't verify even with era-correct format | Documented as residual anomaly with reconciliation-based defense (amounts consistent with closures + VAT filings); acceptable if bounded and explained |
| DGFiP spec version bump invalidates Phase 6 export | Export cites the spec version it implements; XSD validation in tests catches drift when we upgrade |
| Banqup API delays/pricing | Phase 6 is PA-independent by design; adapter interface allows switching PA |
| Accidental fiscal change after signature | CI guard on fiscal paths + changelog fiscal-impact statement per release |

## 13. Official references

- BOFiP BOI-TVA-DECLA-30-10-30 (ISCA conditions, attestation, major/minor versions)
- Loi n° 2026-103 du 19 février 2026 (finances 2026), art. 125 — restores publisher attestation
- CGI art. 286-I-3° bis; art. 1770 duodecies (fine)
- impots.gouv.fr — "Spécifications externes" page (external specs v3.2, annexes, XSD)
- AFNOR XP Z12-012 (semantic formats: Factur-X/UBL/CII, e-reporting XML)
- economie.gouv.fr — e-invoicing reform timeline (1 Sept 2026 / 1 Sept 2027)
- Banqup developer portal: dev.btx.banqup.com (first PA target)
