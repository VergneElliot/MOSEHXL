import { describe, expect, it } from 'vitest';
import {
  clampFineScalePercent,
  clampScalePercent,
  mergeUiPrefsPatch,
  normalizeUiPrefs,
  UI_PREFS_DEFAULTS,
} from './uiPrefs';

describe('uiPrefs', () => {
  it('defaults empty object to dark @ 100% with fine scales', () => {
    expect(normalizeUiPrefs({})).toEqual(UI_PREFS_DEFAULTS);
    expect(normalizeUiPrefs(null)).toEqual(UI_PREFS_DEFAULTS);
  });

  it('clamps and steps zoom scale 50–150', () => {
    expect(clampScalePercent(87)).toBe(85);
    expect(clampScalePercent(40)).toBe(50);
    expect(clampScalePercent(200)).toBe(150);
  });

  it('clamps fine scales 50–150', () => {
    expect(clampFineScalePercent(40)).toBe(50);
    expect(clampFineScalePercent(148)).toBe(150);
    expect(clampFineScalePercent(112)).toBe(110);
  });

  it('merges fine patches and keeps unknown keys', () => {
    const next = mergeUiPrefsPatch(
      { scale_percent: 100, color_mode: 'dark', card_density: 'large' },
      { card_scale_percent: 120, button_scale_percent: 90 }
    );
    expect(next.card_scale_percent).toBe(120);
    expect(next.button_scale_percent).toBe(90);
    expect(next.font_scale_percent).toBe(100);
    expect(next.card_density).toBe('large');
  });

  it('rejects invalid color_mode on patch', () => {
    expect(() => mergeUiPrefsPatch({}, { color_mode: 'neon' })).toThrow(/color_mode/);
  });
});
