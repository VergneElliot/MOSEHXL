# Legal Journal Hash-Format Eras — Forensic Reconstruction

Date of analysis: 2026-07-16
Analyst: MOSEHXL publisher (AI-assisted), read-only access to production database
Scope: full `legal_journal` table, establishment `ce1b61b1-10e7-430c-97aa-69297fafb780`
(MuseBar), 21 284 entries, sequences 1 → 21 284, 2025-07-17 → 2026-07-16.
Raw query outputs and exact SQL: `./raw/` (all sessions `BEGIN READ ONLY`).

---

## 1. Question investigated

The application's integrity verifier reports hash failures on historical journal
entries ("data may have been tampered with"). Are these failures evidence of data
alteration, or artifacts of the hash payload format evolving across software
versions?

## 2. Method

For every journal entry, `current_hash` was recomputed in SQL (pgcrypto,
`digest(..., 'sha256')`) under a matrix of payload format variants reconstructed
from git history of the hash-construction code (`legalJournal.ts` →
`legalJournal/journalAppend.ts`, plus the DB trigger of migration
`2026_05_21_18_45_00`):

- Timestamp rendering: ISO-8601 milliseconds with `Z`, rendered from the stored
  instant either **as UTC** or **as Europe/Paris wall clock** (the latter reproduces
  strings hashed before the TIMESTAMPTZ migration of 2026-02-25, which reinterpreted
  previously naive timestamps as Paris local time).
- Amount rendering: **2 decimals** (`116.50`), **raw JS float repr** (`116.5`),
  or **4 decimals** (`116.5000`, the current `toFixed(4)`/`numeric::text` format).

Chain linkage (`previous_hash` = predecessor's `current_hash`) and sequence
continuity were verified independently.

## 3. Results — every entry is explained

### 3.1 Chain and sequence

- **Zero sequence gaps** (1 → 21 284 contiguous).
- **One chain-link discontinuity**, at sequence 609 — a deliberate, self-documented
  chain restart (see § 3.3), not a silent break.

### 3.2 Format eras (21 279 of 21 284 entries = 99.98 % verify deterministically)

| Era | Sequences | Dates (UTC) | Format that verifies | Entries | Corresponding code/deploy event |
|-----|-----------|-------------|----------------------|---------|--------------------------------|
| A — development | 1 – 607 | 2025-07-17 → 2025-07-29 | UTC timestamp + 2-dec amounts | 604 (3 exceptions § 3.3) | Initial system (commit `61a1ee2`), data later migrated into production |
| B — production v1 | 610 – 14 582 | 2025-07-30 → 2026-03-21 | Paris-wall-clock timestamp + 2-dec amounts | 13 973 | Server first cloned 2025-07-30 08:21 UTC (server reflog); naive-timestamp storage era |
| C — post-TIMESTAMPTZ | 14 590 – 19 362 | 2026-03-23 → 2026-06-17 | UTC timestamp + raw float amounts | 4 773 | Deploys of 2026-03-23 16:01/20:05 UTC (reflog) shipped migration `2026_02_25` (TIMESTAMPTZ) |
| D — current, DB-enforced | 19 363 – 21 284+ | 2026-06-18 13:10 → ongoing | UTC timestamp + 4-dec amounts (`toFixed(4)`) | 1 924+ | Deploys of 2026-06-18 12:49-16:29 UTC shipped fix `5b5108a` + DB trigger `58f0200`; trigger now validates every INSERT |
| March 2026 transition | 14 583 – 14 589 | 2026-03-21 → 2026-03-23 | Era-B format (last pre-deploy entries) | 7 | Between the two March deploy pulls |

Era boundaries align to the hour with production deployment timestamps recovered
from the server's git reflog (`raw/2026-07-16-production-deploy-reflog.txt`).
Since 2026-06-18, hash validity is additionally enforced at INSERT time by the
database trigger, making format drift impossible going forward.

### 3.3 The five non-conforming entries — all self-documented markers

| Seq | Date | What it is (from its own `transaction_data`) |
|-----|------|----------------------------------------------|
| 128 | 2025-07-17 | **Recovery order**: 116.50 € card sale manually re-entered on 2025-07-18 after a database issue on 2025-07-17 ("recovery_order": true, "manual_compensation": true). Inserted out of chronological order; full item detail and amounts preserved in the entry. |
| 129 | 2025-07-18 | **CORRECTION entry documenting seq 128**: `correction_type: HASH_CHAIN_INTEGRITY`, `affected_entries: [128]`, business impact "NONE — all transaction data preserved". |
| 130 | 2025-07-18 | Duplicate of the seq-129 correction record (same content, written 9 s later). |
| 608 | 2025-07-30 | **CORRECTION marker for the dev→production migration**: `correction_type: DATABASE_MIGRATION`, `affected_sequences: 1-607`, literal marker string `MIGRATION_DOCUMENTED_CHAIN_VALID` in place of a SHA-256. |
| 609 | 2025-07-30 | **ARCHIVE checkpoint restarting the chain**: `archive_type: MIGRATION_CHECKPOINT`, `previous_hash` = 64 zeros (genesis), literal marker `CHECKPOINT_MIGRATION_BASELINE`. Production chain begins here; sequence numbering was *not* reset (continues at 610), satisfying the counter-continuity requirement (BOI-TVA-DECLA-30-10-30). |

These five entries are the July 2025 operators' in-band documentation of two
incidents (one recovered sale; one database migration), written as CORRECTION/
ARCHIVE journal entries — the mechanism the ISCA framework prescribes for
corrections (never deletion or rewriting).

## 4. Conclusions

1. **No evidence of data alteration anywhere in the journal.** Every hash failure
   reported by the current verifier is deterministically reproduced by applying
   the payload format of a *later* software version to entries written under an
   *earlier* one.
2. The journal demonstrates the required properties: append-only behavior,
   continuous sequence, documented corrections, and (since 2026-06-18)
   database-level enforcement at insert time.
3. The migration of 2025-07-30 (development data, sequences 1-607, ~13 days of
   early operation) is bounded, marked at both ends (608/609), and preserved
   unmodified — its Era-A hashes still verify under the development-era format.
4. Residual risk: entries of eras A-C are protected by era-consistent hashes but
   the *live verifier* only recomputes the current format. **Mitigated 2026-07-16:**
   `JournalSigning.verifyJournalIntegrity` is now era-aware (tries all historical
   payload formats) and treats self-documented CORRECTION/ARCHIVE/recovery markers
   as `documentedExceptions` rather than integrity errors. API responses expose
   `documented_exceptions` on `/api/legal/journal/verify` and compliance status.

## 5. Follow-ups (tracked in the roadmap, Phase 1 steps 4-5)

- Closure-bulletin anomaly analysis (zero-amount closures, same-day duplicates,
  backfilled 2025-12-01 closure, no-bulletin days).
- Reconciliation of journal totals vs closure bulletins vs VAT declarations for
  sample months including July 2025 (migrated era) — requires accountant input.
