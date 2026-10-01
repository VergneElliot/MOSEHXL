# 547 — Installable PWA Slice A (IMPLEMENTATION)

## Summary

MuseBar is installable as a standalone PWA shell: web app manifest, icons,
Apple meta tags, and a French header install control (Chrome/Edge prompt + iOS
Add-to-Home-Screen instructions). No service worker yet (Slice B / 548).

## Files changed

- `MuseBar/public/manifest.webmanifest` — `display: standalone`, icons, theme
- `MuseBar/public/icons/icon-192.png`, `icon-512.png` — app icons (replaceable mark)
- `MuseBar/public/apple-touch-icon.png`, `favicon.ico`, `favicon-32.png`
- `MuseBar/index.html` — manifest link, theme-color, Apple web-app meta
- `MuseBar/src/pwa/pwaInstallDetect.ts` — standalone / iOS UA / hint storage helpers
- `MuseBar/src/pwa/pwaInstallDetect.test.ts` — unit tests for helpers
- `MuseBar/src/pwa/usePwaInstall.ts` — `beforeinstallprompt` capture + state
- `MuseBar/src/components/common/PwaInstallControl.tsx` — « Installer » / iOS dialog
- `MuseBar/src/components/common/AppHeader.tsx` — wire install control
- `docs/patch-notes/546-PWA-INSTALLABLE-STANDALONE-PLAN.md` — plan (prior)
- `CHANGELOG.md` — MINOR entry

## Verification results

- [x] `npx vitest run src/pwa/pwaInstallDetect.test.ts` — pass
- [x] `npm run type-check --workspace MuseBar` — pass
- [ ] Manual Chrome/Edge install on HTTPS (prod or tunnel)
- [ ] Manual iOS Safari Add to Home Screen
- [ ] Confirm CTA hidden when already standalone

## Follow-ups

- Slice B (548): minimal service worker (static precache only; never `/api`) +
  update-ready toast.
- Replace placeholder “M” icons with final MuseBar brand art when available.
- Optional short runbook for venue tablets after live verify.

## Fiscal impact

MINOR — packaging / UI only; no legal journal or ISCA change.
