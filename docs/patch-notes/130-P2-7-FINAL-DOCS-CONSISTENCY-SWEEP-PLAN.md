# 130 - P2-7 (Final Docs Consistency Sweep) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

After Pass 6, one meaningful remaining drift area is educational code samples in `course/06` that still reflect older permission/auth semantics and permission vocabulary.

## Scope

### In scope

1. Align `docs/course/06-AUTH-AND-SECURITY.md` examples to current backend/frontend semantics:
   - strict `requirePermission` behavior (no implicit admin bypass in the helper),
   - current permission vocabulary,
   - role check wording aligned with current AppRouter behavior.
2. Small wording alignment in docs hub course listing for chapter 09.
3. Add implementation note with verification scans.

### Out of scope

- Full rewrite of security chapter.
- Changes to application code.

## Design choices

- Keep educational explanations simple, but ensure snippets match current architecture principles.
- Prioritize avoiding misleading auth/permission examples for new contributors.

## Step-by-step plan

### Step 1 - Update chapter 06 snippets
- Replace stale permission names and old bypass snippet.
- Update role-gate example text to current role semantics.

### Step 2 - Tighten TOC chapter wording
- Clarify chapter 09 description as historical baseline + verification guidance.

### Step 3 - Verify
- Run targeted scans for stale snippet terms in touched docs.

## Acceptance criteria

- Chapter 06 no longer shows outdated permission names or outdated requirePermission behavior.
- TOC chapter 09 wording matches historical-labeling strategy.
