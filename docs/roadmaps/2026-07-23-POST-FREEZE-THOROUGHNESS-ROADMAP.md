# Post-Freeze Thoroughness Roadmap — Optional Leftovers + Signature Path

Date: 2026-07-23  
Status: **DRAFT PLAN — ready to execute step by step**  
Owner: MOSEHXL publisher (Thomas) with AI agent assistance  
Builds on: `2026-07-16-SELF-CERTIFICATION-RELEASE-AND-EREPORTING-PLAN.md`  
Attested line today: **MOSEHXL 2.0.2** / tag **`self-cert-v2.0.2`**  
Human signature checklist: `docs/legal/self-certification/07-SIGNING-PACKET.md`

---

## 0. How to read this document

You asked to be thorough and to take **every leftover** from the self-certification
dossier. This plan splits work into two tracks:

| Track | Where it happens | Who mainly acts |
|-------|------------------|-----------------|
| **Track IRL** | Real world: company creation, lawyers, accountant, wet signature, PA contract | **You** (agent prepares texts/checklists) |
| **Track COMPUTER** | This machine + production server: code, scripts, config, tests, docs | **Agent + you** (you approve deploys / secrets) |

For every item you get:

1. **What it is** (plain language),
2. **Why we do it** (legal / security / ops reason),
3. **How we do it** (concrete steps),
4. **Done when** (exit criteria),
5. **Risk if we skip** (honest),
6. **Version impact** (does it force a new attestation?).

### Suggested global order (do not shuffle carelessly)

```text
IRL-1  Create éditeur company + get SIRET
IRL-2  Assign IP / droits d'auteur to that company (lawyer)
COMP-1 Spaces WORM backups          } can start in parallel
COMP-2 Admin 2FA enrollment         } once you have time
COMP-3 Secret manager (lighter)     }
COMP-4 Production archive export
COMP-5 CI fiscal-path guard
COMP-6 Closure polish (minor)
COMP-7 Phase 6 Flux 10.3 + Factur-X
IRL-3  Accountant VAT recon (Aug/Dec 2025)
IRL-4  Optional counsel review of attestation
IRL-5  Fill publisher identity + SIGN attestation
IRL-6  Give copy to the bar (merchant)
IRL-7  Bar registers on JeFacture PA (≤ 1 Sept 2026)
COMP-8 Quarterly restore drill (≤ 2026-10-16, then every quarter)
COMP-9 Phase 7 PA connectivity (toward 1 Sept 2027)
COMP-10 Product extras (schedule, reservations, …) — whenever
```

**Rule of thumb:** finish **IRL-1 + IRL-2** before **IRL-5** (signing), so the
attestation names the real éditeur entity. Coding tracks can run in parallel
and ship as **minor/patch** releases under the same attestation when they do
not touch ISCA write paths.

---

# TRACK IRL — Administrative & legal (outside the IDE)

---

## IRL-1 — Create a legitimate éditeur company with a SIRET

### What it is

A **SIRET** is a 14-digit French business identifier (SIREN 9 digits for the
company + 5 digits for the establishment). Banks, tax office, customers, and
your attestation all prefer a real legal entity as “éditeur du logiciel”.

You are creating a company that will **own and publish** MOSEHXL (the software),
while the bar (MuseBar) remains the **merchant** that *uses* the cash register.

### Why (recommended, not strictly required by tax law)

French tax doctrine allows an **in-house** editor (same entity builds and uses
the software). So you *could* sign as a personne physique or as the bar’s
existing entity.

Creating a dedicated company is still wise because:

- you can sell the product later to other bars without mixing bar and software
  revenue/liability,
- IP assignment (IRL-2) is cleaner toward a company,
- the attestation’s “raison sociale / SIRET” fields look professional to an
  inspector,
- contracts with Plateformes Agréées / Banqup are easier as a société.

### How (beginner path — France)

Exact steps depend on status (étudiant-entrepreneur, SASU, EURL, micro, etc.).
Typical path with a lawyer or online formalities service (Legalstart, Captain
Contrat, accountant, or greffe):

1. Choose **forme juridique** (often **SASU** if sole founder wanting flexibility).
2. Choose **objet social** that includes software editing / Édition de logiciels
   / conseil informatique (your lawyer will phrase it).
3. Deposit capital (even symbolic for SASU), draft **statuts**.
4. Publish legal announcement if required for your form.
5. File with **guichet unique** (formalités.entreprises.gouv.fr) / INPI.
6. Receive **SIREN/SIRET**, Kbis (or equivalent), and tax identifiers (TVA
   intracommunautaire if applicable).
7. Open a business bank account in the company name.

**Do not invent a fake SIRET.** Wait until INSEE/INPI issues the real one.

### Done when

- You hold a Kbis (or equivalent) showing SIRET,
- company name + address + legal representative are known,
- those values can be pasted into `03-ATTESTATION-DRAFT.md`.

### Risk if skipped

You can still sign as individual / bar entity. Selling the software later is
messier; attestation identity may need a later addendum when the company exists.

### Version impact

None (no code).

---

## IRL-2 — Assign software rights (IP) to the new company

### What it is

Under French IP law, software created by an employee in their job often belongs
to the employer (**CPI L113-9**). If you built MOSEHXL as a student / founder
*outside* a clean employment frame, ownership can be ambiguous.

**Cession / apport de droits** = a written act where you (and any co-authors)
transfer copyright/economic rights on MOSEHXL to the company.

### Why

- The company that **signs** the attestation should be the one that **controls**
  the source and can modify fiscal parameters (BOFiP definition of éditeur).
- Investors, buyers, and PA contracts ask “who owns the code?”.
- Avoids future disputes between co-founders / helpers who committed code.

### How

1. List contributors who wrote material code (git `shortlog` helps).
2. Lawyer drafts **contrat de cession** or **apport en société** covering:
   - source code, docs, trademarks/name “MOSEHXL”,
   - worldwide, for the legal term of protection,
   - right to modify, sublicense, sell.
3. Everyone signs; company stores the original with the Kbis.
4. Optionally record assignment in company registers / board minutes.

**This is lawyer work.** The agent can prepare a contributor list from git; not
a substitute for counsel.

### Done when

- Signed assignment exists,
- company can truthfully claim it is the éditeur.

### Risk if skipped

Attestation may still be signed by the natural person who controls the code,
but selling or raising money later gets blocked on IP diligence.

### Version impact

None.

---

## IRL-3 — Accountant VAT reconciliation (Aug 2025 + Dec 2025)

### What it is

Compare **cleaned daily closure totals** from MuseBar with the **VAT returns**
(CA3 / equivalent) your accountant filed for those months.

Tracked in the anomaly register as **R-AUG25** and **R-DEC25**.

### Why

An inspector who sees historical closure quirks (duplicates, zero-amount Mondays,
one late Dec-1 backfill) will ask: “Do the tax filings still match reality?”
A written “yes, within €X” from the accountant turns anomalies into *explained
history* instead of *suspected fraud*.

### How

1. Export or open the cleaned bulletin analysis already in  
   `evidence/phase1-forensics/2026-07-16-CLOSURE-ANOMALIES.md`  
   and the CSV reports under `docs/reports/` if present.
2. Send the accountant:
   - month totals HT / TVA by rate,
   - note about duplicates/zeros (use cleaned view),
   - Dec 1 2025 late closure explanation.
3. Ask them to confirm match vs filed returns (or list differences).
4. File their answer under  
   `docs/legal/self-certification/evidence/accountant-recon/`  
   (redact secrets).

### Done when

- Written confirmation (email PDF is fine) for both months, or a documented
  residual difference with explanation.

### Risk if skipped

Not a signature blocker for the *software* attestation, but weaker defense in a
tax control of the *bar*.

### Version impact

None (unless you later backfill closures — see COMP-6).

---

## IRL-4 — Optional lawyer/accountant review of attestation wording

### What it is

Someone other than the developer reads `03-ATTESTATION-DRAFT.md` + scope before
you sign.

### Why

Self-attestation is a **legal claim**. A 30-minute review catches overclaims
(“we are NF-525”) or missing identity fields. They do **not** need to co-sign.

### How

1. Zip or share `docs/legal/self-certification/`.
2. Ask: “Any wording that overclaims? Identity block OK for our entity?”
3. Apply non-fiscal wording tweaks if needed (still same git tag).
4. If they demand a **code** change that touches journal/archive/closures → that
   becomes a **MAJOR** new attestation — discuss before coding.

### Done when

- Review done or explicitly waived in writing (“we choose to sign without
  external review on DATE”).

### Risk if skipped

Accepted residual; many small editors sign without counsel.

### Version impact

None if only wording.

---

## IRL-5 — Fill publisher identity and sign the attestation

### What it is

Complete every `[A COMPLETER]` in the **French** block of
`03-ATTESTATION-DRAFT.md`, export PDF, sign, archive.

See `07-SIGNING-PACKET.md`.

### Why

Until this exists, the bar has **no** CGI art. 286-I-3° bis proof to show. Fine
risk for the merchant is 7 500 € per register if controlled without proof.

### How

1. Confirm production still runs `self-cert-v2.0.2`  
   (`git describe` on server / health + package version).
2. Paste company identity from IRL-1 into the draft.
3. Set city + date.
4. Export PDF (print markdown or Pandoc / browser print).
5. Sign (wet ink **or** qualified e-signature — ask counsel which they prefer).
6. Store:
   - `docs/legal/self-certification/evidence/signed/ATTESTATION-MOSEHXL-2.0.2.pdf`
   - off-site copy (email to yourself + accountant, or Spaces).
7. Tick the sign-off box in `07-SIGNING-PACKET.md`.

### Done when

- Signed PDF exists in evidence folder + off-site,
- merchant copy delivered (IRL-6).

### Risk if skipped

Whole dossier is preparation only — no legal effect for the bar.

### Version impact

None. **Do not move the git tag after signing.**

---

## IRL-6 — Deliver a copy to the merchant (the bar)

### What it is

The **assujetti** (bar) must be able to produce the publisher attestation during
a control. The éditeur keeps the original; the bar keeps a copy.

### Why

Inspectors ask the merchant, not the GitHub repo.

### How

1. Give PDF (USB / email / printed binder in the office).
2. Note delivery date in the signing packet.
3. Optionally store path in bar’s accounting cloud folder.

### Done when

- Bar manager confirms they have the file.

### Version impact

None.

---

## IRL-7 — Register the bar on a Plateforme Agréée (JeFacture / Banqup)

### What it is

From **1 September 2026**, French businesses must be able to **receive**
electronic invoices via a registered **PA** (Plateforme Agréée). Your
accountant’s offer is typically **JeFacture.com** (Banqup / Unifiedpost).

This is **not** a MuseBar feature for v1. The PA’s web portal is enough for
“receive”.

### Why

Legal deadline for **receiving** e-invoices. Missing it is a merchant
compliance problem independent of cash-register self-certification.

### How

1. Ask the accounting firm to open the JeFacture / Banqup onboarding for the bar.
2. Complete KYC (SIRET, IBAN, mandate).
3. Keep login credentials with the accountant / bar admin.
4. Calendar a reminder for **emission + e-reporting** obligations on
   **1 September 2027** (needs COMP-7 then COMP-9).

### Done when

- Bar can log into the PA portal and would receive a test e-invoice.

### Risk if skipped

Merchant non-compliance from Sept 2026 for *reception*, even if POS is attested.

### Version impact

None until you build PA APIs (COMP-9).

---

## IRL-8 — (Optional) Closure gap backfill decision with accountant

### What it is

Some calendar days have journal sales but no positive DAILY bulletin (`C-GAP`).
Sales are still in the legal journal. Accountant may ask to **materialize**
missing daily bulletins.

### Why

Pretty reports for humans; not required if journal + VAT filings already match.

### How

1. Accountant says yes/no after IRL-3.
2. If yes → agent implements a **controlled CORRECTION / backfill** procedure
   (COMP-6 related), never by rewriting old journal rows.
3. Document in anomaly register as closed.

### Done when

- Explicit “no need” or backfill completed + documented.

### Version impact

If code only *adds* new closure rows from journal aggregates without changing
hash rules → usually **minor**. Still review before doing it on production.

---

# TRACK COMPUTER — Coding, ops, strategy (this machine + server)

---

## COMP-1 — DigitalOcean Spaces with Object Lock (WORM backups)

### What it is

**WORM** = Write Once Read Many. Object Lock on a Spaces/S3 bucket prevents
anyone (even root, for a retention period) from deleting or overwriting backup
files.

Today: daily dumps live on the droplet + DO managed DB backups (pghoard). Good
enough to sign. Spaces is **extra armor** against ransomware / accidental `rm`.

### Why recommended

- Conservation pillar of ISCA is about *keeping* data 6+ years.
- Same-server copies die if the droplet dies or is wiped.
- Managed DB backups are excellent but you don’t control their UI retention
  forever; a locked bucket you own is clearer evidence.

### How

1. In DigitalOcean: create **Spaces** bucket in a region ≠ droplet if possible.
2. Enable **Object Lock** / retention mode (GOVERNANCE or COMPLIANCE) for ≥ 6
   years or rolling 2190 days — read DO docs carefully; COMPLIANCE cannot be
   shortened.
3. Create Spaces access key; store only on the server (not in git).
4. Install `aws` CLI on the droplet (Spaces is S3-compatible).
5. Set on server env / root config:
   - `MOSEHXL_S3_BUCKET=…`
   - `MOSEHXL_S3_ENDPOINT=https://<region>.digitaloceanspaces.com`
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
6. Run `MOSEHXL_FORCE_MONTHLY=1 /var/www/MOSEHXL/scripts/backup-production-db.sh`
   and confirm objects appear under `daily/` and `monthly/`.
7. Update `evidence/phase4-ops/BACKUP-EVIDENCE-RECORD.md` with bucket name
   (no secrets) + screenshot of Object Lock.

Script already has the upload hooks from Phase 4.

### Done when

- Successful upload logged,
- Object Lock evidenced,
- backup record updated.

### Risk if skipped

Accepted at signature; higher loss risk if droplet + account compromised together.

### Version impact

None (ops only).

---

## COMP-2 — Admin 2FA (TOTP) enrollment + enforcement

### What it is

**TOTP** = time-based one-time passwords (Google Authenticator, Aegis, etc.).
Today `AUTH_ENFORCE_ADMIN_2FA=false` because **no** production user has
`mfa_totp_enabled=true`. Turning enforcement on now would lock everyone out.

### Why recommended

Securisation pillar: admin accounts can change settings, users, and trigger
sensitive ops. Password-only admin is the usual breach path.

### How

1. **Before** enabling enforcement, each admin opens the in-app TOTP setup and
   scans the QR; confirm `mfa_totp_enabled=true` in DB for all admins.
2. Keep at least one break-glass process (recovery codes / doadmin SSH) documented.
3. Set `AUTH_ENFORCE_ADMIN_2FA=true` in production `.env`.
4. `pm2 restart mosehxl-backend --update-env`.
5. Verify login requires second factor.
6. Update `PRODUCTION-CONFIG-SNAPSHOT.md`.

### Done when

- All privileged users enroll,
- enforcement on,
- test login succeeds with TOTP.

### Risk if skipped

Documented residual; phishing / leaked password risk remains.

### Version impact

None if only config + existing TOTP feature. If you build new TOTP UX, still
**minor**.

---

## COMP-3 — Move secrets toward a secret manager (lighter first)

### What it is

Today JWT secret, archive HMAC key, DB passwords live in
`/var/www/MOSEHXL/MuseBar/backend/.env` (root-only). A “secret manager” is a
vault (DO Spaces encrypted? better: **Doppler**, **HashiCorp Vault**, **AWS
Secrets Manager**, or DO’s offerings) that injects secrets at runtime.

### Why recommended

- Limits how many people see raw secrets,
- rotation without editing files,
- audit trail of who read secrets.

### How (pragmatic ladder)

**Step A (quick win):** ensure `.env` is `chmod 600`, root-only, not in git,
backed up encrypted off-site; document rotation procedure.

**Step B (real manager):** pick one provider → store
`JWT_SECRET`, `ARCHIVE_SECRET_KEY`, `DB_PASSWORD` → teach PM2/systemd to pull
env at start → remove plaintext secrets from disk where possible.

### Done when

- Step A documented at minimum; Step B optional for “thorough”.

### Risk if skipped

Root compromise still dumps secrets (true of most small setups).

### Version impact

None.

---

## COMP-4 — One real MONTHLY archive on production

### What it is

Phase 4 proved archive create/verify on **`mosehxl_restore_drill`** so production
`archive_exports` stayed empty. For inspectors, a **production** row + file is
stronger (“we can export from the live system”).

### Why recommended

Archivage pillar: ability to produce sealed exports on request.

### How

1. Confirm live code includes archiveService fixes (already on 2.0.2).
2. As an authenticated admin with archive permission, create MONTHLY JSON for a
   closed month (e.g. last full month).
3. Run verify → expect `isValid: true`.
4. Copy meta (hash, size, id) into  
   `evidence/phase4-ops/ARCHIVE-EXPORT-RECORD-production.md`  
   (no customer PII beyond what’s already fiscal).
5. Optionally upload package to Spaces (COMP-1).

### Done when

- `archive_exports` count ≥ 1 on production,
- verify VALID,
- evidence file filled.

### Risk if skipped

Drill evidence still exists; slightly weaker “live” demo.

### Version impact

None (uses existing feature).

---

## COMP-5 — CI guard on fiscal paths

### What it is

A GitHub Action (or similar) that **labels / fails / warns** when a PR touches:

- `MuseBar/backend/src/models/legalJournal/`
- `routes/legal/`
- `models/archiveService.ts`
- `utils/closureScheduler.ts`
- legal DB migrations / triggers

…and requires a changelog line stating **MAJOR vs MINOR/PATCH** fiscal impact.

### Why recommended

After you sign, a casual PR must not silently invalidate the attestation.
Automation beats memory.

### How

1. Add a workflow `fiscal-path-guard.yml`.
2. On `pull_request`, path filter → comment checklist:
   - [ ] Changelog fiscal-impact filled
   - [ ] If MAJOR: new attestation planned
3. Optionally `fail` if `CHANGELOG.md` untouched.
4. Document in `06-RELEASE-FREEZE-CHECKLIST.md` / contributing notes.

### Done when

- PR touching a fiscal file gets the guard comment,
- team understands MAJOR rule.

### Risk if skipped

Human-only discipline; higher chance of accidental major change.

### Version impact

None (CI only).

---

## COMP-6 — Closure polish (minor product fixes)

### What it is

Three improvements from the closure forensics report:

| Fix | Intent |
|-----|--------|
| VAT reconciliation tolerance | Avoid false “recon fail” on cent rounding |
| Block duplicate DAILY inserts | Same Paris day + matching hash / lower amount |
| Auto-closure covers every Paris day with ≥1 SALE | Reduce `C-GAP` going forward |

### Why recommended

Cleaner future history; fewer inspector questions. Does **not** rewrite past
journal rows.

### How

1. Write failing tests from real anomaly shapes.
2. Implement smallest fix in `closureScheduler` / closure routes.
3. Changelog: **PATCH/MINOR**, “no ISCA parameter change” (read carefully: if
   you change *how* closure hashes are computed → MAJOR).
4. Deploy as e.g. **2.0.3** or **2.1.x** under same attestation if truly minor.

### Done when

- Tests green,
- staging/prod behavior verified on a quiet day,
- anomaly register notes “prevented going forward”.

### Risk if skipped

Gaps/duplicates may continue; still explained by existing docs.

### Version impact

Aim for **minor/patch**. Stop and re-attest if hash/trigger semantics change.

---

## COMP-7 — Phase 6: Flux 10.3 XML + Factur-X groundwork

### What it is

French e-invoicing reform formats:

- **Flux 10.3** — official XML for **B2C e-reporting** (daily aggregates by
  operation category × VAT rate). Built from data you already have in closure
  bulletins.
- **Factur-X** — PDF invoice with embedded XML for **B2B** invoices.

Deadline pressure: **1 Sept 2027** for small businesses to *emit* and e-report.
Reception (IRL-7) is 2026 and does not need this code.

### Why

“Compatible with the reform” means producing **these official formats**, not
Excel. Doing it post-freeze as **read-only export** keeps the same attestation
(minor).

### How (high level)

1. Download DGFiP *Spécifications externes* v3.2 (+ XSD) from impots.gouv.fr.
2. Map MuseBar VAT lines → Flux 10.3 categories (`TPS1` on-site service vs
   `TLB1` takeaway) — default on-site for the bar, configurable later.
3. Implement `GET/POST` export of a closure bulletin → XML; XSD-validate in CI.
4. For Factur-X: embed XML in existing `FAC-YYYY-NNNNNN` PDF pipeline; add
   mandatory mentions (client SIREN, etc.).
5. Ship as **v2.1.0** with changelog “no fiscal-impacting change”.

### Done when

- Schema-valid Flux 10.3 sample in evidence,
- Factur-X sample validates,
- tagged minor release deployed or ready.

### Risk if skipped

Crunch in 2027; still OK for 2026 reception-only.

### Version impact

**Minor** if read-only.

---

## COMP-8 — Quarterly restore drill (ops ritual)

### What it is

Repeat what Phase 4 did: restore latest dump into isolated DB, check journal
integrity, closures readable, archive verify. Next due **≤ 2026-10-16**.

### Why

Proves backups are not just files — they *boot*. Conservation without restore
is faith, not evidence.

### How

1. Use `scripts/restore-drill.sh` (extend if needed).
2. Fill a new dated  
   `evidence/phase4-ops/RESTORE-DRILL-RECORD-YYYY-MM-DD.md`.
3. Never restore *over* production.

### Done when

- Dated record Pass + next date scheduled.

### Risk if skipped

Backup rot undiscovered.

### Version impact

None.

---

## COMP-9 — Phase 7: PA connectivity (Banqup) toward 2027

### What it is

Software that **sends** e-reporting / e-invoices to a PA API and optionally
**fetches** received invoices into MuseBar (viewer was deferred to v2).

### Why

Automates what the portal does manually; needed for scale / multi-customer
later. Banqup API was still maturing mid-2026 — re-check status before build.

### How

1. Re-read Banqup / JeFacture API docs + pricing.
2. Design internal `PaProvider` interface; Banqup adapter first.
3. Transmit Flux 10.3 from COMP-7 on the bar’s VAT cadence.
4. Optional received-invoice viewer UI.
5. Classify MAJOR vs MINOR when designed (reads = minor; fiscal writes = major).

### Done when

- Successful test transmission in sandbox,
- production runbook + credentials vaulted.

### Risk if skipped

Manual portal upload may still satisfy law if accountant does it — confirm.

### Version impact

TBD at design time.

---

## COMP-10 — Parallel product track (non-fiscal)

### What it is

Schedule manager, reservations, multi-table / multi-room, admin tooling —
mentioned in the July 2026 roadmap as expected **minor** unless they touch
fiscal writes.

### Why

Business value; unrelated to attestation validity if ISCA paths untouched.

### How

Separate feature roadmap; each PR checked by COMP-5 guard.

### Done when

- Per-feature acceptance.

### Version impact

Minor by default.

---

## COMP-11 — Cosmetic dossier hygiene (stale Phase 3/4 wording)

### What it is

A few evidence files still say “deploy deferred” or “doadmin app role open”
even though production is on `self-cert-v2.0.2` with `mosehxl_app`.

### Why

Inspectors / future-you deserve a dossier that doesn’t contradict itself.

### How

1. Grep for `deferred`, `doadmin` app role, `self-cert-v2.0.0` as “current”.
2. Add a one-line “superseded by …” note rather than rewriting history.
3. Point “current truth” to `07-SIGNING-PACKET.md` + tag `self-cert-v2.0.2`.

### Done when

- No file claims live cloud is still pre-freeze without a supersession note.

### Version impact

None (docs).

---

# Master checklist (tick as we go)

## Track IRL

| ID | Item | Status |
|----|------|--------|
| IRL-1 | Company + SIRET | Pending |
| IRL-2 | IP assignment to company | Pending |
| IRL-3 | VAT recon Aug/Dec 2025 | Pending |
| IRL-4 | Counsel review or waiver | Pending |
| IRL-5 | Sign attestation 2.0.2 | Pending |
| IRL-6 | Merchant holds copy | Pending |
| IRL-7 | JeFacture PA registration (≤ 2026-09-01) | Pending |
| IRL-8 | Gap backfill decision | Pending |

## Track COMPUTER

| ID | Item | Status |
|----|------|--------|
| COMP-1 | Spaces Object Lock backups | **Ready for keys** — setup doc `evidence/phase4-ops/COMP-1-SPACES-WORM-SETUP.md` |
| COMP-2 | Admin 2FA enroll + enforce | **Ready for enrollment** — setup doc `evidence/phase4-ops/COMP-2-ADMIN-2FA-SETUP.md` |
| COMP-3 | Secret manager (A then B) | **Step A done** 2026-07-23 — `COMP-3-SECRETS-STEP-A.md` |
| COMP-4 | Production MONTHLY archive | **Done** 2026-07-23 — `ARCHIVE-EXPORT-RECORD-production.md` |
| COMP-5 | CI fiscal-path guard | **Done** 2026-07-23 — `.github/workflows/fiscal-path-guard.yml` |
| COMP-6 | Closure polish | **Done** 2026-07-23 — VAT tolerance + duplicate guard + gap backfill (shipped as 2.0.3 PATCH) |
| COMP-7 | Flux 10.3 + Factur-X (Phase 6) | Pending |
| COMP-8 | Quarterly restore drill | Pending (due ≤ 2026-10-16) |
| COMP-9 | PA API connectivity (Phase 7) | Pending |
| COMP-10 | Product extras | Pending / ongoing |
| COMP-11 | Dossier hygiene | **Done** 2026-07-23 — supersession notes on stale Phase 3/4 records |

---

# What we do next

When you say go, we execute **one ID at a time** (or a small batch you choose).

**Recommended first coding batch (while company paperwork runs IRL):**  
`COMP-11` (quick) → `COMP-5` → `COMP-4` → `COMP-1` → `COMP-2`.

**Recommended first IRL batch:**  
`IRL-1` → `IRL-2` → then pause coding that changes attestation identity → `IRL-4` → `IRL-5` → `IRL-6`.

Tell me which ID to start with (or “start recommended coding batch”), and we tackle it step by step.
