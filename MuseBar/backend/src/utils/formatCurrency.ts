/**
 * Shared backend currency formatting helpers.
 * Keep legal/printing outputs consistent and avoid inline toFixed duplication.
 */

export type CurrencyLabel = '€' | 'EUR';

export function formatEuroAmount(amount: number, label: CurrencyLabel = '€'): string {
  const normalized = Number.isFinite(amount) ? amount : 0;
  return `${normalized.toFixed(2)} ${label}`;
}
