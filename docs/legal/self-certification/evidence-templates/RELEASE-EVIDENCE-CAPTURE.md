# Release Evidence Capture

Status: To fill at each attested release freeze  
Related checklist: `../06-RELEASE-FREEZE-CHECKLIST.md`

---

## Record Identity

| Field | Value |
|-------|-------|
| Capture date/time | To fill |
| Operator | To fill |
| Reviewed by | To fill |
| Release version | To fill |
| Git tag | To fill |
| Git commit | To fill |
| Branch | To fill |

---

## Source Control Evidence

Capture output:

```bash
git status -sb
git rev-parse HEAD
git log -1 --oneline
git tag --points-at HEAD
```

| Command | Result/evidence location |
|---------|--------------------------|
| `git status -sb` | To fill |
| `git rev-parse HEAD` | To fill |
| `git log -1 --oneline` | To fill |
| `git tag --points-at HEAD` | To fill |

---

## Documentation Evidence

Capture output:

```bash
npm run docs:patch-notes-index
git diff --exit-code docs/patch-notes/LATEST-INDEX.md
```

| Check | Result/evidence location |
|-------|--------------------------|
| Patch-note index current | To fill |
| Self-cert dossier committed | To fill |
| Attestation draft completed | To fill |
| Operational controls completed | To fill |

---

## Quality Gate Evidence

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
| CI URL | To fill | To fill |

---

## Database Evidence

```bash
cd MuseBar/backend
npm run migration:status
```

| Check | Result | Evidence location |
|-------|--------|-------------------|
| Migration status | To fill | To fill |
| Migration checksum verification | To fill | To fill |
| Real DB compliance test | To fill | To fill |
| Restore drill linked | To fill | To fill |

---

## Fiscal Smoke Evidence

| Flow | Result | Evidence location |
|------|--------|-------------------|
| Paid order creates SALE journal entry | To fill | To fill |
| Refund/cancel creates legal journal entry | To fill | To fill |
| Cash change creates legal journal entry | To fill | To fill |
| Receipt contains legal/fiscal metadata | To fill | To fill |
| Closure creates bulletin and CLOSURE journal entry | To fill | To fill |
| Journal verification passes | To fill | To fill |
| Archive export/download/verify passes | To fill | To fill |

---

## Attached Operational Evidence

| Evidence record | Path/location |
|-----------------|---------------|
| Retention policy record | To fill |
| Backup evidence record | To fill |
| Restore drill record | To fill |
| Archive export record | To fill |
| Production config snapshot | To fill |

---

## Release Freeze Verdict

| Question | Answer |
|----------|--------|
| All required quality gates passed? | To fill |
| Operational controls complete? | To fill |
| Evidence package archived? | To fill |
| Attestation ready to sign? | To fill |
| Approved by | To fill |
| Approval date | To fill |
