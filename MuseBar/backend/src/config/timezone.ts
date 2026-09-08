/**
 * Application default timezone.
 * All server-side time calculations (closures, scheduler, business day) use this
 * when no establishment-specific or settings-based timezone is provided.
 * France-only deployment: Europe/Paris (handles DST automatically).
 */
import { APP_TIMEZONE } from '@mosehxl/types';

export const DEFAULT_APP_TIMEZONE = APP_TIMEZONE;
