# 421 - Self-Certification Dossier Foundation - Implementation

Date: 2026-06-25  
Scope: Documentation / self-certification evidence package

---

## 1) Context

The code-level fiscal blockers from the May 2026 audit have been closed, and
the remaining self-certification work is procedural: scope, referentiel mapping,
attestation, operational controls, and release evidence.

This implementation starts a dedicated self-certification dossier so those
non-code requirements can be completed in a versioned, auditable way.

---

## 2) What changed

Added `docs/legal/self-certification/` with:

| File | Purpose |
|------|---------|
| `README.md` | Dossier overview, positioning, completion order |
| `01-SCOPE.md` | Conservative POS-first self-certification scope and explicit non-claims |
| `02-REFERENTIEL-MAPPING.md` | ISCA mapping from requirements to MOSEHXL code/test/docs evidence |
| `03-ATTESTATION-DRAFT.md` | Draft French publisher attestation and English working translation |
| `04-OPERATIONAL-CONTROLS.md` | Retention, backup, off-site/WORM, restore drill, archive export, and change-control templates |
| `05-EVIDENCE-INDEX.md` | Catalogue of audits, patch notes, code modules, migrations, tests, and release evidence |
| `06-RELEASE-FREEZE-CHECKLIST.md` | Checklist for freezing a specific version before signing |

---

## 3) Key decisions

1. Initial scope should be the POS/cash-register fiscal core: B2C sales,
   payments, refunds/cancellations, change operations, receipts, legal journal,
   audit trail, closures, and archives.
2. Invoice and bridge evidence are documented, but the first attestation should
   not over-broaden the claim unless the publisher intentionally accepts that
   scope.
3. The dossier explicitly avoids claiming NF-525/LNE certification. It supports
   the self-attestation route only.
4. The attestation must reference a frozen tag/commit, not a moving branch.
5. Operational controls remain the main blocker before signature: retention,
   backups, off-site/immutable storage, restore drill evidence, and archive
   export procedure.

---

## 4) Verification

Documentation-only change. Reviewed for:

1. clear scope boundaries,
2. explicit non-claims,
3. evidence traceability to current audits, patch notes, code modules,
   migrations, and tests,
4. operational controls required before signature.

Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```

---

## 5) Outcome

The project now has a structured self-certification dossier foundation. The
remaining work is to complete the release freeze evidence, implement/record
operational controls, fill the publisher details, and sign the attestation for a
specific release.
