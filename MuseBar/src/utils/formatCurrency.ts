/**
 * Shared currency formatting for the application.
 * Single source of truth for Euro (EUR) display in French locale (fr-FR).
 * Use this everywhere instead of duplicating Intl.NumberFormat calls.
 */

const formatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

/**
 * Format a number as Euro currency (e.g. 12.5 → "12,50 €").
 */
export function formatCurrency(amount: number): string {
  return formatter.format(amount);
}
