/**
 * Application default timezone.
 * All server-side time calculations (closures, scheduler, business day) use this
 * when no establishment-specific or settings-based timezone is provided.
 * France-only deployment: Europe/Paris (handles DST automatically).
 */
export const DEFAULT_APP_TIMEZONE = 'Europe/Paris';
