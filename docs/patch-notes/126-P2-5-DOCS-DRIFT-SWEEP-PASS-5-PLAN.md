# 126 - P2-5 (Docs Drift Sweep Pass 5) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

After Pass 4, some narrative drift still remained in high-visibility docs:

1. Course text still states the historical "7 critical fixes remain" posture.
2. `DEVELOPMENT-STATE.md` header framing is still locked to March 2026 language.
3. README docs pointer still references "7 critical fixes" wording.

These are documentation-truth issues (C4) rather than code issues.

## Scope

### In scope

1. Update stale status language in:
   - `docs/course/08-AUDIT-AND-FULL-COURSE.md`
   - `DEVELOPMENT-STATE.md`
   - `README.md` (docs pointer wording only)
2. Preserve historical context while clearly separating "historical snapshot" vs "current state".
3. Add plan + implementation patch notes.

### Out of scope

- Rewriting historical audit files or old patch notes.
- New feature or behavioral changes.

## Design choices

- Keep historical sections but relabel them as historical where needed.
- Replace "missing/pending" statements with current-state references to completed remediation waves.
- Keep edits minimal and surgical.

## Step-by-step plan

### Step 1 - Course status correction
- Replace outdated "7 critical fixes remain" blocks with historical framing and current-state status.
- Update "What's missing" callout in request-flow section to reflect implemented behavior.

### Step 2 - Development state freshness update
- Refresh date framing and post-audit summary language.
- Clarify resolved/decided wording for the critical-fixes table.

### Step 3 - README docs pointer alignment
- Remove stale "7 critical fixes" wording from the development-state pointer.

### Step 4 - Verify
- Run targeted text scans for stale phrases in touched files.

## Acceptance criteria

- Touched docs no longer claim the old "7 fixes still pending" posture as current.
- Historical context remains intact and clearly labeled.
- README pointer language matches current document purpose.
