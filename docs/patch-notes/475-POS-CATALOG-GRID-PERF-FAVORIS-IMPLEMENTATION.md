# 475 — POS catalog grid performance and Favoris derendering (IMPLEMENTATION)

**Date:** 2026-09-02  
**Branch:** `development` (deployed to production frontend + backend same day via rsync)

## Summary

Restored fast, responsive POS catalog rendering after a week of Virtuoso / `content-visibility`
experiments. Product cards are now lightweight plain DOM with a static stylesheet. Fixed
Favoris cards visually sticking at the top after leaving **Tous** (duplicate React keys).
Added print-bridge latency diagnostics and faster default polling.

## Problems solved

| Symptom | Cause | Fix |
|---------|--------|-----|
| ~2 s lag on category switch | MUI + Emotion per card (~28 components × 70) | `ProductGrid.css` + plain DOM |
| Scroll tearing | Hover `box-shadow` during scroll | Removed hover elevation |
| Scroll blanks + input lag (intermediate) | Virtuoso / `content-visibility` | Removed from product grid |
| Favorites stuck at top after **Tous** | Duplicate `product.id` keys on **Tous** list | `` key={`${index}:${product.id}`} `` + `key={catalogView}` on grid |
| Print delay hard to diagnose | No queue timing in logs/API | `queued_ms`, status latency fields, bridge logs |

## Files changed

### Frontend — POS catalog

- `MuseBar/src/components/POS/ProductGrid.css` — **new** static styles (grid, cards, controls)
- `MuseBar/src/components/POS/ProductGrid.tsx` — plain DOM cards; no Virtuoso/MUI Card stack;
  unique list keys; `showFavoriteBadge` prop
- `MuseBar/src/components/POS/POSMenuPanel.tsx` — `catalogView` key for grid remount; star
  badge only on **Tous** / **Favoris**
- `MuseBar/src/utils/canUseVirtualization.ts` — Virtuoso helpers removed from product grid
  (still used by `OrderSummary` cart lines)

### Backend — print bridge

- `MuseBar/backend/src/printing/bridgePrintJobRepo.ts` — `lastQueueWaitMs`,
  `lastPrintDurationMs`, `lastTotalLatencyMs` on queue status
- `MuseBar/backend/src/routes/printing/bridgeRoutes.ts` — poll response includes `queued_ms`,
  `created_at`; structured log on claim
- `MuseBar/backend/src/printing/bridgePrintJobRepo.test.ts` — status latency assertions
- `MuseBar/backend/src/routes/printing.routes.test.ts` — poll payload test update
- `MuseBar/backend/src/printing/printingConfigRepo.ts` — `.env` snippet `POLL_INTERVAL_MS=500`

### Print bridge (LAN)

- `MuseBar/bridge/src/config.ts` — default `POLL_INTERVAL_MS` 500
- `MuseBar/bridge/src/cloudClient.ts` — `queued_ms` on poll response
- `MuseBar/bridge/src/index.ts` — log `queuedMs`, `printMs`, `totalMs` per job

### Docs

- `docs/runbooks/PRINT-BRIDGE-V1.md` — latency troubleshooting section

### Skills (agent guidance)

- `.cursor/skills/pos-and-floor-service/SKILL.md` — hot path updated
- `.cursor/skills/printing-and-receipts/SKILL.md` — bridge latency notes

## Behaviour notes

### Catalog views

- **Tous** — favorites (top sellers) first, then categories A→Z; favorites **duplicated** in
  their category block (by design; see `posCatalogOrdering.test.ts`).
- **Favoris** — top sellers only, popularity order.
- **Category** — active products in category, A→Z; no favorites block at top.
- **Search** — active products matching query; no favorites injection.

### Product grid implementation rules (for future edits)

1. Do **not** reintroduce MUI `Card` / `sx` on the per-card hot path.
2. Do **not** use `key={product.id}` alone — **Tous** has duplicate ids.
3. Do **not** re-enable Virtuoso for &lt; ~100 products without measuring on establishment hardware.
4. Keep `key={catalogView}` on `ProductGrid` when catalog mode changes.
5. Avoid hover effects that trigger repaints during scroll.

## Verification results

- `npm run type-check --workspace MuseBar` — pass
- `npm run lint --workspace MuseBar` — pass (warnings only, pre-existing)
- `npm test --workspace MuseBar` — 28/28 pass
- Backend printing tests — pass (`printing.routes.test.ts`, `bridgePrintJobRepo.test.ts`)
- Manual (establishment POS, Chrome): category switch fast; no tearing; Favoris derender OK

## Production deploy (2026-09-02)

- Frontend: `MuseBar/build/` → `209.38.223.91:/var/www/MOSEHXL/MuseBar/build/`
- Backend: `MuseBar/backend/dist/` → server; `pm2 restart mosehxl-backend`
- **Bar PC:** restart print bridge; set `POLL_INTERVAL_MS=500` in bridge `.env` if still 2000

## Follow-ups

- Commit + push this batch to `development` (currently uncommitted on dev machine).
- Plan de salle / administration refinement (scheduled next session).
- Revisit virtualization only if catalog grows well past ~100 items.
