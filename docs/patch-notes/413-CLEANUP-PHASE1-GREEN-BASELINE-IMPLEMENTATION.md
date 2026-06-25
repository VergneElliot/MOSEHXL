# 413 - Cleanup Phase 1: green baseline - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

The 2026-06-24 cleanup review found that the backend suite was no longer green.
The failures were not production behavior regressions: invoice compliance had been
hardened correctly, but the route tests still used incomplete legal fixtures.

During the full-suite verification pass, one additional stale auth rate-limit test
was exposed: it manually signed a JWT with `jsonwebtoken` even though production
refresh rate limiting now verifies through the centralized JWT config.

---

## 2) What changed

### Invoice route tests

Updated `MuseBar/backend/src/routes/legal/invoices.routes.test.ts`:

1. creation-path receipt fixtures now include complete seller identity:
   - business name,
   - address,
   - SIRET,
   - tax identification,
2. existing-invoice fixture now includes persisted invoice legal metadata:
   - payment due date,
   - payment terms,
   - late penalty terms,
   - recovery fee note,
3. existing-invoice fixture also includes complete persisted seller identity in
   `business_info`.

The production route was not weakened. The compliance blockers in
`MuseBar/backend/src/routes/legal/invoices.ts` remain the source of truth.

### Auth rate-limit test

Updated `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.test.ts`:

1. replaced direct `jsonwebtoken.sign()` usage with `signJwtToken()`,
2. kept the resolver assertion the same (`ip:127.0.0.1:user:42`),
3. aligned the test token with the production `verifyJwtToken()` path.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npx vitest run src/routes/legal/invoices.routes.test.ts`
   - Result: 8 passed / 0 failed
2. `npx vitest run src/middleware/security/AuthEndpointRateLimit.test.ts`
   - Result: 3 passed / 0 failed
3. `npm test`
   - Result: 65 files passed / 285 tests passed
4. `npm run type-check`
   - Result: pass
5. `npm run lint`
   - Result at this phase: pass with 0 errors and the already-known Phase 2 warnings
6. IDE diagnostics on edited files
   - Result: no linter errors

---

## 4) Outcome

The backend test baseline is green again. This restores the clean evidence corpus
needed before continuing cleanup, bridge hardening, and future certification
documentation work.
