# 129 - P2-6 (Docs Historical Labeling Pass 6) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/128-P2-6-DOCS-HISTORICAL-LABELING-PASS-6-PLAN.md`

## What was implemented

Updated:

1. `docs/00-TABLE-OF-CONTENTS.md`
2. `docs/course/09-DATABASE-ARCHITECTURE-COMPATIBILITY.md`

## Changes made

### 1) TOC historical/current clarity
- Added an explicit note near the top of the docs hub:
  - use `DEVELOPMENT-STATE.md` + latest patch notes for live status,
  - treat some course sections as historical teaching snapshots.
- Updated patch-note summaries with potentially confusing schema-era wording:
  - patch `15` summary now labeled as a historical pre-shared-table phase fix.
  - patch `18` summary now labeled as historical schema-era context.
- Updated development-status pointer wording from "what still needs work" to "current completion state and active priorities."

### 2) Course 09 historical framing and current pointers
- Reframed the chapter as a historical March-2026 baseline plus live pointers.
- Added explicit current-source guidance (`migration:status`, `DEVELOPMENT-STATE.md`, latest patch notes).
- Replaced stale absolute statements that could be interpreted as current runtime truth.
- Updated setup guidance to emphasize migration-driven setup as canonical.
- Updated recommended next steps to center `migration:status` + migration-chain-first workflow.

## Verification

Targeted scans:

1. `docs/00-TABLE-OF-CONTENTS.md` ✅
   - stale phrase checks:
     - `single SchemaManager`
     - `establishment's schema`
     - `what still needs work`
   - Result: no matches.

2. `docs/course/09-DATABASE-ARCHITECTURE-COMPATIBILITY.md` ✅
   - stale phrase checks:
     - `How the DB is set up today`
     - `Currently in \`migrations/files/\``
     - `legal tables are global`
     - `CLI only applies the email-constraint migration`
   - Result: no matches.

3. Presence checks for new clarity anchors ✅
   - `historical`
   - `migration:status`
   - `latest patch notes`
   - Result: present in chapter 09 as intended.

## Outcome

Pass 6 is complete:
- documentation navigation now better distinguishes historical context from current runtime truth,
- chapter 09 no longer presents schema-era assumptions as current without qualification,
- readers are directed to authoritative live status sources for operational decisions.
