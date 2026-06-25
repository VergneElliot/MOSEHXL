# 03 - Attestation Individuelle de l'Editeur - Draft

Status: Draft only - not signed  
Do not use as a final legal document until reviewed, completed, dated, and
signed by the publisher.

---

## Usage Instructions

1. Complete every placeholder.
2. Freeze a release tag/commit before signing.
3. Attach the evidence listed in `05-EVIDENCE-INDEX.md`.
4. Confirm operational controls in `04-OPERATIONAL-CONTROLS.md`.
5. Obtain legal/accounting review if possible.
6. Export the final signed version as PDF and archive it with the release
   evidence package.

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
Version attestee : [A COMPLETER]
Reference de version / tag Git : [A COMPLETER]
Commit Git : [A COMPLETER]
Date de gel de version : [A COMPLETER]
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
- des controles operationnels documentes dans `04-OPERATIONAL-CONTROLS.md`.

Limites de l'attestation :

- Cette attestation ne constitue pas une certification NF-525 ou LNE delivree
  par un organisme tiers.
- Elle ne couvre pas les materiels, imprimantes, terminaux de paiement,
  reseaux, systemes d'exploitation ou services tiers utilises par le client.
- Elle ne couvre pas les versions futures du logiciel sans nouvelle revue ou
  addendum.
- Elle est valable uniquement pour le perimetre et la version identifies
  ci-dessus.

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
Attested version: [TO COMPLETE]
Version reference / Git tag: [TO COMPLETE]
Git commit: [TO COMPLETE]
Release freeze date: [TO COMPLETE]
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
- operational controls documented in `04-OPERATIONAL-CONTROLS.md`.

Limits:

- This attestation is not an NF-525 or LNE third-party certification.
- It does not cover hardware, printers, payment terminals, networks, operating
  systems, or third-party services used by the customer.
- It does not cover future versions without a new review or addendum.
- It is valid only for the scope and version identified above.

Signed at: [TO COMPLETE]
Date: [TO COMPLETE]

Signer name and role: [TO COMPLETE]
Signature:

[SIGNATURE]
```

---

## Required Attachments Before Signature

| Attachment | Required |
|------------|----------|
| Frozen git tag/commit output | Yes |
| `npm run type-check` output | Yes |
| `npm run lint` output | Yes |
| `npm test` output | Yes |
| Migration status output | Yes |
| Evidence index snapshot | Yes |
| Referentiel mapping snapshot | Yes |
| Operational controls checklist marked ready | Yes |
| Backup evidence | Yes |
| Restore drill evidence | Yes |
| Archive export/verify sample | Strongly recommended |
| Journal integrity verification sample | Strongly recommended |

---

## Signature Readiness

Do not sign while any of these are still `No`:

| Item | Ready? |
|------|--------|
| Scope approved | No |
| Release frozen | No |
| Green quality evidence captured | No |
| Migration status captured | No |
| Operational controls implemented | No |
| Backup and restore evidence attached | No |
| Dossier reviewed | No |
| Signatory details completed | No |
