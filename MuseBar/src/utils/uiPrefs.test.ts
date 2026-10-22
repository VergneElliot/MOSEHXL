import { describe, expect, it } from 'vitest';
import {
  BASE_HTML_FONT_PERCENT,
  clampFineScalePercent,
  clampScalePercent,
  fineScaleRatio,
  htmlFontSizeForScale,
  normalizeUiPrefs,
  SCALE_MAX,
  SCALE_MIN,
  UI_PREFS_DEFAULTS,
} from './uiPrefs';

describe('uiPrefs', () => {
  it('clampScalePercent steps and clamps', () => {
    expect(clampScalePercent(97)).toBe(95);
    expect(clampScalePercent(98)).toBe(100);
    expect(clampScalePercent(10)).toBe(SCALE_MIN);
    expect(clampScalePercent(999)).toBe(SCALE_MAX);
    expect(clampScalePercent('nope')).toBe(UI_PREFS_DEFAULTS.scale_percent);
    expect(clampFineScalePercent(undefined, 110)).toBe(110);
  });

  it('normalizeUiPrefs fills defaults and color mode', () => {
    expect(normalizeUiPrefs(null)).toEqual(UI_PREFS_DEFAULTS);
    expect(normalizeUiPrefs({ color_mode: 'light', scale_percent: 120 })).toMatchObject({
      color_mode: 'light',
      scale_percent: 120,
      font_scale_percent: 100,
    });
    expect(normalizeUiPrefs({ color_mode: 'weird' }).color_mode).toBe('dark');
  });

  it('htmlFontSizeForScale and fineScaleRatio', () => {
    expect(htmlFontSizeForScale(100)).toBe(`${BASE_HTML_FONT_PERCENT}%`);
    expect(htmlFontSizeForScale(200)).toBe(`${(BASE_HTML_FONT_PERCENT * SCALE_MAX) / 100}%`);
    expect(fineScaleRatio(100)).toBe('1');
    expect(fineScaleRatio(50)).toBe('0.5');
  });
});
