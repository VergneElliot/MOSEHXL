# MOSEHXL — Cleanup & Performance Roadmap

**Date:** 2026-06-24
**Branch baseline:** `development` (HEAD `274b265`)
**Author:** Engineering (full-repo clean-up pass)
**Scope:** (1) close the defects found in the 2026-06-24 code review, (2) define the performance/"lag" strategy, (3) sequence everything into an executable, low-risk plan.

> This document is the execution plan that follows the 2026-06-24 review. For the
> historical hard-truth audits see `docs/audits/`. For live status see
> `docs/CURRENT-TRUTH.md` and `DEVELOPMENT-STATE.md`.

---

## 0. Executive summary

The codebase is architecturally strong and fiscally aligned (CGI Art. 286-I-3 bis / ISCA pillars implemented). The remaining work splits into two tracks:

- **Track A — Cleanup / professional-grade hardening.** Small, mechanical, high-confidence fixes: a red test suite, a few dead symbols, an orphaned bridge package, one true monolith (`authLogin.ts`), and aging frontend tooling.
- **Track B — Performance.** The perceived POS "lag" on low-RAM devices is almost certainly a **frontend** problem (bundle weight, re-renders, MUI, network RTT), not a backend-language problem. The plan is **measure first, quick wins second, framework migration third** — with **SvelteKit** as the target framework if a migration is confirmed necessary.

**Guiding principles:**

1. **Always work from a green baseline.** Phase 1 restores green CI before any refactor.
2. **Measure before rewriting.** No framework/language change without a profiled, documented bottleneck.
3. **Never put the fiscal core at risk for performance.** The legal journal, hash chain, closures, and audit trail are certified-grade; they change last and most carefully.
4. **One change class per PR.** Test fixes, dead-code removal, bridge work, and refactors land separately so each is reviewable and revertible.

---

## 1. Problem inventory (from the 2026-06-24 review)

| ID | Problem | Evidence | Severity |
|----|---------|----------|----------|
| **C1** | Backend test suite is RED — CI on `development` is failing | `src/routes/legal/invoices.routes.test.ts`: 3 failing tests (expect 201/200, get 400). Invoice route correctly hardened to require seller legal identity (SIRET/address/tax id) + invoice legal fields; mocks never updated. | **P0** |
| **C2** | Dead code and lint warnings from the June cleanup pass | `routes/printing.ts` (`ALLOWED_PRINT_PROVIDERS`, `parseConfigCell`, unused `PrintingConfig` import), `services/printing/epsonJobStore.ts` (`queues`), `migrations/migration-manager.ts` (`byId`), plus test-only unused imports/parameters | **P1** |
| **C3** | Print bridge is orphaned from all quality gates | `MuseBar/bridge/` is plain JS, not in root `workspaces`, not referenced in `.github/workflows/ci-cd.yml`; never type-checked/linted/tested in CI | **P1** |
| **C4** | `authLogin.ts` monolith (1412 LOC) | Bundles login, refresh, logout, lockout, TOTP/2FA, sessions, CSRF, support-impersonation in one file | **P2** |
| **C5** | `printing.ts` large (737 LOC) | Mixed transport + provider logic + dead symbols (overlaps C2) | **P2** |
| **C6** | Aging frontend toolchain | CRA `react-scripts` 5.0.1 (unmaintained), TypeScript `4.9.5` | **P2 → Track B** |
| **P1‑perf** | Perceived POS lag on low-RAM devices | Reported by operator; no baseline metrics captured yet | **P1 (Track B)** |
| **G1** | NF‑525 self-certification: code essentially present, but procedural items + green evidence corpus outstanding | 2026-05-20 audit closure pass; this roadmap's Phase 1 restores the green corpus | **Procedural** |

> Confirmed healthy (do NOT re-open): backend `type-check` ✅, backend `lint` ✅ (0 errors), frontend `type-check` ✅, git clean, secrets gitignored, 39 migrations with fiscal triggers (UPDATE/DELETE/TRUNCATE/INSERT) + `printing_jobs` queue present, console usage clean.

---

## 2. Track A — Cleanup roadmap

### Phase 1 — Restore the green baseline (P0) — effort: S (≤1 day)

**Status:** Done on 2026-06-25. See `docs/patch-notes/413-CLEANUP-PHASE1-GREEN-BASELINE-IMPLEMENTATION.md`.

**Goal:** every quality gate green on `development`, so cert evidence is clean and refactors start from a known-good state.

1. **Fix the 3 invoice route tests** (`invoices.routes.test.ts`):
   - Update the `buildReceiptDataForOrder` mock so `business_info` includes the now-required seller identity fields (`business_address`, `business_siret`, `business_tax_identification`) and any seller legal-form fields the route asserts.
   - Ensure the request bodies include the required `legal` fields (`payment_due_date`, `payment_terms`, `late_penalty_terms`, `recovery_fee_note`).
   - Do **not** weaken the route. The production enforcement is correct (it protects invoice compliance) — only the test fixtures are stale.
2. **Full local gate run** (both workspaces): `type-check`, `lint`, `test`, `build`.
3. **Confirm CI is green** on push.

**Acceptance:** `vitest run` = 0 failures; CI pipeline green; no production code behavior change.

---

### Phase 2 — Dead-code removal (P1) — effort: S

**Status:** Done on 2026-06-25. See `docs/patch-notes/414-CLEANUP-PHASE2-DEAD-CODE-LINT-CLEANUP-IMPLEMENTATION.md`.

**Goal:** zero lint warnings; remove June-refactor leftovers.

1. `routes/printing.ts`: remove `ALLOWED_PRINT_PROVIDERS`, `parseConfigCell`, unused `PrintingConfig` import (verify truly unreferenced first).
2. `services/printing/epsonJobStore.ts`: remove unused `queues`.
3. `migrations/migration-manager.ts`: remove unused `byId`.
4. Test-only cleanup: remove unused imports/parameters in printing socket and base printing service tests.
5. Re-run `lint` → expect 0 warnings.

**Acceptance:** `npm run lint` (backend) = 0 errors, 0 warnings; `type-check` still green; tests still green.

---

### Phase 3 — Bring the bridge into standards (P1) — effort: M

**Goal:** the bridge stops being an untested, untyped orphan. Two viable strategies — pick one:

- **Strategy 3A (recommended now): TypeScript in the monorepo.**
  1. Add `MuseBar/bridge` to root `workspaces` (or a dedicated `packages/bridge`).
  2. Add `tsconfig.json`; convert `src/*.js` → `*.ts` (the files are tiny: `index`, `config`, `cloudClient`, `printers/networkEscpos`).
  3. Port the existing `node --test` tests to the project test runner; keep `config` + `networkEscpos` coverage.
  4. Add a `bridge` job (or extend an existing one) in `.github/workflows/ci-cd.yml`: `type-check`, `lint`, `test`.
  - *Pros:* fast, consistent with the whole codebase, immediate quality-gate coverage. *Cons:* still needs Node on the venue device.

- **Strategy 3B (later / deployment track): Go single-binary appliance.**
  - Rewrite the bridge as a Go static binary (no Node runtime on the venue device). Best fit for the "easy install everywhere" goal and a productive use of in-house Go skills. Track this under **Phase 9 (deployment ergonomics)** rather than blocking quality-gate coverage now.

**Decision:** do **3A now** (closes the quality-gate gap cheaply), schedule **3B** under Phase 9 if/when packaging ergonomics become the priority.

**Acceptance:** bridge type-checks, lints, and tests run in CI; no functional change to the poll/print/ack loop.

---

### Phase 4 — Modularize remaining large files (P2) — effort: M

**Goal:** eliminate the last monolith; no file mixing too many concerns.

1. **Split `routes/authLogin.ts` (1412 LOC)** into a cohesive `routes/auth/` module, e.g.:
   - `login.ts` (login + lockout), `refresh.ts` (rotation/sessions/CSRF), `logout.ts`, `totp.ts` (2FA lifecycle + step-up), `impersonation.ts` (support impersonation), shared `helpers.ts` (cookie/expiry/lockout math).
   - Keep an `index.ts` that assembles the router so mount points and tests are stable.
   - **No behavior change.** This is a pure structural extraction; the existing auth test suite is the safety net (run it before/after).
2. **`printing.ts` (737 LOC):** after C2 dead-code removal, separate transport (route handlers) from provider/config resolution where it reduces size without churn.

**Acceptance:** auth + printing test suites pass unchanged; largest backend route file well under ~500 LOC; mount points identical.

---

## 3. Track B — Performance roadmap (the "lag" problem)

> **Core thesis:** for a POS doing a few thousand orders/day, the backend language is **not** the bottleneck. The lag lives in the browser on weak hardware and in network round-trips. Fix those first; only migrate the framework if measurements still demand it.

### Phase 5 — Establish a performance baseline (P1) — effort: S

**Goal:** stop guessing. Capture real numbers on the actual POS device before changing anything.

1. **Lighthouse** on the POS route (you already have `.lighthouserc.json` + a CI job) — record FCP, TBT, TTI, bundle size.
2. **Chrome DevTools Performance** trace of the hot path: open POS → add items → pay. Identify long tasks / layout thrash.
3. **React Profiler**: find components re-rendering on every cart change.
4. **Bundle analysis** (`source-map-explorer` or `vite-bundle-visualizer` post-migration): quantify MUI and other heavy deps.
5. **Network**: measure RTT from the venue to the cloud server (a far region adds latency to every tap).

**Deliverable:** a short `docs/reports/2026-06-24-pos-perf-baseline.md` with the numbers. **This is the success yardstick for every later phase.**

---

### Phase 6 — Quick wins on the current React app (P1) — effort: M, low risk

Often enough to resolve the lag without a rewrite.

1. **Route-level code splitting + lazy loading** of non-POS screens (Admin, Legal, Setup, History) so the POS boots with a minimal bundle.
2. **Virtualize long lists**: product grid and order history (`react-window`/`react-virtuoso`).
3. **Kill re-renders**: memoize hot components, stabilize callbacks, split contexts so a cart update doesn't re-render the whole screen.
4. **Trim MUI on the hot path**: ensure tree-shaking/path imports; replace the heaviest components on the POS view if cheap.
5. **Optimistic UI on the POS**: render the sale instantly while the authoritative legal-journal write completes async — *carefully*, since the journal write must still succeed and remain the source of truth (surface a clear error/rollback if it fails).
6. **Re-measure against the Phase 5 baseline.**

**Decision gate:** if the POS now feels instant on the target device, **Phase 7 becomes optional**. If not, proceed.

---

### Phase 7 — Toolchain modernization: CRA → Vite (P1/P2) — effort: M

Independent of any framework decision; pure upside.

1. Migrate the build from `react-scripts` (unmaintained) to **Vite** (keep React for now): faster dev, better code-splitting, leaner production bundle, modern TS.
2. Bump TypeScript off `4.9.5`.
3. Update CI (`frontend-test` job) to the Vite build/test commands.

**Acceptance:** identical app behavior; smaller bundle; faster cold start; CI green.

> If the team decides to go straight to SvelteKit (Phase 8), Vite comes for free (SvelteKit is Vite-based) and this phase folds into Phase 8 — but doing Vite-on-React first de-risks by separating the build change from the framework change.

---

### Phase 8 — Frontend framework migration (conditional, biggest lever) — effort: L

**Only if Phases 6–7 don't hit the perf target.**

**Framework recommendation:**

- **Primary: SvelteKit (Svelte 5 + runes).** Compiles the framework away → very small bundles and excellent performance on low-RAM devices, no virtual-DOM overhead, strong DX, the largest ecosystem among the "compiled/fine-grained" options, and it's where your colleague was already heading. For a POS this is more than fast enough and the most maintainable/hireable of the fast options.
- **Alternative: SolidJS.** Marginally faster for fine-grained interactive updates in micro-benchmarks and uses JSX (familiar coming from React). Choose this only if absolute peak interactivity matters more than ecosystem size.
- **Low-risk fallback: Preact** (`preact/compat`). Near drop-in for React, lighter runtime — a smaller win, but the cheapest migration if a full rewrite proves too costly.

**Verdict:** **go with SvelteKit** unless Phase 5/6 profiling shows interactive-update cost specifically dominating (then reconsider Solid). Don't switch to Preact unless a full rewrite is rejected on cost grounds.

**Migration strategy (de-risked):**

1. **Stand up SvelteKit + Vite** alongside the existing app (don't delete React yet).
2. **Rebuild the POS hot path first** (product grid, cart, payment) — that's where the lag is and where the win is most visible. Validate against the Phase 5 baseline on the real device.
3. **Strangler approach**: migrate screen-by-screen (POS → History → Legal → Admin → Setup), keeping the backend API identical (the API contract is the stable seam — no backend change required).
4. **Reuse, don't reinvent**: keep the backend, types (`@mosehxl/types`), i18n strings, and business logic; only the view/state layer changes.
5. **Cut over** once parity + perf are proven; remove the React app last.

**Acceptance:** measured POS interaction latency meets target on the low-RAM device; feature parity; fiscal flows (receipt/closure/invoice) unchanged end-to-end.

---

### Phase 9 — Backend performance + deployment ergonomics (conditional) — effort: M–L

**Backend (only if Phase 5 implicates it):**

1. **Profile DB**: find N+1s, add missing indexes, tune pool — usually the real backend win.
2. **If request handling is proven to be the wall**, the cheap step is **Express → Fastify** (faster, similar model), *not* a language rewrite.
3. **Keep the Go backend rewrite parked.** Rewriting the certified, fiscally-hardened TypeScript backend re-opens inaltérabilité/closure-atomicity risk for latency the user can't perceive. Revisit only at large multi-tenant scale or real cloud-cost pressure — with profiling evidence.

**Deployment ergonomics (solves the "install everywhere" pain from the bridge discussion):**

1. **Standardize on cloud-polling printers** (Epson TM-m30II-**NT** / Star **CloudPRNT**) for new customers → **zero local software**; install = paste a URL into the printer.
2. **Package the bridge as an appliance** for venues with legacy LAN/USB printers: single executable (Strategy 3B / Go binary) or Raspberry Pi image + QR-code establishment pairing.
3. **Keep PDF/email receipts** as the universal no-hardware fallback.

---

## 4. NF‑525 self-certification — remaining (procedural, G1)

Code-wise the ISCA pillars are implemented (hash chain + DB triggers, audit trail, fail-closed closures with VAT reconciliation, signed archives, invoice compliance enforcement). To *claim* self-certification:

1. **Green evidence corpus** — delivered by **Phase 1** (a passing, reproducible test suite is part of the dossier).
2. **Scope decision** — B2C tickets only vs full NF‑525 functional scope.
3. **Référentiel mapping document** — map each LNE/NF‑525 requirement to the implementing code/test.
4. **Signed attestation individuelle de l'éditeur** — the legal alternative to the ~14k€ certificate (valid because you are both publisher and user).
5. **Operational controls** — retention (6-year), off-site/WORM backups, restore drills.

These are tracked here for completeness; only item 1 is a code task.

---

## 5. Sequencing & dependencies

```
Phase 1 (green baseline) ── must be first
   │
   ├─► Phase 2 (dead code)        ─┐
   ├─► Phase 3 (bridge → standard) ├─ Track A, parallelizable after green
   └─► Phase 4 (modularize)       ─┘
   │
Phase 5 (perf baseline) ── start in parallel with Track A
   │
   └─► Phase 6 (React quick wins)
          │  decision gate: lag resolved?
          ├─ yes ─► Phase 7 optional, stop here for perf
          └─ no  ─► Phase 7 (CRA→Vite) ─► Phase 8 (SvelteKit migration)
                                              │
                                              └─► Phase 9 (backend/deploy, conditional)
```

**Recommended order of execution:** 1 → (2, 3 in parallel) → 5 → 6 → 4 → [gate] → 7 → 8 → 9. Phase 4 (auth refactor) is slotted after the quick perf wins so the green baseline is rock-solid before touching auth, but it has no hard dependency on Track B.

---

## 6. Effort & risk summary

| Phase | Title | Effort | Risk | Blocking? |
|-------|-------|--------|------|-----------|
| 1 | Green baseline (fix invoice tests) | S | Very low | **Yes (P0)** |
| 2 | Dead-code removal | S | Very low | No |
| 3 | Bridge → TS + CI | M | Low | No |
| 4 | Split `authLogin.ts` / `printing.ts` | M | Low–Med (auth) | No |
| 5 | Perf baseline | S | None | Gates Track B |
| 6 | React quick wins | M | Low | No |
| 7 | CRA → Vite | M | Low–Med | No |
| 8 | SvelteKit migration | L | Med–High | No |
| 9 | Backend perf / deploy ergonomics | M–L | Med | No |

---

## 7. Definition of done (whole roadmap)

- CI green on `development` and `main` (type-check, lint, tests, build, schema-drift, all workspaces incl. bridge).
- Zero lint warnings; no dead exports; no file mixing unrelated concerns above ~500 LOC.
- Bridge fully under quality gates (and/or shipped as an appliance).
- POS interaction latency meets the documented target on the low-RAM reference device.
- Fiscal flows unchanged and verified; NF‑525 self-cert code evidence corpus is green and reproducible.

---

*This roadmap is a living plan. Update phase statuses here as work lands, and keep `docs/CURRENT-TRUTH.md` pointing at the latest authoritative status.*
