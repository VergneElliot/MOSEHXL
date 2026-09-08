/**
 * Distinct calendar colors for staff within one establishment.
 * Prefer curated palette; overflow uses golden-angle HSL → hex.
 */

export const CALENDAR_COLOR_PALETTE = [
  '#1565C0',
  '#2E7D32',
  '#C62828',
  '#6A1B9A',
  '#EF6C00',
  '#00838F',
  '#AD1457',
  '#4527A0',
  '#558B2F',
  '#0277BD',
  '#F9A825',
  '#5D4037',
  '#00695C',
  '#D84315',
  '#283593',
  '#9E9D24',
  '#6D4C41',
  '#00897B',
  '#7B1FA2',
  '#E65100',
  '#37474F',
  '#1B5E20',
  '#B71C1C',
  '#01579B',
] as const;

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeCalendarColor(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function pickNextCalendarColor(used: Iterable<string>): string {
  const taken = new Set(
    Array.from(used)
      .map((c) => normalizeCalendarColor(c))
      .filter((c): c is string => Boolean(c))
  );
  for (const color of CALENDAR_COLOR_PALETTE) {
    if (!taken.has(color)) return color;
  }
  for (let i = 0; i < 360; i += 1) {
    const candidate = hslToHex((i * 137.508) % 360, 65, 38);
    if (!taken.has(candidate)) return candidate;
  }
  return `#${Date.now().toString(16).slice(-6).toUpperCase().padStart(6, '0')}`;
}

export function listAvailableCalendarColors(used: Iterable<string>, current?: string | null): string[] {
  const taken = new Set(
    Array.from(used)
      .map((c) => normalizeCalendarColor(c))
      .filter((c): c is string => Boolean(c))
  );
  const currentNorm = current ? normalizeCalendarColor(current) : null;
  return CALENDAR_COLOR_PALETTE.filter(
    (c) => !taken.has(c) || (currentNorm != null && c === currentNorm)
  );
}
