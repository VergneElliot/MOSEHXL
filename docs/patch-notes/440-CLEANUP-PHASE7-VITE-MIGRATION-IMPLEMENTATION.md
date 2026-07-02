# 440 - Cleanup Phase 7: CRA → Vite migration - Implementation

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Plan: `docs/patch-notes/439-CLEANUP-PHASE7-VITE-MIGRATION-PLAN.md`  
Prior: Phase 6B (`438`) — venue lag gate **failed** on DISH cashier PC

---

## 1) Context

Phase 6 (bundle −82 KB gzip) and Phase 6B (runtime hot-path memo/batch) did not
resolve subjective POS lag on venue hardware. Phase 7 replaces unmaintained CRA
with Vite for leaner builds, better chunking, and modern TypeScript — without
changing React or backend APIs.

---

## 2) What changed

### Build toolchain

| File | Change |
|------|--------|
| `MuseBar/vite.config.ts` | **New** — Vite + React plugin, `build/` outDir, API proxy, Vitest |
| `MuseBar/index.html` | **New** — Vite entry (`/src/index.tsx`); removed CRA `public/index.html` |
| `MuseBar/tsconfig.node.json` | **New** — config for `vite.config.ts` |
| `MuseBar/src/vite-env.d.ts` | **New** — `ImportMetaEnv` types |
| `MuseBar/package.json` | `react-scripts` removed; `vite`, `vitest`, TS 5.7 |
| `MuseBar/tsconfig.json` | `moduleResolution: bundler`, ES2020 target |

### Environment variables

| CRA | Vite |
|-----|------|
| `REACT_APP_API_URL` | `VITE_API_URL` |
| `REACT_APP_REPORT_DEV_ERRORS` | `VITE_REPORT_DEV_ERRORS` |
| `REACT_APP_CLIENT_ERROR_REPORT_KEY` | `VITE_CLIENT_ERROR_REPORT_KEY` |

Updated in `api.ts`, `clientErrorLogger.ts`, ErrorBoundary components.

### Tests

| File | Change |
|------|--------|
| `src/setupTests.ts` | Vitest + `vi` mocks |
| `*.test.ts` | `jest` → `vi` |
| `package.json` scripts | `vitest run --coverage` for CI |

### Types alias

`@mosehxl/types` resolves to `packages/types/src/index.ts` (runtime `PERMISSIONS` export).

### ESLint

Removed `react-app` preset; standalone config aligned with prior CRA leniency.

---

## 3) Bundle comparison (Vite `npm run build`)

| Metric | Phase 6 (CRA) | Phase 7 (Vite) |
|--------|---------------|----------------|
| Main entry gzip | **189 KB** | **189 KB** (`index-*.js`) |
| Chunking | CRA async chunks | Vite rollup chunks (similar count) |
| Build tool | `react-scripts` 5.0.1 | **Vite 6** |

Bundle size similar; Vite improves dev speed and sets up Phase 8. **Venue lag gate** still pending.

---

## 4) Verification

| Check | Result |
|-------|--------|
| `npm run type-check` | ✅ |
| `npm run lint` | ✅ (0 errors) |
| `npm run test:ci` | ✅ 24 tests |
| `npm run build` | ✅ |

---

## 5) Production deploy

Update `/var/www/MOSEHXL/MuseBar/.env.production`:

```
VITE_API_URL=https://mosehxl.com
```

Rebuild frontend after env change (`npm run build --workspace MuseBar`).

---

## 6) Rollback

Revert Phase 7 commit; restore `react-scripts` and CRA `public/index.html`.

---

## 7) Next steps

1. Deploy + hard-refresh venue cashier PC.
2. **Decision gate:** if still laggy → Phase 6C (virtualization) + **Phase 8** (SvelteKit POS rewrite).
