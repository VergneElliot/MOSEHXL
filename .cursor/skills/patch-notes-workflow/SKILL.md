---
name: patch-notes-workflow
description: >-
  MOSEHXL development workflow: patch-note PLAN/IMPLEMENTATION numbering,
  CHANGELOG fiscal impact, branch model, and index regeneration. Use when
  starting a new feature, audit fix, or remediation task, or when the user
  asks how to document work in this project.
---

# Patch Notes Workflow

## Branch model

- All work on **`development`**
- Merge to **`main`** via PR only (`main` = production mosehxl.com)

## Feature delivery loop

1. Write **PLAN** patch note at next number N
2. Implement code + tests
3. Write **IMPLEMENTATION** patch note at N+1 (consecutive, not same number)
4. Run verification (lint, typecheck, tests, manual checks)
5. Commit and push to `development`
6. Regenerate index: `npm run docs:patch-notes-index`

## Naming convention

```
docs/patch-notes/NNN-SLUG-PLAN.md
docs/patch-notes/NNN-SLUG-IMPLEMENTATION.md
```

- **NNN** = next available integer (check `LATEST-INDEX.md` — currently ~471+)
- **PLAN at N, IMPLEMENTATION at N+1** (consecutive numbering)
- Priority prefixes in slug: `P0`, `P1`, `P2`, `P3`; pillar codes: `L` (legal), `S` (security), `Q` (quality)

### Multi-slice exception

One PLAN, multiple IMPLEMENTATION slices (A, B, C…):

```
467-FEATURE-PLAN.md
468-FEATURE-SLICE-A-IMPLEMENTATION.md
469-FEATURE-SLICE-B-IMPLEMENTATION.md
```

## CHANGELOG.md

Every release-visible change needs an entry. Classify fiscal impact:

| Level | When |
|-------|------|
| **MAJOR** | ISCA parameter change → new attestation required |
| **MINOR** | New non-fiscal capability |
| **PATCH** | Bug fix / hardening |

Fiscal-path PRs: `.github/workflows/fiscal-path-guard.yml` requires `CHANGELOG.md` update with `Fiscal impact:` line when fiscal/legal paths change.

## Documentation-only changes

Per project convention: **do not** create new patch notes for doc-only edits.

## Live status sources

| Need | File |
|------|------|
| Fastest current state | `docs/CURRENT-TRUTH.md` |
| Branch reality | `DEVELOPMENT-STATE.md` |
| Latest changes | `docs/patch-notes/LATEST-INDEX.md` |
| Audit truth | `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` |

If audit and patch notes disagree, prefer latest audit row + newest patch notes.

## PLAN template (minimum sections)

```markdown
# NNN — Title (PLAN)

## Context
Why this change is needed.

## Scope
Files/areas touched.

## Approach
Step-by-step implementation plan.

## Verification
- [ ] Tests to add/run
- [ ] Manual checks
- [ ] Fiscal impact assessment (if applicable)

## Risks
What could break; rollback plan.
```

## IMPLEMENTATION template (minimum sections)

```markdown
# NNN — Title (IMPLEMENTATION)

## Summary
What was done.

## Files changed
- path/to/file.ts — description

## Verification results
- npm test: pass
- manual: ...

## Follow-ups
Deferred items, if any.
```

## Agent checklist before finishing a task

- [ ] Code changes on `development` (or feature branch merging to it)
- [ ] PLAN + IMPLEMENTATION patch notes if feature/fix delivery (not doc-only)
- [ ] CHANGELOG entry if user-facing or fiscal
- [ ] `npm run docs:patch-notes-index` if patch notes added
- [ ] Tests pass for touched workspaces

## Stale docs warning

Do **not** use `docs/patch-notes/SESSION-SUMMARY-FOR-SUCCESSOR.md` as current truth — it predates legal scoping and fail-safe journal work.
