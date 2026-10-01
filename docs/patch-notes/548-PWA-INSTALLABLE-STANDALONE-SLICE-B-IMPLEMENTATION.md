# 548 — Installable PWA Slice B (IMPLEMENTATION)

## Summary

Minimal production service worker via `vite-plugin-pwa` (Workbox `generateSW`):
precache static shell only; `/api` is **NetworkOnly** and excluded from SPA
navigation fallback. Snackbar « Une mise à jour est prête » → **Recharger** when
a new SW is waiting (`registerType: 'prompt'`).

## Files changed

- `MuseBar/package.json` / lockfile — `vite-plugin-pwa` devDependency
- `MuseBar/vite.config.ts` — `VitePWA` (manifest: false; Workbox denylist + NetworkOnly `/api`)
- `MuseBar/src/pwa/registerPwaUpdate.ts` — `virtual:pwa-register` wrapper
- `MuseBar/src/components/common/PwaUpdateSnackbar.tsx` — French update snackbar
- `MuseBar/src/index.tsx` — mount snackbar
- `MuseBar/src/vite-env.d.ts` — `vite-plugin-pwa/client` types
- `CHANGELOG.md` — MINOR note

## Workbox rules (fiscal)

| Rule | Behaviour |
|------|-----------|
| Precache | `js/css/html/ico/png/svg/webmanifest` (no `*.map`) |
| `navigateFallback` | `/index.html` with denylist `/^\/api(?:\/|$)/` |
| Runtime `/api` | `NetworkOnly` (GET) — never CacheFirst / SWR |

No offline POS; no cached legal/auth responses.

## nginx / deploy notes

- Serve `build/sw.js` and `workbox-*.js` with **no long-term immutable cache**
  (or short max-age). Hashed assets under `assets/` may stay immutable.
- Prefer short/no cache on `index.html` so clients discover a new SW promptly.
- `manifest.webmanifest`: `Content-Type: application/manifest+json` if not already.
- Production FE still: local `vite build` with `VITE_API_URL=https://mosehxl.com`
  then rsync `MuseBar/build/` (2 GB droplet OOM on full build).

## Rollback

Redeploy previous `build/` without `sw.js`. Clients may keep an old SW until it
updates; if needed, ship a one-shot empty SW that calls `self.registration.unregister()`
once, then remove it on the next deploy.

## Verification results

- [x] `npm run type-check --workspace MuseBar` — pass
- [x] `npx vite build` — generates `build/sw.js`, Workbox bundle; precache ~134 entries
- [x] Generated SW contains `NetworkOnly` for `/api` and navigate denylist
- [ ] Manual: after two consecutive prod deploys, snackbar appears; `/api/health`
      still network (DevTools)

## Fiscal impact

MINOR — packaging / caching policy for static UI only; no ISCA / journal change.
