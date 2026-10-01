# 546 — Installable PWA (standalone MuseBar) (PLAN)

## Context

Cashiers open MuseBar in a normal browser tab. The address bar and tabs waste
scarce vertical space on tablets and low-end caisse machines. A **manual
Fullscreen API button is out of scope** — the preferred product is an
**installable Progressive Web App (PWA)** that launches in `display: standalone`
(no browser chrome) after a one-time “Install” / “Add to Home Screen”.

This is **not** a native App Store / Play Store project. The same React SPA at
`https://mosehxl.com` gains a web app manifest (+ minimal install UX). Staff keep
using the existing HTTPS deploy; no Swift/Kotlin rewrite.

## Goals

1. MuseBar is **installable** on Chrome/Edge (desktop + Android) and usable as
   **Add to Home Screen** on iOS Safari.
2. Installed launches open **standalone** (app window, no tab strip / URL bar).
3. Clear French in-app affordance: how to install + hide when already installed /
   already standalone.
4. Deploy path unchanged: build static assets → nginx `MuseBar/build/` + PM2 API.

## Non-goals (v1)

- Manual `requestFullscreen()` button (deferred; PWA replaces the need).
- Offline POS / offline fiscal operations (dangerous; legal journal needs live API).
- Aggressive service-worker caching of `/api/*`, auth cookies, or legal data.
- App Store / Play Store packaging, Capacitor, React Native.
- Separate PWA for public reservation pages (`/reserve/...`) — leave as normal web.
- Push notifications, background sync, “share target”.

## Browser reality (honest)

| Platform | Expected UX |
|----------|-------------|
| Chrome / Edge (Android, Windows, Linux) | “Installer l’application” via browser UI + optional in-app button when `beforeinstallprompt` fires |
| Desktop Safari | Limited install prompt; still usable as bookmark / dock in some versions |
| iOS Safari | **Add to Home Screen** (Share → Sur l’écran d’accueil); opens standalone with correct meta + icons; no `beforeinstallprompt` |
| In-tab browsing | Unchanged; chrome stays until user installs |

Installability needs HTTPS (already true in production). Local `npm run dev` may
not show install prompts; verify on prod or a tunnel.

## Architecture

### Manifest

Add `MuseBar/public/manifest.webmanifest` (copied to `build/` by Vite):

| Field | Value (proposed) |
|-------|------------------|
| `name` | `MuseBar` (or venue-agnostic product name; keep short) |
| `short_name` | `MuseBar` |
| `start_url` | `/` |
| `scope` | `/` |
| `display` | `standalone` |
| `orientation` | `any` (POS tablets rotate; do not lock landscape) |
| `background_color` / `theme_color` | Align with dark default (`#121212` / near-black) |
| `icons` | At least **192×192** and **512×512** PNG (maskable + any) |

Link from `MuseBar/index.html`:

- `<link rel="manifest" href="/manifest.webmanifest" />`
- `<meta name="theme-color" …>` (already present; sync with manifest)
- iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `apple-mobile-web-app-title`, `<link rel="apple-touch-icon" href="…">`

### Icons

Repo currently has **no** favicon / app icons under `MuseBar/`. v1 must add:

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/apple-touch-icon.png` (180×180 typical)
- Optional favicon `public/favicon.ico` or SVG for browser tabs

Use a simple branded mark (existing Muse / MuseBar identity if available from
marketing assets; otherwise a minimal geometric “M” placeholder documented as
replaceable). Do **not** block the feature on perfect branding.

### Install UX (frontend)

Small dedicated module(s), keep `AppHeader` thin (module-size / code-hygiene):

| Piece | Role |
|-------|------|
| `src/pwa/registerPwaInstall.ts` or hook `usePwaInstall.ts` | Capture `beforeinstallprompt`; expose `canInstall`, `promptInstall()`, `isStandalone` |
| `src/components/common/PwaInstallControl.tsx` | Header (or Profil) control: « Installer l’app » when available; short helper text for iOS when not |
| Detection | `window.matchMedia('(display-mode: standalone)')` + iOS `navigator.standalone` |

Behaviour:

- If already standalone → hide install CTA.
- If `beforeinstallprompt` available → button triggers native install dialog.
- Else (esp. iOS) → show a short dismissible hint: Share → Sur l’écran d’accueil
  (French copy). Persist “dismissed” in `localStorage` (device-level, not PIN).

Prefer header near existing controls **or** a Profil / Paramètres section
« Application » — pick one place in implementation to avoid clutter; header is
better for discoverability on first venue tablets.

### Service worker (slice B — optional but recommended)

**Slice A can ship installable UX with manifest + icons alone** on modern Chrome
and iOS Add to Home Screen. Slice B adds a **minimal** SW for:

- Precache static shell (`index.html`, hashed JS/CSS, icons, manifest)
- **Network-only** (or bypass) for `/api/**`
- Optional “Nouvelle version disponible — Recharger” toast when a new SW waits

Prefer `vite-plugin-pwa` (Workbox) with explicit denylist for API routes over a
hand-rolled SW. Configure so legal/auth traffic is never served stale from cache.

If Slice B risks deploy complexity on the 2 GB droplet / rsync flow, ship A first
and add B once install works in production.

### Server / nginx

Confirm production nginx serves:

- `/manifest.webmanifest` with `Content-Type: application/manifest+json` (or
  `application/json` if already fine)
- Icons and `apple-touch-icon` as static files from `MuseBar/build/`
- If SW added: `Service-Worker-Allowed` not required if SW scope is `/`; ensure
  `index.html` is not over-cached by nginx in a way that blocks updates (short
  cache or hash-based assets already Vite-default)

No backend API or migration changes for v1.

## Slices

| Slice | Patch | Scope |
|-------|-------|--------|
| A | 547 | Manifest, icons, HTML meta, install detection + French CTA / iOS hint; document verify steps |
| B | 548 | Minimal PWA service worker (static precache only) + update reload UX; nginx MIME/cache notes if needed |

PLAN is **546**. Implementation notes are consecutive **547** then **548**.

## Approach (Slice A detail)

1. Add icons under `MuseBar/public/icons/` (+ apple-touch + favicon).
2. Add `manifest.webmanifest`; link + Apple meta in `index.html`.
3. Implement `usePwaInstall` + `PwaInstallControl`; wire into header (or Profil).
4. Smoke: Chrome DevTools → Application → Manifest; “Install” on Android/desktop;
   iOS Add to Home Screen opens without Safari chrome.
5. CHANGELOG MINOR; regenerate patch-notes index on commit of implementations.
6. Production: rebuild frontend (`VITE_API_URL=https://mosehxl.com`), rsync
   `build/` (same ops pattern as last deploy on the 2 GB droplet).

## Approach (Slice B detail)

1. Add `vite-plugin-pwa` with `registerType: 'prompt'` (or auto + toast).
2. Workbox `navigateFallback` for SPA; **runtimeCaching** excludes `/api`.
3. UI toast: « Une mise à jour est prête » → reload.
4. Verify after deploy: hard refresh once, then subsequent loads get SW; API
   calls still hit network (DevTools Network / disable cache test).

## Verification

### Automated

- [ ] `npm run type-check --workspace MuseBar`
- [ ] `npm run lint --workspace MuseBar` (touched files)
- [ ] `npm run build --workspace MuseBar` — manifest + icons present under `build/`
- [ ] Optional: unit test for `isStandalone` / prompt gating helpers (pure functions)

### Manual

- [ ] Chrome desktop: install from CTA or browser install icon; relaunch → no URL bar
- [ ] Android Chrome: install → home screen icon → standalone
- [ ] iOS Safari: Add to Home Screen → opens standalone; icon correct
- [ ] Already-installed / standalone session: install CTA hidden
- [ ] Login, PIN session, POS still work in standalone (cookies / storage same origin)
- [ ] Public `/reserve/musebar` still works in normal browser (unchanged)
- [ ] Slice B only: bump deploy → update prompt appears; `/api/health` not served from SW cache

### Fiscal impact

**MINOR** — UI / packaging only; no legal journal, closures, or ISCA parameter change.

## Risks

| Risk | Mitigation |
|------|------------|
| Stale SW caches API / auth | Slice B: denylist `/api`; network-first; skip SW in A if unsure |
| iOS users miss install (no prompt API) | Explicit French Share-sheet instructions |
| Wrong `start_url` / scope breaks deep links | Keep `start_url: '/'`, `scope: '/'`; SPA router handles routes |
| Icon / branding placeholder looks unprofessional | Document replaceable assets; use clean simple mark |
| nginx wrong MIME for manifest | Check response headers on prod after first deploy |
| Module-size / header bloat | New files for hook + control; do not grow `AppHeader` past concern |

## Rollback

Remove manifest link + install UI; redeploy previous `build/`. If SW was
registered, publish an empty/unregistering SW once or bump clients to clear
(document in IMPLEMENTATION if Slice B ships). No DB rollback.

## Follow-ups (later, not this PLAN)

- Manual Fullscreen API button as fallback inside non-installed tabs (optional).
- Per-venue icon / name in manifest (dynamic manifest — harder; not v1).
- Offline read-only catalogue shell (explicit product decision; fiscal constraints).
- Document PWA install in a short runbook under `docs/runbooks/` after Slice A
  is verified on live tablets.
