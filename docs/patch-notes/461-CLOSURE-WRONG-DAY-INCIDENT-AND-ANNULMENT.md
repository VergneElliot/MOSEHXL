# 461 — Closure incident of 15/08/2026: wrong-day bulletins, blocked force, and the annulment path

## Summary

On the night of 14→15/08/2026 the operator tried to close the business day that had
just ended and instead produced two empty bulletins covering periods that had not
happened yet. Every subsequent attempt to close correctly was refused, and the
backend then entered a crash loop that lasted the whole of the next service.

Four independent defects combined. All four are fixed here, plus a legal path to
correct bulletins issued in error.

## Timeline (Europe/Paris)

| Time | Event |
| --- | --- |
| 14/08 00:51 | Bulletin **609** closes the 13/08 business day (13/08 02:00 → 14/08 02:00), 49 sales, €1170. Correct. |
| 14/08 18:34 → 15/08 03:25 | Service. **105 sales, €1869.** |
| 15/08 02:11 | Operator selects "Clôturer maintenant". Bulletin **610** is created for 15/08 02:00 → 16/08 02:00: **0 sales, €0.** |
| 15/08 02:12 | Operator changes the cut time to 04:00 in settings (which also flips auto-closure on). |
| 15/08 02:30 | Second attempt. Bulletin **611** is created for 16/08 02:00 → 16/08 04:00: **0 sales, €0.** A period entirely in the future. |
| 15/08 onwards | Every further attempt refused, including with "Forcer la création". Backend crash-loops every ~5 minutes (242 restarts). |

Net result: the 14/08 business day (€1869) was covered by no bulletin at all, while
the in-progress 15/08 business day was blanketed by an empty closed bulletin.

## Root causes

### 1. The daily mode was dropped between the dialog and the API (the €0 bulletin)

`ClosureContainer` forwarded the create payload field by field and omitted `mode`:

```tsx
onCreate={async ({ date, type, force, fond_de_caisse, email_recipients }) =>
  api.createClosure({ date, type, force, fond_de_caisse, email_recipients })
}
```

`mode` never reached the backend, which fell back to `business_day` with
`date = selectedDate`. `selectedDate` defaults to the calendar date. At 02:11 with a
02:00 cut, the calendar date (15/08) is the business day that has just *started*,
not the one that just ended — so the resolved window was entirely in the future and
contained nothing.

"Clôturer maintenant" had therefore never worked from this screen; it silently ran
"clôturer la journée commerciale d'aujourd'hui" every time.

**Fix:** forward the payload whole. This alone would have produced the correct
€1869 bulletin at 02:11.

### 2. `force` was consulted after the period had already been rejected

`resolveDailyClosurePeriod` threw *"Cette journée commerciale est déjà couverte par
une clôture précédente"* before `createDailyClosure` ever looked at `force`. Once
bulletin 611 existed with a `period_end` in the future, every past day was "already
covered" and the checkbox could not rescue anything.

**Fix:** `force` is passed into the resolver and skips both the continuity clamp and
the already-covered rejection.

### 3. Nothing prevented a closure over a future or empty period

**Fix:** two guards, plus a preview so the operator sees the outcome first.

- A `business_day` window whose start is in the future is always refused, even with
  `force`. This is the exact shape of the mistake.
- A daily bulletin with zero transactions is refused unless `force` is set, with a
  message explaining the cut-time/date relationship.
- New `GET /api/legal/closure/daily-preview` resolves the window server-side without
  writing. The create dialog now shows *"Du 14/08 04:00 au 15/08 04:00 — 105 ventes,
  1 869,00 €"* before anything is committed, and blocks the button when the period is
  invalid or empty.

### 4. The crash loop: an audit write killed the process

`audit_trail.ip_address` is an `inet` column. `ClosureScheduler` logged failures with
`ip_address: 'system'`, which Postgres rejects. The sequence each tick:

1. Scheduler tries to backfill the missing 14/08 closure.
2. Period resolution throws because of defect 2.
3. The `catch` calls `AuditTrailModel.logAction({ ip_address: 'system' })`.
4. That rejects too — from a `catch` block, with no handler above it.
5. Unhandled rejection → **process exits** → pm2 restarts → repeat in 5 minutes.

Auto-closure had been off until the operator saved the 04:00 setting, which is why
the crash loop started that night and not earlier.

**Fix, in depth:**

- Invalid IP values are coerced to `NULL` instead of failing the insert.
- `AuditTrailModel.logActionBestEffort` never rejects; the scheduler uses it.
- `process.on('unhandledRejection')` logs and keeps serving. A background job must
  never be able to take the POS down mid-service.

Also fixed while in the trigger: `prevent_closed_bulletin_modification` returned
`NEW` on `DELETE`, which is `NULL` in a `BEFORE DELETE` trigger and therefore
silently cancelled deletion of *open* bulletins — breaking the rollback path used
when a journal append fails.

## Correcting a bulletin issued in error

### Legal position

Under art. 286-I-3° bis CGI and the NF525 requirements (inaltérabilité, sécurisation,
conservation, archivage), recorded fiscal data may not be modified or deleted. An
erroneous closure bulletin therefore **cannot be edited or removed**.

The accepted mechanism is the same as for an incorrect invoice: the erroneous
document is retained in full, flagged, and replaced by a corrective document, with
traceability of who did it, when, and why. The code already described this intent —
*"created as corrective replacement (previous bulletins kept for audit trail)"* — but
had no way to mark the superseded bulletin.

### Implementation

Migration `2026_08_15_20_00_00_closure_bulletin_annulment.sql` adds `voided_at`,
`voided_by`, `void_reason` and `superseded_by_bulletin_id`, and rewrites the
inalterability trigger so that on a closed bulletin:

| Operation | Result |
| --- | --- |
| Change any fiscal field | Rejected |
| Delete | Rejected |
| Write the annulment stamp | Allowed, once |
| Link the corrective bulletin afterwards | Allowed, once |
| Clear or re-date an annulment | Rejected |
| Change a fiscal field alongside an annulment | Rejected |

Totals, hashes and sequences are never touched. Annulled bulletins stay in the
archive and in every export; they are excluded only from *continuity* logic
(`getLastClosedDailyPeriodEnd`, `closureBulletinExists`,
`findClosedDailyBulletinsForBusinessDay`) so they no longer block correct closures.

`POST /api/legal/closure/bulletins/:id/void` requires a reason of at least 10
characters, appends a journal entry, and returns the annulled bulletin. In the UI,
annulled bulletins render struck-through with an "Annulé" chip and their reason.

## Production repair applied

1. Auto-closure disabled immediately to stop the crash loop (no deploy required).
2. Bulletins 610 and 611 annulled, reason recorded, both retained.
3. Corrective bulletin created for the 14/08 business day: 04:00 → 15/08 04:00,
   105 sales, **€1869**.
4. The 15/08 business day (04:00 → 16/08 04:00) closed normally at end of service.

### Note on the cut-time change

Moving the cut from 02:00 to 04:00 leaves 14/08 02:00 → 04:00 outside any bulletin.
That window contains **zero sales**, so no revenue is unreported; the discontinuity is
purely an artefact of the settings change and is documented here.

## Follow-up found while validating the annual bulletin

Preparing the first annual bulletin surfaced two further defects in the weekly,
monthly and annual periods. They share a cause: those periods were built with
`new Date(...)` and `setHours`, which resolve in the **server's** timezone (UTC in
production), and they ignored the business-day cut entirely.

1. **Two-hour shift.** `setHours(0,0,0,0)` produced midnight UTC = 02:00 Paris, so
   every weekly/monthly/annual period was offset by two hours and could split a
   night in half.
2. **Annual covered 366 days.** The rolling year ran from `date − 1 year` at 00:00
   through `date` at 23:59:59.999 — inclusive at both ends, so the selected day was
   counted as an extra day. Selecting 01/08/2026 returned 21 308 sales / €531 967,50
   instead of the 21 253 / €530 744,50 that one actual year contains.

Both are fixed by a shared `getBusinessPeriodBounds(startDay, endExclusiveDay, cut,
tz)` helper: bounds are computed in the establishment timezone and land on the cut
time, and the selected date is treated as the first day *outside* the period.

| Closure | Selected | Period now |
| --- | --- | --- |
| Annual | 01/08/2026 | 01/08/2025 04:00 → 01/08/2026 03:59:59.999 |
| Monthly | any day of 08/2026 | 01/08/2026 04:00 → 01/09/2026 03:59:59.999 |
| Weekly | any day of the week | Monday 04:00 → next Monday 03:59:59.999 |

Covered by tests, including one asserting the cut time holds across the October DST
change.

Note that annual bulletin **#215** (calendar 2025, created 08/01/2026) predates this
fix and used the old boundaries. It is left untouched.

## Follow-ups

- Auto-closure is left **disabled**. It should only be re-enabled after the scheduler
  is re-tested against the new guards, since it was the trigger for the crash loop.
- Consider defaulting the `business_day` date to the last business day with unclosed
  sales rather than the calendar date.
