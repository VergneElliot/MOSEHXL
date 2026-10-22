import type { DailyClosureMode } from '../../../models/legalJournal/businessDayPeriod';
import { ValidationError } from '../../../middleware/errorHandler';

export function parseDailyClosureMode(value: unknown): DailyClosureMode {
  if (value == null || value === '') return 'business_day';
  if (value === 'close_now' || value === 'business_day') return value;
  throw new ValidationError('mode must be business_day or close_now');
}

export function parseForceFlag(force: unknown): boolean {
  if (force === true || force === 1) return true;
  if (typeof force === 'string') {
    const normalized = force.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
  }
  return false;
}

export function parseFondDeCaisse(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

/** Optional one-off recipients from create dialog; empty = no extras (settings auto-mail still applies). */
export function parseOptionalEmailRecipients(value: unknown): string[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value) && value.length === 0) return [];
  if (typeof value === 'string' && !value.trim()) return [];

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const parts: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;\n]+/)
      : [value];

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const email = String(part ?? '').trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError(`Adresse email destinataire invalide: ${email}`);
    }
    if (seen.has(email)) continue;
    seen.add(email);
    unique.push(email);
  }
  return unique;
}
