/**
 * Shared date/time formatting — re-exports the France (Europe/Paris) helpers.
 * Display is always DD/MM/YYYY and 24-hour time. Storage remains UTC ISO.
 */
export {
  APP_TIMEZONE,
  formatDateTime as formatDate,
  formatDateTimeSeconds,
  formatDateOnly,
  formatTime,
  formatDateLong,
  parisTodayYmd,
  utcToParisDateTimeLocal,
  parisDateTimeLocalToUtcIso,
  parisYmdHmToUtcIso,
  parisWallDateTimeLocal,
  ymdToFrench,
  frenchDateToYmd,
  normalizeTimeHm,
} from '@mosehxl/types';
