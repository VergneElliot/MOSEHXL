# 06 - Release Freeze Checklist

Status: **In progress** — quality gates + version tag for `self-cert-v2.0.0` (2026-07-16); operational controls and attestation remain Phase 4–5  
Purpose: freeze a specific MOSEHXL release before signing the attestation.  
Resume record: `00-PAUSE-CHECKPOINT.md`  
Evidence package: `evidence/phase3-release-freeze/`

---

## Rule

The self-certification attestation must refer to a fixed release, not to a
moving branch.

Do not sign until this checklist is complete **and** Phase 4–5 items below are Yes.

---

## 1. Release Identity

| Field | Value |
|-------|-------|
| Product | MOSEHXL |
| Scope | POS/cash-register fiscal core, as defined in `01-SCOPE.md` |
| Release version | **2.0.0** |
| Git branch at freeze | `development` / `main` (synced) |
| Git commit | See tag `self-cert-v2.0.0` (filled at tag time) |
| Git tag | **self-cert-v2.0.0** |
| Freeze date/time | 2026-07-16 |
| Freezing operator | MOSEHXL publisher (AI-assisted); publisher review pending |

---

## 2. Source Cleanliness

| Check | Command | Result |
|-------|---------|--------|
| Working tree clean | `git status -sb` | Clean after freeze commit |
| Latest commit identified | `git log -1 --oneline` | Freeze commit on tag |
| Patch index regenerated | `npm run docs:patch-notes-index` | PASS — `evidence/phase3-release-freeze/raw/patch-notes-index.txt` |
| Dossier files committed | `git status -sb` | Phase 1–3 evidence committed; Phase 4–5 pending |

---

## 3. Quality Gates

See `evidence/phase3-release-freeze/RELEASE-EVIDENCE-CAPTURE-self-cert-v2.0.0.md`.

### Backend

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Backend type-check | **PASS** | `evidence/phase3-release-freeze/raw/backend-type-check.txt` |
| Backend lint | **PASS** | `…/backend-lint.txt` |
| Backend tests | **PASS** (82 files / 338 tests) | `…/backend-test.txt` |

### Frontend

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Frontend type-check | **PASS** | `…/frontend-type-check.txt` |
| Frontend tests | **PASS** (4 files / 24 tests) | `…/frontend-test.txt` |
| Frontend build | **PASS** | `…/frontend-build.txt` |

### Bridge

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Bridge type-check | **PASS** | `…/bridge-type-check.txt` |
| Bridge lint | **PASS** | `…/bridge-lint.txt` |
| Bridge tests | **PASS** (6/6) | `…/bridge-test.txt` |

### Root / CI

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Root build | **PASS** | `…/root-build.txt` |
| CI run URL | To fill after push | — |

---

## 4. Database and Migration Evidence

| Evidence | Result | Evidence location |
|----------|--------|-------------------|
| Migration status | **PASS** local — 44/44 executed | `…/backend-migration-status.txt` |
| Migration checksum verification | Included in status output | same |
| Legal journal immutability test | Covered by backend suite | `…/backend-test.txt` |
| Tenant isolation test | Covered by backend suite | same |
| Schema drift check | **PASS** | `…/backend-schema-drift.txt` |

---

## 5. Fiscal Smoke Evidence

| Flow | Expected result | Result |
|------|-----------------|--------|
| Create paid order | SALE journal entry + audit entry | Covered by automated tests (no live prod writes at freeze) |
| Cancel/refund order | REFUND/CANCEL journal entry + audit entry | Covered by automated tests |
| Cash change operation | CHANGE journal entry + audit entry | Covered by automated tests |
| Generate receipt | Legal mention and fiscal metadata present | Covered by automated tests |
| Create daily closure | Closure bulletin + CLOSURE journal entry | Covered by automated tests |
| Verify journal integrity | Valid chain (era-aware) | Covered by integrity unit tests |
| Create/download/verify archive | Archive verifies | Covered by automated tests |

---

## 6. Operational Controls

Complete `04-OPERATIONAL-CONTROLS.md` in **Phase 4**.

| Control | Ready? | Evidence location |
|---------|--------|-------------------|
| 6-year retention policy | No | Phase 4 |
| Daily backup schedule | No | Phase 4 |
| Monthly long-retention backup | No | Phase 4 |
| Off-site/immutable backup copy | No | Phase 4 |
| Restore drill completed | No | Phase 4 |
| Archive export procedure tested | No | Phase 4 |
| Production access/change control documented | No | Phase 4 |
| Production config snapshot captured without secrets | No | Phase 4 |

---

## 7. Attestation Preparation

| Item | Ready? |
|------|--------|
| `01-SCOPE.md` approved | No — Phase 5 |
| `02-REFERENTIEL-MAPPING.md` reviewed | No — Phase 5 |
| `03-ATTESTATION-DRAFT.md` placeholders completed | No — Phase 5 |
| `04-OPERATIONAL-CONTROLS.md` completed | No — Phase 4 |
| `05-EVIDENCE-INDEX.md` complete for frozen release | Partial |
| Evidence archive created | Partial (Phase 3 gates) |
| Legal/accounting review completed or explicitly waived | No |
| Signed PDF generated | No |
| Signed PDF stored off-site | No |
| Live cloud on tagged release | No — deferred until Phases 4–5 |

---

## 8. Post-Signature Discipline

After signing:

1. do not move the release tag,
2. archive the exact source commit and evidence package,
3. open a new patch-note / CHANGELOG entry for any fiscal behavior change,
4. decide whether each fiscal change requires a new attestation (MAJOR),
5. run restore drills quarterly and store the logs,
6. keep evidence for at least the retention period.

---

## Current Status

**Phase 3 (version + quality gates + tag): complete once tag is pushed.**  
**Signature-ready: not yet** — Phase 4 (ops evidence) and Phase 5 (dossier/sign) remain.
