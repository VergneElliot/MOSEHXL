/**
 * Client-side UI prefs (mirrors backend normalize rules).
 *
 * Header `scale_percent` = global zoom (html font-size).
 * Fine `*_scale_percent` = independent proportions on top of that zoom.
 */

export type ColorMode = 'light' | 'dark';

export type UiPrefs = {
  scale_percent: number;
  color_mode: ColorMode;
  font_scale_percent: number;
  card_scale_percent: number;
  button_scale_percent: number;
  nav_scale_percent: number;
};

export const UI_PREFS_DEFAULTS: UiPrefs = {
  scale_percent: 100,
  color_mode: 'dark',
  font_scale_percent: 100,
  card_scale_percent: 100,
  button_scale_percent: 100,
  nav_scale_percent: 100,
};

/** CssBaseline / zoom base is 87.5% (14px). Header scale multiplies that. */
export const BASE_HTML_FONT_PERCENT = 87.5;

/** Display / fine-control range (header zoom + Profil Accessibilité). */
export const SCALE_MIN = 50;
export const SCALE_MAX = 150;
export const SCALE_STEP = 5;

/** @deprecated use SCALE_MIN */
export const FINE_SCALE_MIN = SCALE_MIN;
/** @deprecated use SCALE_MAX */
export const FINE_SCALE_MAX = SCALE_MAX;
/** @deprecated use SCALE_STEP */
export const FINE_SCALE_STEP = SCALE_STEP;

export type FineScaleKey =
  | 'font_scale_percent'
  | 'card_scale_percent'
  | 'button_scale_percent'
  | 'nav_scale_percent';

export function clampScalePercent(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return UI_PREFS_DEFAULTS.scale_percent;
  const stepped = Math.round(n / SCALE_STEP) * SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, stepped));
}

export function clampFineScalePercent(raw: unknown, fallback = 100): number {
  return clampScalePercent(
    Number.isFinite(Number(raw)) ? raw : fallback
  );
}

export function normalizeUiPrefs(raw: unknown): UiPrefs {
  const obj =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    scale_percent: clampScalePercent(
      obj.scale_percent !== undefined ? obj.scale_percent : UI_PREFS_DEFAULTS.scale_percent
    ),
    color_mode: obj.color_mode === 'light' ? 'light' : 'dark',
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

export function htmlFontSizeForScale(scalePercent: number): string {
  return `${(BASE_HTML_FONT_PERCENT * clampScalePercent(scalePercent)) / 100}%`;
}

/** CSS unitless multiplier for fine scales (1 = 100%). */
export function fineScaleRatio(percent: number): string {
  return String(clampFineScalePercent(percent) / 100);
}
