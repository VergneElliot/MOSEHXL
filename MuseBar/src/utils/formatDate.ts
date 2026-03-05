/**
 * Shared date/time formatting for the application.
 * Single source of truth for display in French locale (fr-FR).
 * Use this everywhere instead of duplicating toLocaleString / toLocaleDateString.
 */

/**
 * Format a date string or Date for display (date + time).
 * e.g. "2025-03-05T14:30:00Z" → "05/03/2025, 15:30"
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string or Date for display (date only).
 */
export function formatDateOnly(dateString: string | Date): string {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
