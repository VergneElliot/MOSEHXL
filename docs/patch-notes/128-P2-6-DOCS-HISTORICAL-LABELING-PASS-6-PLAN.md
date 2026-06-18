# 128 - P2-6 (Docs Historical Labeling Pass 6) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

After Pass 5, remaining ambiguity is mostly in course/table-of-contents navigation:

1. Some entries can be read as current runtime truth even when they describe historical snapshots.
2. `course/09` still uses wording that can be interpreted as a current authoritative DB state despite major post-March remediation waves.

## Scope

### In scope

1. Add explicit historical/current labeling in docs navigation where needed.
2. Clarify `course/09` as historical baseline guidance with current-source pointers.
3. Update a few outdated summary labels in `docs/00-TABLE-OF-CONTENTS.md`.
4. Add implementation patch note with verification scans.

### Out of scope

- Full rewrite of all course chapters.
- Editing historical audit files and old patch notes content.

## Design choices

- Preserve educational historical context, but prevent readers from mistaking it for current state.
- Point users to current authoritative sources (`DEVELOPMENT-STATE.md`, latest patch notes, migration status command).

## Step-by-step plan

### Step 1 - TOC clarity pass
- Update summary labels that imply deprecated schema-era behavior is current.
- Add a concise note distinguishing historical snapshot chapters vs live status docs.

### Step 2 - Course 09 labeling pass
- Mark "today/current" wording as historical baseline where appropriate.
- Replace stale absolute claims with "historical at that snapshot" + current pointers.

### Step 3 - Verification
- Run targeted scans for key stale phrases in touched files.

## Acceptance criteria

- Readers can clearly distinguish historical snapshot docs from current-state sources.
- Touched files no longer assert deprecated schema-era assumptions as current runtime truth.
