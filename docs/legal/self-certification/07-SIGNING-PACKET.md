# 07 — Signing packet (human-only remaining steps)

Status: **Ready for signature** as of 2026-07-16 (after Phase 5 dossier close + ops closures)  
Attested software identity: **MOSEHXL 2.0.2** / git tag **`self-cert-v2.0.2`**

This page is the only checklist you still need to walk through by hand.
Everything else in the dossier is prepared.

---

## What is already done (do not redo)

| Item | Location |
|------|----------|
| Scope approved (B2C POS core; invoices adjacent) | `01-SCOPE.md` |
| ISCA mapping reviewed against freeze | `02-REFERENTIEL-MAPPING.md` |
| Attestation French/English draft filled except publisher identity | `03-ATTESTATION-DRAFT.md` |
| Ops controls + evidence | `04-OPERATIONAL-CONTROLS.md`, `evidence/phase4-ops/` |
| Evidence index | `05-EVIDENCE-INDEX.md` |
| Release freeze checklist | `06-RELEASE-FREEZE-CHECKLIST.md` |
| Production on attested line | live deploy of `self-cert-v2.0.2` (see freeze checklist) |

---

## Your remaining steps (in order)

### 1. Fill publisher identity (5 minutes)

In `03-ATTESTATION-DRAFT.md`, replace every `[A COMPLETER]` in the **French** block only
(English is a working translation):

| Field | What to write |
|-------|----------------|
| Nom / Raison sociale de l'éditeur | Your legal name **or** company name (in-house editor is allowed) |
| Forme juridique | e.g. EI / SAS / SARL / or “personne physique” if signing as individual |
| Adresse | Legal address |
| SIRET / identifiant | SIRET if you have one; otherwise national ID / VAT id you use for the bar entity |
| Représentant légal + Fonction | Your name + role (e.g. gérant / développeur-éditeur) |
| Fait à | City |
| Le | Signature date |
| Nom et qualité du signataire | Same as représentant |

Product/version lines are already filled — do not change them after the tag is cut.

### 2. Optional but recommended review (same day or next)

Send the dossier folder `docs/legal/self-certification/` to your accountant and/or lawyer
for a read-through. They do **not** need to co-sign; you sign as éditeur.

If they suggest wording tweaks that do **not** change the attested git tag, edit the
draft, re-export PDF, then sign.

### 3. Print, sign, archive

1. Export the completed French attestation to PDF (or print the markdown).
2. Sign (wet ink or qualified e-signature — your choice with counsel).
3. Store the signed PDF:
   - in this repo under `docs/legal/self-certification/evidence/signed/` (add when signed),
   - **and** an off-site copy (email to yourself + accountant, or object storage).
4. Give **one copy to the merchant (MuseBar / the bar)** to keep for inspection.

### 4. After signature — operational discipline

- Do not move tag `self-cert-v2.0.2`.
- Any change under legal journal / archive / closure fiscal paths ⇒ new attestation (MAJOR).
- Quarterly restore drill (next due ≤ 2026-10-16).
- Optional upgrade: create a DigitalOcean Spaces bucket with **Object Lock**, set
  `MOSEHXL_S3_BUCKET` + `MOSEHXL_S3_ENDPOINT` on the server so daily/monthly dumps
  sync off-host with WORM (script already supports this).

---

## Explicit non-blockers left as residual (accepted for signature)

Full beginner-friendly action plan for every leftover (IRL vs computer):
`docs/roadmaps/2026-07-23-POST-FREEZE-THOROUGHNESS-ROADMAP.md`.

| Item | Status |
|------|--------|
| Object-lock WORM bucket | Optional hardening; provider-managed DB backups + 6-year monthly dumps cover conservation |
| Admin 2FA enforcement | Deferred — no admin has TOTP enrolled (`AUTH_ENFORCE_ADMIN_2FA=false`) |
| Official separate éditeur company | Not required by tax doctrine; create later if you sell the product |
| Phase 6 Flux 10.3 / Factur-X | Post-signature minor work (deadline 2027) |

---

## Sign-off box (for you)

| Field | Value |
|-------|-------|
| I confirm production runs `self-cert-v2.0.2` | ☐ |
| I completed publisher identity fields | ☐ |
| I signed and archived the PDF | ☐ |
| Merchant holds a copy | ☐ |
| Date | |
