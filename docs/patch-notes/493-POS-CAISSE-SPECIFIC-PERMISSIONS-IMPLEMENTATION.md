# 493 — Caisse (POS) specific permissions pass (IMPLEMENTATION)

Page-by-page pass for **Caisse**, following the convention: named features are specific
(PIN session or one-shot PIN + Gestion des utilisateurs checkbox); everything else on the
page stays basic.

## Specific on Caisse

| Feature | Permission | Checkbox label |
|---------|------------|----------------|
| Happy Hour on the cart side panel | `pos_happyhour_manual` | Happy Hour manuel (panier + en-tête) |
| Happy Hour header chip (manual override) | `pos_happyhour_manual` | same |
| Offert | `pos_apply_offert` | Offert |
| Perso | `pos_apply_perso` | Perso |
| Remise | `pos_apply_remise` (**new**) | Remise |
| « Assigner à » → réassigner un serveur | `pos_reassign_waiter` | Réassigner le serveur… |

## Basic on Caisse (unchanged)

Page access, catalog, cart, note, à suivre, validate table order, checkout (CB / espèces /
options), « Assigner à » → **table** only, table select, PIN session open.

Happy Hour **settings** (Paramètres) stay behind `access_settings` and will be refined on the
settings page pass.

## Code changes

- Registry: `pos_apply_remise` in `@mosehxl/types` `PERMISSIONS` / `PERMISSION_TIERS`.
- Migration `2026_09_03_22_55_00_pos_apply_remise_permission.sql`.
- Frontend: Remise step-up uses `pos_apply_remise` (was wrongly `pos_happyhour_manual`).
- Backend: `assertPosOrderLinePermissions` detects `[Remise…]` tags, and authorises from the
  **account or the PIN identity** (same rule as `requirePermission`), so a step-up PIN is
  enough at order create.
- Gestion des utilisateurs: checkbox appears automatically via `SPECIFIC_PERMISSIONS` +
  `PERMISSION_META`.

Assigner table vs waiter was already split correctly (`ensureSession` vs
`pos_reassign_waiter`).

## Fiscal impact

**PATCH** — permission gating only; no journal/hash change.
