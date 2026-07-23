# Anomaly Register — Legal Journal & Closures

**Last updated:** 2026-07-23  
**Purpose:** One-line index from any known production anomaly to its explanation
and evidence. Used by the self-certification dossier and by operators answering
inspector questions.

Status legend: **Closed** = explained and filed; **Open** = needs accountant or
product follow-up; **Watch** = monitoring only.

---

## A. Legal journal

| ID | What | When | Root cause | Evidence | Status |
|----|------|------|------------|----------|--------|
| J-ERA | Mass “hash failed” under current verifier for entries before 2026-06-18 | 2025-07 → 2026-06 | Hash payload format evolved (4 eras); data intact under era-correct format | `phase1-forensics/2026-07-16-HASH-FORMAT-ERAS.md` | Closed — verifier now era-aware |
| J-128 | Recovery SALE 116.50 € out of chronological order | 2025-07-17/18 | Manual re-entry after DB incident; CORRECTION 129–130 document it | eras report § 3.3; raw seq128 output | Closed |
| J-608/609 | Chain link break + literal marker hashes | 2025-07-30 | Documented dev→production migration + checkpoint restart | `INCIDENT-2025-07-DEV-TO-PROD-MIGRATION.md` | Closed |

## B. Closure bulletins

| ID | What | When | Root cause | Evidence | Status |
|----|------|------|------------|----------|--------|
| C-ZERO | 38 zero-amount DAILY bulletins | mainly 2025-08 Mondays + closed days | Empty-day closes + scheduler re-fire every 5 min on some Mondays | `phase1-forensics/2026-07-16-CLOSURE-ANOMALIES.md` § 2.1 | Closed |
| C-DUP | 23 Paris days with >1 DAILY bulletin | 2025-07 → 2026-04 | Empty bursts (§ C-ZERO) or early partial close + later full close | same § 2.2 | Closed |
| C-BACKFILL | Dec 1 2025 closed 2026-01-02 (~32 days late) | 2026-01-02 | Manual catch-up of missed daily close | same § 2.3 | Closed |
| C-0TX | 9 bulletins with 0 tx but non-zero amount | 2025-07 → 2026-03 | Historical early-close bug; superseded same day by correct bulletin | same § 2.4 | Closed |
| C-GAP | 22 days with journal SALE but no positive DAILY bulletin | 2025-08 → 2026-07 | Auto-closure coverage gaps; sales still in journal | same § 2.5 | Watch — historical; **forward mitigation in 2.0.3** (scheduler gap backfill). Optional historical backfill if accountant asks (IRL-8) |
| C-RECON | 25 DAILY with `reconciliation_ok = false` | mostly ≥ 2026-06-18 | Sub-cent VAT rounding drift | same § 2.6 | Closed for new closures — **€0.01 VAT tolerance in 2.0.3**; historical rows unchanged |

## C. Reconciliation (accountant)

| ID | What | Status |
|----|------|--------|
| R-AUG25 | Cleaned DAILY totals vs VAT return August 2025 | Open — needs accountant figures |
| R-DEC25 | Cleaned DAILY totals vs VAT return December 2025 (incl. backfilled Dec 1) | Open — needs accountant figures |

---

## How to use during a control

1. If the inspector points at a “tampered” / integrity warning → open **J-ERA** /
   **J-128** / **J-608/609** as applicable; show era report + incident file;
   run `GET /api/legal/journal/verify` (should return `VALID` with
   `documented_exceptions`).
2. If they point at duplicate or zero closures → **C-ZERO** / **C-DUP**; explain
   append-only retention of attempts; show cleaned accounting report rule.
3. If they ask “where is the Z for day X?” and X is in **C-GAP** → show journal
   SALE lines for that Paris day; explain operational gap, not missing sales.
