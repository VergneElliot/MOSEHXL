/**
 * Normalize membership ui_prefs. Unknown keys preserved for forward compat.
 */

export type ColorMode = 'light' | 'dark';

export type UiPrefs = {
  scale_percent: number;
  color_mode: ColorMode;
  font_scale_percent: number;
  card_scale_percent: number;
  button_scale_percent: number;
  nav_scale_percent: number;
  [key: string]: unknown;
};

export const UI_PREFS_DEFAULTS: UiPrefs = {
  scale_percent: 100,
  color_mode: 'dark',
  font_scale_percent: 100,
  card_scale_percent: 100,
  button_scale_percent: 100,
  nav_scale_percent: 100,
};

const SCALE_MIN = 50;
const SCALE_MAX = 150;
const SCALE_STEP = 5;

const FINE_KEYS = [
  'font_scale_percent',
  'card_scale_percent',
  'button_scale_percent',
  'nav_scale_percent',
] as const;

export function clampScalePercent(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return UI_PREFS_DEFAULTS.scale_percent;
  const stepped = Math.round(n / SCALE_STEP) * SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, stepped));
}

export function clampFineScalePercent(raw: unknown, fallback = 100): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return clampScalePercent(n);
}

export function normalizeColorMode(raw: unknown): ColorMode {
  return raw === 'light' ? 'light' : 'dark';
}

/** Merge stored JSON with defaults; keep unknown keys. */
export function normalizeUiPrefs(raw: unknown): UiPrefs {
  const obj =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    ...obj,
    scale_percent: clampScalePercent(
      obj.scale_percent !== undefined ? obj.scale_percent : UI_PREFS_DEFAULTS.scale_percent
    ),
    color_mode: normalizeColorMode(
      obj.color_mode !== undefined ? obj.color_mode : UI_PREFS_DEFAULTS.color_mode
    ),
    font_scale_percent: clampFineScalePercent(
      obj.font_scale_percent,
      UI_PREFS_DEFAULTS.font_scale_percent
    ),
    card_scale_percent: clampFineScalePercent(
      obj.card_scale_percent,
      UI_PREFS_DEFAULTS.card_scale_percent
    ),
    button_scale_percent: clampFineScalePercent(
      obj.button_scale_percent,
      UI_PREFS_DEFAULTS.button_scale_percent
    ),
    nav_scale_percent: clampFineScalePercent(
      obj.nav_scale_percent,
      UI_PREFS_DEFAULTS.nav_scale_percent
    ),
  };
}

/** Partial patch from client body — only known keys validated. */
export function mergeUiPrefsPatch(current: unknown, patch: unknown): UiPrefs {
  const base = normalizeUiPrefs(current);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return base;
  }
  const p = patch as Record<string, unknown>;
  const next: Record<string, unknown> = { ...base };
  if (p.scale_percent !== undefined) {
    next.scale_percent = clampScalePercent(p.scale_percent);
  }
  if (p.color_mode !== undefined) {
    if (p.color_mode !== 'light' && p.color_mode !== 'dark') {
      throw Object.assign(new Error('color_mode must be light or dark'), {
        code: 'INVALID_UI_PREFS',
      });
    }
    next.color_mode = p.color_mode;
  }
  for (const key of FINE_KEYS) {
    if (p[key] !== undefined) {
      next[key] = clampFineScalePercent(p[key], UI_PREFS_DEFAULTS[key]);
    }
  }
  return normalizeUiPrefs(next);
}
