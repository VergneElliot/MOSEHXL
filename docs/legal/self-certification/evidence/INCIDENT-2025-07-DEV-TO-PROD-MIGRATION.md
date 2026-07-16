# INCIDENT — Dev→Production Legal Journal Migration

**Incident ID:** INC-2025-07-30-DEV-TO-PROD-MIGRATION  
**Date of event:** 2025-07-30  
**Date of this record:** 2026-07-16  
**Severity:** Operational / historical (no revenue loss)  
**Status:** Closed — documented; chain intact under era-aware verification  
**Related evidence:**
- `phase1-forensics/2026-07-16-HASH-FORMAT-ERAS.md`
- `phase1-forensics/raw/2026-07-16-journal-integrity-baseline.txt`
- `phase1-forensics/raw/2026-07-16-seq128-output.txt`
- Production server reflog: clone at 2025-07-30 08:21 UTC

---

## 1. What happened

On **2025-07-30**, the MuseBar establishment’s legal journal was moved from the
local development database into the cloud production database. Sequences
**1–607** (≈13 days of early operation, first entry 2025-07-17) were preserved
as historical data. The production hash chain was then **intentionally
restarted** at sequence **609**, while sequence numbering continued without
reset (next sale = 610), in line with BOFiP guidance that counters must not
be reset across versions/migrations.

Two in-band journal markers were written the same morning:

| Seq | Type | Marker | Meaning |
|-----|------|--------|---------|
| 608 | CORRECTION | `MIGRATION_DOCUMENTED_CHAIN_VALID` | Declares sequences 1–607 migrated; business data preserved |
| 609 | ARCHIVE | `CHECKPOINT_MIGRATION_BASELINE` | New hash-chain genesis (`previous_hash` = 64 zeros) |

These markers use literal (non-SHA-256) `current_hash` values by design so they
cannot be confused with ordinary fiscal entries.

## 2. Related early incident (seq 128–130)

On **2025-07-17/18**, before the migration, a **116.50 €** card sale (order 87)
was lost to a database issue and **manually re-entered** the next day as
sequence **128** (`recovery_order: true`, full line items preserved). Sequences
**129** and **130** are CORRECTION entries of type `HASH_CHAIN_INTEGRITY`
documenting that out-of-order insert. Business impact recorded at the time:
“NONE — all transaction data preserved.”

## 3. Proof amounts were not altered

Read-only forensic recomputation (2026-07-16):

- Sequences **1–607** verify under the **development-era** hash payload format
  (UTC timestamp + 2-decimal amounts), except the three documented markers
  128–130.
- Sequences **610+** verify under subsequent production eras (see eras report).
- **Zero sequence gaps** across the full journal (1 → 21 284+).
- The only chain-link discontinuity is the **documented** restart at seq 609.

Therefore the migration preserved the fiscal payload; the integrity flags seen
under the *current-only* verifier were format-evolution artefacts, not
tampering.

## 4. Reconciliation note

Journal SALE totals for the migrated window remain available for comparison to
VAT filings. Formal accountant sign-off for sample months is tracked as Phase 1
step 5 / Phase 2 follow-up (suggest August 2025 and December 2025, including
the backfilled 2025-12-01 closure — see closure anomalies report).

## 5. Corrective / lasting measures

| Measure | Status |
|---------|--------|
| In-band CORRECTION + ARCHIVE markers at migration time | Done (2025-07-30) |
| Era-aware `verifyJournalIntegrity` + `documented_exceptions` API | Done (2026-07-16) |
| DB INSERT trigger enforcing current hash format | Done (2026-05-21; live since 2026-06-18 deploy) |
| Incident filed in self-certification evidence | This document |

## 6. Attestation wording (for `01-SCOPE.md`)

> The legal journal history for the covered establishment includes one
> documented development-to-production migration event (2025-07-30, sequences
> 1–607 preserved, chain restarted at sequence 609 without resetting the
> sequence counter), plus one documented recovery sale (sequence 128) with
> accompanying correction entries. These events are recorded in-band in the
> journal and in the publisher’s incident evidence file
> `INCIDENT-2025-07-DEV-TO-PROD-MIGRATION.md`. Era-aware integrity verification
> treats them as documented exceptions; they do not indicate unexplained
> alteration of fiscal amounts.

## 7. Approval

| Field | Value |
|-------|-------|
| Prepared by | MOSEHXL publisher (AI-assisted forensic pass) |
| Reviewed by | To fill (publisher / accountant) |
| Approved for dossier inclusion | To fill |
| Approval date | To fill |
