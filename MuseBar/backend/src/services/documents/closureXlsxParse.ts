import { formatDateOnly, formatDateTime, formatParisYmd } from '@mosehxl/types';
import type { VatBand, VatBreakdown } from './closureXlsxTypes';

export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export function roundTo4(amount: number): number {
  return Math.round(amount * 10000) / 10000;
}

export function vatFromTtc(ttc: number, rate: 0.1 | 0.2): number {
  return roundTo4(ttc / (rate === 0.1 ? 11 : 6));
}

export function parsePaymentBreakdown(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = toNumber(value);
  }
  return out;
}

export function parseVatBreakdown(raw: unknown): VatBreakdown {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as Record<string, unknown>;
  const parseBand = (band: unknown): VatBand | undefined => {
    if (!band || typeof band !== 'object') return undefined;
    const b = band as Record<string, unknown>;
    return {
      amount: toNumber(b.amount),
      vat: toNumber(b.vat),
      ttc: b.ttc == null ? undefined : toNumber(b.ttc),
    };
  };
  return {
    vat_10: parseBand(row.vat_10),
    vat_20: parseBand(row.vat_20),
  };
}

export function buildVatBreakdownFromTtc(vat10Ttc: number, vat20Ttc: number): VatBreakdown {
  const vat10 = vatFromTtc(vat10Ttc, 0.1);
  const vat20 = vatFromTtc(vat20Ttc, 0.2);
  return {
    vat_10: {
      ttc: roundTo4(vat10Ttc),
      vat: vat10,
      amount: roundTo4(vat10Ttc - vat10),
    },
    vat_20: {
      ttc: roundTo4(vat20Ttc),
      vat: vat20,
      amount: roundTo4(vat20Ttc - vat20),
    },
  };
}

export function dateOnly(value: Date | string): string {
  const formatted = formatDateOnly(value);
  if (formatted === 'N/A') return String(value).slice(0, 10);
  return formatted;
}

export function dateTime(value: Date | string): string {
  const formatted = formatDateTime(value);
  if (formatted === 'N/A') return String(value);
  return formatted;
}

export function dateOnlyYmd(value: Date | string): string {
  return formatParisYmd(value) || String(value).slice(0, 10);
}

export function vatBand(vat: VatBreakdown, key: 'vat_10' | 'vat_20'): Required<VatBand> {
  const band = vat[key] ?? {};
  const amount = toNumber(band.amount);
  const vatAmount = toNumber(band.vat);
  const ttc = band.ttc == null ? amount + vatAmount : toNumber(band.ttc);
  return { amount, vat: vatAmount, ttc };
}

export function totalHt(vat: VatBreakdown, fallbackTtc: number, fallbackVat: number): number {
  const vat10 = vatBand(vat, 'vat_10');
  const vat20 = vatBand(vat, 'vat_20');
  const fromBands = vat10.amount + vat20.amount;
  return fromBands > 0 ? fromBands : fallbackTtc - fallbackVat;
}

export function isPeriodClosureBulletin(closureType: string): boolean {
  return closureType === 'WEEKLY' || closureType === 'MONTHLY' || closureType === 'ANNUAL';
}
