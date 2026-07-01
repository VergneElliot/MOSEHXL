# MOSEHXL Self-Certification Dossier

Status: **Paused** — dossier foundation complete; operational execution pending  
Date started: 2026-06-25  
Paused on: 2026-07-01  
Git anchor: `development` @ `4815a0a`  
Target: French fiscal self-certification dossier for MOSEHXL POS scope  

> **Resume here:** `00-PAUSE-CHECKPOINT.md` — authoritative record of what is done
> and what remains before signature.

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
| `00-PAUSE-CHECKPOINT.md` | **Pause/resume record** — what is done, what remains, resume order |
| `01-SCOPE.md` | Defines what product/version/modules are covered by the self-certification claim |
| `02-REFERENTIEL-MAPPING.md` | Maps the ISCA requirements to code, tests, docs, and operational evidence |
| `03-ATTESTATION-DRAFT.md` | Draft publisher attestation text to complete and sign |
| `04-OPERATIONAL-CONTROLS.md` | Required production policies: retention, backups, restore drills, archive handling |
| `05-EVIDENCE-INDEX.md` | Evidence catalogue: audits, patch notes, code modules, migrations, tests, commands |
| `06-RELEASE-FREEZE-CHECKLIST.md` | Checklist for freezing a specific release/commit as the attested version |
| `evidence-templates/` | Fillable records for retention, backup, restore drills, archive exports, config snapshots, and release evidence |

---

## Current Engineering Verdict

As of the **2026-07-01 pause**, the codebase has closed the historical compliance
blockers tracked in the 2026-05-20 audit and later closure pass:

- legal journal append paths are fail-closed for fiscal operations,
- legal journal has hash-chain integrity and DB-level mutation guards,
- closure bulletins are wired to legal journal entries,
- archive verify/download surfaces exist,
- software events and audit trail have fail-safe/structured coverage for critical flows,
- receipt/invoice/legal document generation has dedicated compliance hardening,
- the backend quality gate was green at pause (68 test files / 292 tests).

**Dossier documentation** (scope, mapping, attestation draft, operational policy,
evidence index, release checklist, fillable templates) is in place.

**Remaining before a signed claim** — procedural only; see `00-PAUSE-CHECKPOINT.md`:

1. approve scope (`01-SCOPE.md`),
2. execute operational controls and fill evidence templates,
3. freeze a release (`06-RELEASE-FREEZE-CHECKLIST.md`),
4. sign attestation (`03-ATTESTATION-DRAFT.md`).

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
