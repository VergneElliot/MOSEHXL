# 06 - Release Freeze Checklist

Status: Draft checklist  
Purpose: freeze a specific MOSEHXL release before signing the attestation.

---

## Rule

The self-certification attestation must refer to a fixed release, not to a
moving branch.

Do not sign until this checklist is complete.

---

## 1. Release Identity

| Field | Value |
|-------|-------|
| Product | MOSEHXL |
| Scope | POS/cash-register fiscal core, as defined in `01-SCOPE.md` |
| Release version | To fill |
| Git branch at freeze | To fill |
| Git commit | To fill |
| Git tag | To fill |
| Freeze date/time | To fill |
| Freezing operator | To fill |

Suggested commands:

```bash
git status -sb
git rev-parse HEAD
git log -1 --oneline
git tag -a self-cert-vX.Y.Z -m "MOSEHXL self-certification release X.Y.Z"
```

Use the team's normal release/tag convention if different.

---

## 2. Source Cleanliness

| Check | Command | Result |
|-------|---------|--------|
| Working tree clean | `git status -sb` | To fill |
| Latest commit identified | `git log -1 --oneline` | To fill |
| Patch index regenerated | `npm run docs:patch-notes-index` | To fill |
| Dossier files committed | `git status -sb` | To fill |

---

## 3. Quality Gates

Capture command output and archive it with the signed dossier.

### Backend

```bash
cd MuseBar/backend
npm run type-check
npm run lint
npm test
```

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Backend type-check | To fill | To fill |
| Backend lint | To fill | To fill |
| Backend tests | To fill | To fill |

### Frontend

```bash
cd MuseBar
npm run type-check
npm test -- --watchAll=false
npm run build
```

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Frontend type-check | To fill | To fill |
| Frontend tests | To fill | To fill |
| Frontend build | To fill | To fill |

### Bridge

```bash
cd MuseBar/bridge
npm run type-check
npm run lint
npm test
```

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Bridge type-check | To fill | To fill |
| Bridge lint | To fill | To fill |
| Bridge tests | To fill | To fill |

### Root / CI

```bash
npm run build
```

| Gate | Result | Evidence location |
|------|--------|-------------------|
| Root build | To fill | To fill |
| CI run URL | To fill | To fill |

---

## 4. Database and Migration Evidence

Run against the release environment or a production-equivalent database:

```bash
cd MuseBar/backend
npm run migration:status
```

| Evidence | Result | Evidence location |
|----------|--------|-------------------|
| Migration status | To fill | To fill |
| Migration checksum verification | To fill | To fill |
| Legal journal immutability test | To fill | To fill |
| Tenant isolation test | To fill | To fill |

---

## 5. Fiscal Smoke Evidence

For one test establishment in a controlled environment:

| Flow | Expected result | Result |
|------|-----------------|--------|
| Create paid order | SALE journal entry + audit entry | To fill |
| Cancel/refund order | REFUND/CANCEL journal entry + audit entry | To fill |
| Cash change operation | CHANGE journal entry + audit entry | To fill |
| Generate receipt | Legal mention and fiscal metadata present | To fill |
| Create daily closure | Closure bulletin + CLOSURE journal entry | To fill |
| Verify journal integrity | Valid chain | To fill |
| Create/download/verify archive | Archive verifies | To fill |

Evidence to archive:

1. API responses or screenshots,
2. journal verification output,
3. archive package,
4. closure bulletin export,
5. receipt sample.

---

## 6. Operational Controls

Complete `04-OPERATIONAL-CONTROLS.md` first.

| Control | Ready? | Evidence location |
|---------|--------|-------------------|
| 6-year retention policy | No | To fill |
| Daily backup schedule | No | To fill |
| Monthly long-retention backup | No | To fill |
| Off-site/immutable backup copy | No | To fill |
| Restore drill completed | No | To fill |
| Archive export procedure tested | No | To fill |
| Production access/change control documented | No | To fill |
| Production config snapshot captured without secrets | No | To fill |

---

## 7. Attestation Preparation

| Item | Ready? |
|------|--------|
| `01-SCOPE.md` approved | No |
| `02-REFERENTIEL-MAPPING.md` reviewed | No |
| `03-ATTESTATION-DRAFT.md` placeholders completed | No |
| `04-OPERATIONAL-CONTROLS.md` completed | No |
| `05-EVIDENCE-INDEX.md` complete for frozen release | No |
| Evidence archive created | No |
| Legal/accounting review completed or explicitly waived | No |
| Signed PDF generated | No |
| Signed PDF stored off-site | No |

---

## 8. Post-Signature Discipline

After signing:

1. do not move the release tag,
2. archive the exact source commit and evidence package,
3. open a new patch-note entry for any fiscal behavior change,
4. decide whether each fiscal change requires an attestation addendum,
5. run restore drills quarterly and store the logs,
6. keep evidence for at least the retention period.

---

## Current Status

This checklist is **not complete** until all required fields are filled and all
`Ready?` values required for signature are `Yes`.
