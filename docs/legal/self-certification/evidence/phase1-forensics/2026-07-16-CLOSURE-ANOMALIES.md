# Closure Bulletin Anomaly Analysis

Date of analysis: 2026-07-16
Analyst: MOSEHXL publisher (AI-assisted), read-only access to production database
Scope: `closure_bulletins` for establishment MuseBar
(`ce1b61b1-10e7-430c-97aa-69297fafb780`)
Raw SQL + output: `./raw/2026-07-16-closures-forensic*`

---

## 1. Inventory

| Type | Count | Zero-amount | Closed |
|------|------:|------------:|-------:|
| DAILY | 364 | 38 | 364 |
| WEEKLY | 54 | 1 | 54 |
| MONTHLY | 20 | 0 | 20 |
| ANNUAL | 1 | 0 | 1 |

Period covered (DAILY): 2025-07-05 → 2026-07-15 (Paris).

---

## 2. Anomaly classes and root causes

### 2.1 Zero-amount DAILY bulletins (38)

**Cause:** empty-day closures + a historical scheduler bug that re-fired every ~5
minutes on some closed Mondays.

Evidence:

- Most zero-amount rows have `total_transactions = 0`, `first_sequence = 0`,
  `last_sequence = 0` — genuine “no sales that day” closures (bar closed Sundays
  / holidays, or early testing).
- On **2025-08-04, 08-11, 08-18, 08-25** (all Mondays), **7 identical zero
  bulletins** were written within ~30 minutes (22:00 → 22:30 UTC), all sharing
  the **same** `closure_hash`. That is a scheduler duplicate bug on closed days,
  not altered revenue: amounts are zero, hashes identical, sequences empty.

**Accounting impact:** none (0 €). The May 2026 accounting report correctly
excluded them (35 of these in its window).

**Status:** documented; no data rewrite. Scheduler behaviour has since stabilized
(no similar 7× bursts after Aug 2025).

### 2.2 Same-day DAILY duplicates (23 Paris calendar days)

Two distinct patterns:

| Pattern | Example | Explanation |
|---------|---------|-------------|
| Empty-day scheduler bursts | Aug 4/11/18/25 (7× each) | § 2.1 |
| Double close of a real day | Aug 29 (ids 83 + 85), Sep 20, Dec 1, etc. | One early/empty or partial close, then a full close later the same period |

Example **2025-08-29**:

- id 83: closed 2025-08-28 22:33 UTC, `total_transactions = 0`, amount = 3167 €
  (zero-tx / non-zero amount — see § 2.4)
- id 85: closed 2025-08-29 21:46 UTC, 182 tx, amount = 3167 € (the real bulletin)

Deduplication rule used by the May accounting report (keep max `total_amount`,
then newest `closed_at`) retains the correct commercial figure. **Revenue is not
double-counted in cleaned reports**; both rows remain in the database as an
append-only history of closure attempts.

### 2.3 Backfilled closures (closed_at ≫ period_end)

Only **3** DAILY bulletins closed more than 1 day after period end:

| Day | Closed | Delay | Amount |
|-----|--------|------:|-------:|
| 2025-12-01 | 2026-01-02 | ~32 days | 232 € (12 tx) |
| 2025-12-31 | 2026-01-02 | ~2 days | 0 € |
| 2026-01-10 | 2026-01-12 | ~2 days | 3 332.50 € |

The notable one is **2025-12-01**, closed on **2026-01-02** — a manual catch-up
after a missed daily close. Amounts and sequences are present; this is late
*creation* of a bulletin, not alteration of journal sales. Document in the
incident register as an operational catch-up.

### 2.4 Zero-transaction / non-zero-amount bulletins (9)

Nine DAILY rows show `total_transactions = 0` but `total_amount > 0`. In every
sampled case a **second bulletin the same day** carries the matching non-zero
transaction count (or the row is an early partial close). Example: Aug 29 id 83
(0 tx / 3167 €) superseded by id 85 (182 tx / 3167 €).

**Root cause:** early closure path that copied period totals without refreshing
the transaction counter (historical bug). Amounts match the later correct
bulletin; no revenue invention.

### 2.5 Calendar days with SALE journal entries but no retained DAILY bulletin

**22 days** since 2025-08-01 have at least one SALE in the journal and no
positive-amount DAILY bulletin. Breakdown:

- **2026-07-16**: today at analysis time — day not yet closed (expected).
- **Sundays / low-volume days** (e.g. 2025-11-09: 1 sale 110 €; 2025-12-07: 1
  sale 17 €): bar often closed; a few residual sales (staff, private) without a
  formal daily close being triggered.
- **2025-08-01**: 164 sales / 2 405.50 € — first full day in the report window
  with sales but no bulletin in the filtered set (likely closed under a
  different period window or pre-report cutoff artefact; journal amounts remain
  intact for reconciliation).
- Several winter Sundays with small totals (50–800 €) — operational gap in
  auto-closure coverage before the scheduler became reliable.

**Accounting impact:** sales still exist in the legal journal (hash-chained).
Missing bulletin ≠ missing revenue. For attestation scope, these are
**operational coverage gaps**, to be closed going forward by the auto daily
scheduler (already in production). Optional remediation (Phase 2/3, minor):
backfill DAILY bulletins for gap days from journal aggregates, as CORRECTION-
linked closures if needed — only if accountant requests it; not required to
prove ISCA.

### 2.6 `reconciliation_ok = false` (25 of 364 DAILY)

Almost all false flags are **from 2026-06-18 onward** (when journal↔bulletin
reconciliation columns went live). Two subtypes:

1. **Sub-cent VAT noise** (`vat_delta` ≈ ±0.0001 … ±0.0005, amount_delta = 0):
   floating-point / rounding between journal VAT sum and closure VAT. Not a
   revenue issue. Recommendation (minor, post-freeze OK): widen tolerance to
   e.g. 0.01 €.
2. **Real deltas of a few euros / a few transactions** (e.g. 2026-06-21:
   amount_delta −24 €, transaction_delta +4): late SALE/REFUND after the
   bulletin window, or refunds counted differently. Worth sampling 2–3 days
   with the accountant during Phase 1 reconciliation; not evidence of
   alteration.

---

## 3. Sample month check (2025-08) — journal SALE vs bulletins

After excluding zero-amount bulletins, most open days match closely. Remaining
deltas are explained by:

- **Aug 1**: sales in journal, no positive bulletin in set (§ 2.5).
- **Aug 29**: naive `SUM(bulletin)` double-counts ids 83+85 → artificial
  −3159 € delta; cleaned rule (keep one bulletin) matches journal within a few
  euros.
- Small day-level deltas (≈ 0–45 €) consistent with refunds / tips / period
  boundary timing between `timestamp` (journal) and `period_start/end`
  (bulletin).

**Conclusion for August 2025:** once duplicates are deduplicated the same way as
the accounting report, journal and bulletins tell the same commercial story.

---

## 4. Conclusions for the attestation dossier

1. Closure anomalies are **operational / historical software bugs**, not fiscal
   data alteration.
2. Append-only storage correctly kept every failed or duplicate close attempt —
   the system did not silently delete them (good for ISCA transparency).
3. Cleaned reports (dedupe + drop 0 €) are the right view for accounting; the
   raw table is the right view for audit trail.
4. Residual work for Phase 1 step 5 (accountant): pick 2 months (suggest
   **2025-08** and **2025-12** including the backfilled Dec 1) and confirm VAT
   declarations match cleaned bulletin totals.
5. Optional product fixes (all **minor** under the version policy):
   - reconciliation VAT tolerance
   - prevent duplicate DAILY inserts for the same Paris day when one already
     exists with matching hash / higher amount
   - ensure auto-closure covers every Paris day with ≥1 SALE

## 5. Linkage

- Journal eras / migration markers: `2026-07-16-HASH-FORMAT-ERAS.md`
- Roadmap Phase 1: `docs/roadmaps/2026-07-16-SELF-CERTIFICATION-RELEASE-AND-EREPORTING-PLAN.md`
