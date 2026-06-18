# 124 - P2-4 (Docs Truth Alignment Pass 4) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

After Dead Code Quarantine passes 1-3, key top-level/current-state docs still referenced removed modules and stale permission names.  
This patch aligns documentation with the actual codebase state to keep C4 documentation truthfulness intact.

## Scope

### In scope

1. Update current-state docs to remove stale references to:
   - removed `utils/thermalPrint/*`,
   - removed `SchemaManager.ts`,
   - removed legacy permission names no longer in backend registry.
2. Keep edits focused to actively consumed docs:
   - `README.md`
   - `DEVELOPMENT-STATE.md`
   - `docs/course/02-ARCHITECTURE.md`
   - `docs/course/05-DATABASE.md`
   - `docs/course/08-AUDIT-AND-FULL-COURSE.md`

### Out of scope

- Rewriting all historical patch notes/audits (these remain historical records).
- Large-scale restructuring of the course chapters.

## Design choices

- Preserve historical context where useful, but remove statements that currently describe deleted runtime files as active.
- Update permission list in `README.md` to match canonical backend permission registry.

## Step-by-step plan

### Step 1 - Remove stale runtime references in docs
- Edit targeted docs to reflect shared-table runtime and active modules only.

### Step 2 - Verify
- Run reference scans for deleted module names in edited docs.
- Ensure no stale permission names remain in `README.md`.

### Step 3 - Document
- Add implementation note with changed files and verification evidence.

## Acceptance criteria

- Edited docs no longer claim deleted modules are active runtime components.
- `README.md` permission list matches current backend permission vocabulary.
- Verification scans show no stale references in touched files.
