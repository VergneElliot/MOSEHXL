# 542 — Per-PIN visual prefs + POS card UX (PLAN)

## Context

Cashiers need an inclusive UI: large product cards help visually deficient staff
but hurt density for others. Preferences must follow the **active PIN badge**
(same model as Profil). Dark UI is preferred as the default look.

## Scope

1. **POS product cards** — whole card clickable to add; remove « Ajouter »;
   larger `+`/`−`; remove product→cart drag-and-drop (keep floor / split DnD).
2. **Header zoom slider** — functional, persisted per PIN membership.
3. **Full-app MUI dark theme** — mode stored per PIN; Profil toggle; live apply
   on session switch.

**Out of scope (follow-up):** per-control fonts, product-card density beyond
global zoom.

## Defaults

| Pref | Default |
|------|---------|
| `scale_percent` | `100` (80–130, step 5) |
| `color_mode` | `'dark'` when unset |

## Architecture

- Column `user_establishment_memberships.ui_prefs` (JSONB)
- Shape: `{ scale_percent, color_mode }` — ignore unknown keys for future slices
- `VisualPrefsProvider` loads/saves via `/auth/me/profile` for the active PIN actor
- Applies MUI theme mode + `document.documentElement` font-size

## Slices

| Slice | Patch | Scope |
|-------|-------|--------|
| A | 543 | Clickable cards, bigger qty, remove Ajouter + POS product DnD |
| B | 544 | `ui_prefs` migration + VisualPrefsContext + live header zoom |
| C | 545 | Full MUI dark theme + Profil Affichage toggle |

## Fiscal impact

MINOR (UI only; no legal journal / ISCA change).
