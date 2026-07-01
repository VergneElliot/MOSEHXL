# 00 - Pause Checkpoint (Self-Certification)

**Status:** Paused — safe to resume later  
**Paused on:** 2026-07-01  
**Git anchor:** `development` @ `4815a0a` (`docs(legal): add self-certification evidence templates`)  
**Reason for pause:** Feature work takes priority; procedural/operational items remain.

---

## Where we left off

The self-certification dossier foundation is complete. Code-side ISCA pillars are
implemented and the backend quality gate was green at the last cleanup pass
(68 test files / 292 tests after Phase 4E auth modularization).

Documentation delivered in patch notes `421` and `422`:

| Deliverable | File(s) | Status |
|-------------|---------|--------|
| Dossier overview | `README.md` | Done |
| Scope draft (POS-first) | `01-SCOPE.md` | Draft — not formally approved |
| ISCA → code/test mapping | `02-REFERENTIEL-MAPPING.md` | Draft — review before sign |
| Attestation text | `03-ATTESTATION-DRAFT.md` | Draft — unsigned |
| Operational controls policy | `04-OPERATIONAL-CONTROLS.md` | Draft — controls not executed |
| Evidence catalogue | `05-EVIDENCE-INDEX.md` | Done (catalogue); evidence not filled |
| Release freeze checklist | `06-RELEASE-FREEZE-CHECKLIST.md` | Draft — no release frozen yet |
| Fillable evidence templates | `evidence-templates/` | Done (templates); records not filled |

---

## What is done (no further code required to pause)

1. **Fiscal core in code** — legal journal, hash chain, DB triggers, audit trail,
   fail-closed closures, archives, invoice compliance hardening.
2. **Green test corpus** — reproducible backend suite is part of the evidence
   package (restore green baseline before signing if the branch has moved).
3. **Dossier structure** — scope, mapping, attestation draft, operational policy,
   evidence index, release checklist, and fillable templates.

---

## What remains before a signed self-certification claim

These are **procedural/operational**, not feature-development tasks.

### Step 1 — Approve scope

- [ ] Review and approve `01-SCOPE.md`.
- [ ] Confirm POS/cash-register B2C core is the initial claim.
- [ ] Decide whether B2B invoice subsystem stays **adjacent** (recommended) or is
      included in the first signed scope.

### Step 2 — Execute operational controls

Fill records from `evidence-templates/` into dated evidence folders. Mark each
control **Ready** in `04-OPERATIONAL-CONTROLS.md` when complete.

| Control | Template | Ready? |
|---------|----------|--------|
| 6-year retention policy | `RETENTION-POLICY-RECORD.md` | No |
| Daily backup schedule | `BACKUP-EVIDENCE-RECORD.md` | No |
| Monthly 6-year backup retention | `BACKUP-EVIDENCE-RECORD.md` | No |
| Off-site/immutable backup | `BACKUP-EVIDENCE-RECORD.md` | No |
| Restore drill completed | `RESTORE-DRILL-RECORD.md` | No |
| Archive export procedure tested | `ARCHIVE-EXPORT-RECORD.md` | No |
| Production access/change control documented | `04-OPERATIONAL-CONTROLS.md` §6 | No |
| Release configuration captured | `PRODUCTION-CONFIG-SNAPSHOT.md` | No |

Minimum operational work:

1. Choose and document backup/storage (daily + monthly 6-year retention).
2. Configure off-site or immutable backup copy.
3. Run at least one restore drill (required before signature; quarterly after).
4. Test archive export → verify → download on production-like data.
5. Capture production config snapshot (no secrets).

### Step 3 — Freeze a release

Do **not** sign against a moving branch.

1. Complete `06-RELEASE-FREEZE-CHECKLIST.md`.
2. Capture quality gates and fiscal smoke tests in
   `evidence-templates/RELEASE-EVIDENCE-CAPTURE.md`.
3. Tag the commit (e.g. `self-cert-vX.Y.Z`).

### Step 4 — Sign the attestation

1. Re-run backend quality gates on the frozen commit.
2. Complete `03-ATTESTATION-DRAFT.md` (publisher details, release version, date).
3. Optional but recommended: legal/accounting review of attestation wording.
4. Sign PDF and store in dossier archive + off-site copy.

---

## Resume order (when returning to self-cert)

```
1. Approve 01-SCOPE.md
2. Execute operational controls (templates → dated evidence folders)
3. Freeze release (06-RELEASE-FREEZE-CHECKLIST.md + RELEASE-EVIDENCE-CAPTURE.md)
4. Sign 03-ATTESTATION-DRAFT.md
```

Parallel roadmap reference: cleanup/perf work is paused separately — see
`docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md` § **Pause checkpoint**.

---

## Related patch notes

- `421-SELF-CERTIFICATION-DOSSIER-FOUNDATION-IMPLEMENTATION.md`
- `422-SELF-CERTIFICATION-OPERATIONAL-EVIDENCE-TEMPLATES-IMPLEMENTATION.md`
- `423-SELF-CERTIFICATION-AND-ROADMAP-PAUSE-CHECKPOINT-IMPLEMENTATION.md`
