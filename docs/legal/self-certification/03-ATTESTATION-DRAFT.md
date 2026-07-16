# 03 - Attestation Individuelle de l'Editeur - Draft

Status: **Ready to sign** after publisher identity fields are filled  
Do not use as a final legal document until completed, dated, and signed.
See `07-SIGNING-PACKET.md` for the human checklist.

---

## Usage Instructions

1. Complete every `[A COMPLETER]` in the French block (publisher identity only).
2. Confirm production runs tag `self-cert-v2.0.1`.
3. Attach / keep available the evidence in `05-EVIDENCE-INDEX.md`.
4. Confirm operational controls in `04-OPERATIONAL-CONTROLS.md`.
5. Optional: accountant/lawyer review.
6. Export signed PDF; archive with the evidence package; give a copy to the merchant.

---

## Draft French Attestation

```text
ATTESTATION INDIVIDUELLE DE L'EDITEUR

Je soussigne(e) :

Nom / Raison sociale de l'editeur : [A COMPLETER]
Forme juridique : [A COMPLETER]
Adresse : [A COMPLETER]
SIRET / identifiant : [A COMPLETER]
Representant legal : [A COMPLETER]
Fonction : [A COMPLETER]

atteste que le logiciel designe ci-dessous :

Nom du logiciel : MOSEHXL
Version attestee : 2.0.1
Reference de version / tag Git : self-cert-v2.0.1
Commit Git : tip du tag self-cert-v2.0.1 (joindre la sortie de `git rev-parse self-cert-v2.0.1^{}`)
Date de gel de version : 2026-07-16
Perimetre fonctionnel atteste :
Module POS / caisse de MOSEHXL permettant l'enregistrement des ventes B2C,
encaissements, annulations/remboursements, operations de monnaie, edition des
justificatifs, journal legal, piste d'audit, clotures et archivage fiscal,
conformement au perimetre defini dans le dossier de self-certification
`docs/legal/self-certification/01-SCOPE.md`.

est concu pour satisfaire les conditions d'inalterabilite, de securisation, de
conservation et d'archivage des donnees concourant directement ou indirectement
a la realisation d'une transaction, conformement aux exigences applicables aux
logiciels ou systemes de caisse visees par l'article 286, I, 3 bis du Code
general des impots.

Cette attestation est etablie sur la base :

- du dossier de self-certification MOSEHXL,
- du referentiel de correspondance `02-REFERENTIEL-MAPPING.md`,
- de l'index de preuves `05-EVIDENCE-INDEX.md`,
- des resultats de tests et controles associes a la version attestee,
- des controles operationnels documentes dans `04-OPERATIONAL-CONTROLS.md`
  et des preuves `evidence/phase4-ops/`.

Limites de l'attestation :

- Cette attestation ne constitue pas une certification NF-525 ou LNE delivree
  par un organisme tiers.
- Elle ne couvre pas les materiels, imprimantes, terminaux de paiement,
  reseaux, systemes d'exploitation ou services tiers utilises par le client.
- Elle ne couvre pas les versions futures du logiciel sans nouvelle revue ou
  addendum.
- Elle est valable uniquement pour le perimetre et la version identifies
  ci-dessus.
- Le sous-systeme de facturation B2B est documente comme module adjacent et
  n'est pas inclus dans le perimetre atteste de cette version.

Fait a : [A COMPLETER]
Le : [A COMPLETER]

Nom et qualite du signataire : [A COMPLETER]
Signature :

[SIGNATURE]
```

---

## Draft English Working Translation

This translation is only for internal review. The French text should be the
signed reference.

```text
INDIVIDUAL PUBLISHER ATTESTATION

I, the undersigned:

Publisher name / legal entity: [TO COMPLETE]
Legal form: [TO COMPLETE]
Address: [TO COMPLETE]
SIRET / identifier: [TO COMPLETE]
Legal representative: [TO COMPLETE]
Role: [TO COMPLETE]

attest that the software identified below:

Software name: MOSEHXL
Attested version: 2.0.1
Version reference / Git tag: self-cert-v2.0.1
Git commit: tip of tag self-cert-v2.0.1 (attach `git rev-parse self-cert-v2.0.1^{}`)
Release freeze date: 2026-07-16
Attested functional scope:
MOSEHXL POS/cash-register module for recording B2C sales, payments,
cancellations/refunds, change operations, receipts, legal journal, audit trail,
closures, and fiscal archives, as defined in
`docs/legal/self-certification/01-SCOPE.md`.

is designed to satisfy the requirements of inalterability, security,
preservation, and archiving for data directly or indirectly contributing to a
transaction, in line with the requirements applicable to cash-register software
or systems under Article 286, I, 3 bis of the French Tax Code.

This attestation is based on:

- the MOSEHXL self-certification dossier,
- the mapping document `02-REFERENTIEL-MAPPING.md`,
- the evidence index `05-EVIDENCE-INDEX.md`,
- test and control results for the attested version,
- operational controls documented in `04-OPERATIONAL-CONTROLS.md` and
  `evidence/phase4-ops/`.

Limits:

- This attestation is not an NF-525 or LNE third-party certification.
- It does not cover hardware, printers, payment terminals, networks, operating
  systems, or third-party services used by the customer.
- It does not cover future versions without a new review or addendum.
- It is valid only for the scope and version identified above.
- The B2B invoice subsystem is adjacent evidence and is outside this attested
  scope.

Signed at: [TO COMPLETE]
Date: [TO COMPLETE]

Signer name and role: [TO COMPLETE]
Signature:

[SIGNATURE]
```

---

## Required Attachments Before Signature

| Attachment | Required | Status |
|------------|----------|--------|
| Frozen git tag/commit output | Yes | `self-cert-v2.0.1` (+ Phase 3 gate package) |
| Quality gate outputs | Yes | `evidence/phase3-release-freeze/` |
| Migration status output | Yes | Phase 3 + restore drill (44) |
| Evidence index snapshot | Yes | `05-EVIDENCE-INDEX.md` |
| Referentiel mapping snapshot | Yes | `02-REFERENTIEL-MAPPING.md` |
| Operational controls checklist | Yes | `04-OPERATIONAL-CONTROLS.md` |
| Backup / restore / archive evidence | Yes | `evidence/phase4-ops/` |
| Publisher identity completed | Yes | **You** — see `07-SIGNING-PACKET.md` |

---

## Signature Readiness

| Item | Ready? |
|------|--------|
| Scope approved | **Yes** |
| Release frozen | **Yes** (`self-cert-v2.0.1`) |
| Green quality evidence captured | **Yes** (Phase 3; 2.0.1 adds archive fix + ops) |
| Migration status captured | **Yes** |
| Operational controls implemented | **Yes** (see ops readiness table) |
| Backup and restore evidence attached | **Yes** |
| Dossier reviewed (engineering) | **Yes** |
| Signatory details completed | **No — publisher only** |
| Wet-ink / e-signature applied | **No — publisher only** |
