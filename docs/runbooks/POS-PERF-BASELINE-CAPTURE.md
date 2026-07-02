# POS Performance Baseline — On-Site Capture Runbook

Date: 2026-07-02  
Related report: `docs/reports/2026-06-24-pos-perf-baseline.md`  
Automated script: `scripts/pos-perf-baseline.sh`

---

## Purpose

CI Lighthouse only measures the **public login shell**. Real POS lag must be captured on
the **device staff actually use** (bar tablet, DISH terminal browser, etc.) after login.

Use this runbook once per reference device. Update the baseline report tables when done.

---

## Prerequisites

- Chrome (or Chromium) on the POS device, or remote debugging from a laptop
- MuseBar production URL: `https://mosehxl.com`
- Staff test account (not during service rush)
- Same Wi‑Fi the venue uses during service

---

## A) Device record

Fill in the baseline report §4:

| Field | Example |
|-------|---------|
| Device | Samsung Galaxy Tab A / DISH Android terminal |
| RAM | 3 GB |
| Browser | Chrome 125 |
| Network | Venue Wi‑Fi, same AP as printers |
| Date / time | 2026-07-02 22:00 Paris |

---

## B) Network RTT (venue)

On the device browser or Termux:

```bash
# If curl available on device:
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s total: %{time_total}s\n" https://mosehxl.com/
```

Or use Chrome DevTools → Network → reload → note **Waiting (TTFB)** on the document and
a typical API call (e.g. `GET /api/products`).

**Target reference:** TTFB < 200 ms on venue Wi‑Fi is comfortable; > 500 ms suggests
network or hosting region issues.

---

## C) Lighthouse (authenticated — manual)

Lighthouse cannot log in automatically. Approximate approach:

1. Log in to MuseBar on the device.
2. Open the **Caisse** tab; wait for products to load.
3. On a **desktop Chrome** with the same account (or USB remote debug to the tablet):
   - DevTools → Lighthouse → Performance
   - Use **Simulated throttling: Mid-tier mobile** if testing a weak tablet
   - Record FCP, LCP, TBT, TTI

Alternatively, use Chrome **Performance** panel (see §D) — often more useful for POS taps.

---

## D) Performance trace — hot path (recommended)

1. Log in → **Caisse** tab loaded.
2. DevTools → **Performance** → Record.
3. Perform exactly:
   - Tap product A (add to cart)
   - Tap product B
   - Open payment → complete sale (test product / €0.01 if needed)
4. Stop recording.

Note:

| Metric | Where to look |
|--------|----------------|
| Long tasks > 50 ms | Main thread flame chart (red triangles) |
| Layout / recalc style spikes | Purple/green blocks after each tap |
| Network wait on pay | Network row during `POST /api/orders` |

**Subjective:** did the UI feel instant, acceptable, or laggy on each tap? (record in report)

---

## E) React Profiler (optional)

If running a **development** build with React DevTools:

1. Profiler → record → add 5 items → stop.
2. Note which components re-rendered on each cart change (expect cart + possibly whole POS tree).

Production build: skip Profiler; use Performance trace instead.

---

## F) Warm vs cold start

Measure both:

| Scenario | Steps |
|----------|--------|
| **Cold** | Force-close browser → reopen → login → time until Caisse interactive |
| **Warm** | Switch away 5 min → return → time until next tap responds |

Record wall-clock seconds in the baseline report.

---

## G) When to re-run

- New major frontend release
- New POS hardware (DISH terminal, Pi, tablet swap)
- Venue network change (new router, ISP)
- Before/after Phase 6 optimization work

---

## H) Escalation criteria

Escalate to Phase 6 implementation if on-site capture shows:

- Perceived tap lag on warm Caisse, or
- TBT > 300 ms (Lighthouse mobile) on Caisse after login, or
- `POST /api/orders` round-trip > 1 s excluding user think time
