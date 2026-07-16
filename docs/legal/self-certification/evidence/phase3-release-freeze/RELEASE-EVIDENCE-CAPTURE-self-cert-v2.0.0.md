# Release Evidence Capture — self-cert-v2.0.0

Status: Quality gates captured 2026-07-16; operational controls deferred to Phase 4; live deploy deferred until Phases 4–5 complete  
Related checklist: `../06-RELEASE-FREEZE-CHECKLIST.md`  
Raw command outputs: `./raw/`

---

## Record Identity

| Field | Value |
|-------|-------|
| Capture date/time | 2026-07-16 (Europe/Paris evening; UTC ~17:48–17:50) |
| Operator | MOSEHXL publisher (AI-assisted freeze pass) |
| Reviewed by | To fill (publisher sign-off before attestation) |
| Release version | **2.0.0** |
| Git tag | **self-cert-v2.0.0** |
| Git commit | `38c391b` (version bump + gates); tag tip = `git rev-parse self-cert-v2.0.0^{}` |
| Branch | `development` / `main` (kept in sync) |

---

## Source Control Evidence

| Command | Result/evidence location |
|---------|--------------------------|
| `git status -sb` | Clean after freeze commit — `./raw/git-pre-freeze.txt` + post-tag status |
| `git rev-parse HEAD` | See freeze commit on tag `self-cert-v2.0.0` |
| `git log -1 --oneline` | Freeze commit message includes version bump + changelog |
| `git tag --points-at HEAD` | `self-cert-v2.0.0` |

---

## Documentation Evidence

| Check | Result/evidence location |
|-------|--------------------------|
| Patch-note index current | PASS — `./raw/patch-notes-index.txt` (EXIT:0) |
| Self-cert dossier committed | Partial — Phases 1–2 evidence committed; Phase 4–5 ops/attestation still open |
| Attestation draft completed | No — Phase 5 |
| Operational controls completed | No — Phase 4 |
| CHANGELOG | `CHANGELOG.md` — [2.0.0] fiscal-impact MAJOR |

---

## Quality Gate Evidence

### Backend

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Backend type-check | **PASS** EXIT:0 | `./raw/backend-type-check.txt` |
| Backend lint | **PASS** EXIT:0 | `./raw/backend-lint.txt` |
| Backend tests | **PASS** EXIT:0 — 82 files / 338 tests | `./raw/backend-test.txt` |
| Schema drift | **PASS** EXIT:0 | `./raw/backend-schema-drift.txt` |
| Migration status (local env) | **PASS** EXIT:0 — 44/44 executed, 0 pending | `./raw/backend-migration-status.txt` |

### Frontend

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Frontend type-check | **PASS** EXIT:0 | `./raw/frontend-type-check.txt` |
| Frontend tests | **PASS** EXIT:0 — 4 files / 24 tests | `./raw/frontend-test.txt` |
| Frontend build | **PASS** EXIT:0 — Vite built in ~30s | `./raw/frontend-build.txt` |

### Bridge

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Bridge type-check | **PASS** EXIT:0 | `./raw/bridge-type-check.txt` |
| Bridge lint | **PASS** EXIT:0 | `./raw/bridge-lint.txt` |
| Bridge tests | **PASS** EXIT:0 — 6/6 | `./raw/bridge-test.txt` |

### Root / CI

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Root build (frontend+backend+bridge) | **PASS** EXIT:0 | `./raw/root-build.txt` |
| CI URL | To fill after push (GitHub Actions on tag/commit) | — |

---

## Database Evidence

| Check | Result | Evidence location |
|-------|--------|-------------------|
| Migration status | PASS on local configured DB (44 executed) | `./raw/backend-migration-status.txt` |
| Migration checksum verification | Covered by migration runner status output | same |
| Real DB compliance test | Not re-run in this freeze pass; covered by backend unit/integration suite including legal journal integrity | backend-test.txt |
| Restore drill linked | Deferred — Phase 4 | — |

Production cloud migration status: re-confirm at live deploy (Phase 4/5); production was already on current schema at Phase 1 forensics (2026-07-16).

---

## Fiscal Smoke Evidence

Automated coverage (no live production writes during freeze):

| Flow | Result | Evidence location |
|------|--------|-------------------|
| Paid order → SALE journal | Covered by order journal fail-safe / legal tests | backend test suite |
| Refund/cancel → journal | Covered by cancellation fail-safe tests | backend test suite |
| Cash change → journal | Covered by CHANGE-related legal tests | backend test suite |
| Receipt legal/fiscal metadata | Covered by receipt legal mention / parity tests | backend test suite |
| Closure → bulletin + CLOSURE | Covered by closure scheduler / operations tests | backend test suite |
| Journal verification | Era-aware verifier unit tests (7) + integrity suite | `journalSigning.integrity.test.ts` |
| Archive export/verify | Covered by archiveService tests | backend test suite |

Manual UAT on a non-production establishment: optional before live deploy; not blocking the git tag.

---

## Attached Operational Evidence

| Evidence record | Path/location |
|-----------------|---------------|
| Retention / backup / restore / archive / config | **Deferred to Phase 4** |

---

## Release Freeze Verdict

| Question | Answer |
|----------|--------|
| All required quality gates passed? | **Yes** (backend, frontend, bridge, root build) |
| Operational controls complete? | **No** — Phase 4 |
| Evidence package archived? | Quality-gate package yes (`phase3-release-freeze/`); ops package pending |
| Attestation ready to sign? | **No** — Phases 4–5 remaining |
| Live cloud running this tag? | **No** — deliberately deferred until process complete |
| Approved by | To fill |
| Approval date | To fill |
