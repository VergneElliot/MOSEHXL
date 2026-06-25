# MOSEHXL Self-Certification Dossier

Status: Draft dossier  
Date started: 2026-06-25  
Target: French fiscal self-certification dossier for MOSEHXL POS scope  

---

## Important Positioning

This dossier is for a **publisher self-certification** path under the French
cash-register software rules tied to CGI Article 286-I-3 bis and the ISCA
requirements:

1. Inalterabilite
2. Securisation
3. Conservation
4. Archivage

It does **not** claim that MOSEHXL is NF-525/LNE certified. NF-525/LNE
certification is an external certification process. This dossier is intended to
support the alternative self-attestation route while keeping a clean evidence
trail for later external certification if the budget allows it.

Final legal wording should be reviewed before signature. The technical content
below is an engineering evidence package, not legal advice.

---

## Dossier Contents

| File | Purpose |
|------|---------|
| `01-SCOPE.md` | Defines what product/version/modules are covered by the self-certification claim |
| `02-REFERENTIEL-MAPPING.md` | Maps the ISCA requirements to code, tests, docs, and operational evidence |
| `03-ATTESTATION-DRAFT.md` | Draft publisher attestation text to complete and sign |
| `04-OPERATIONAL-CONTROLS.md` | Required production policies: retention, backups, restore drills, archive handling |
| `05-EVIDENCE-INDEX.md` | Evidence catalogue: audits, patch notes, code modules, migrations, tests, commands |
| `06-RELEASE-FREEZE-CHECKLIST.md` | Checklist for freezing a specific release/commit as the attested version |
| `evidence-templates/` | Fillable records for retention, backup, restore drills, archive exports, config snapshots, and release evidence |

---

## Current Engineering Verdict

As of this dossier start, the codebase has already closed the historical
compliance blockers tracked in the 2026-05-20 audit and later closure pass:

- legal journal append paths are fail-closed for fiscal operations,
- legal journal has hash-chain integrity and DB-level mutation guards,
- closure bulletins are wired to legal journal entries,
- archive verify/download surfaces exist,
- software events and audit trail have fail-safe/structured coverage for critical flows,
- receipt/invoice/legal document generation has dedicated compliance hardening,
- the backend quality gate is green on the latest cleanup passes.

Remaining self-certification work is therefore mostly:

1. scope decision,
2. signed attestation,
3. referentiel mapping,
4. operational controls and evidence retention,
5. release freeze/tag discipline.

---

## Recommended Completion Order

1. Finish and approve `01-SCOPE.md`.
2. Complete the mapping in `02-REFERENTIEL-MAPPING.md`.
3. Attach or reference all evidence in `05-EVIDENCE-INDEX.md`.
4. Implement the operational controls in `04-OPERATIONAL-CONTROLS.md`.
5. Copy and fill the required records from `evidence-templates/`.
6. Freeze the release using `06-RELEASE-FREEZE-CHECKLIST.md`.
7. Fill, date, and sign `03-ATTESTATION-DRAFT.md`.

The attestation should refer to a specific immutable release identifier
(git tag/commit + build version), not to a moving branch.
