/**
 * France civil date/time for display and form wall-clock values.
 * Instant storage stays UTC ISO / timestamptz. Hash-chain timestamps stay UTC ISO.
 */
export declare const APP_TIMEZONE = "Europe/Paris";
export declare const APP_LOCALE = "fr-FR";
export type DateInput = string | Date | number | null | undefined;
export declare function parseToDate(value: DateInput): Date | null;
type ParisParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};
export declare function getParisParts(date: Date): ParisParts;
/**
 * Interpret a Paris wall-clock civil time as an exact UTC instant (DST-safe).
 */
export declare function parisWallToUtc(year: number, month: number, day: number, hour?: number, minute?: number, second?: number): Date;
export declare function formatDateTime(value: DateInput): string;
export declare function formatDateTimeSeconds(value: DateInput): string;
export declare function formatDateOnly(value: DateInput): string;
export declare function formatTime(value: DateInput): string;
export declare function formatDateLong(value: DateInput): string;
/** YYYYMMDD in Europe/Paris (Flux 10.3 civil date). */
export declare function formatParisYmdCompact(value: DateInput): string;
/** YYYYMMDDHHmmss in Europe/Paris. */
export declare function formatParisDateTimeCompact(value?: DateInput): string;
export declare function formatParisYmd(value: DateInput): string;
export declare function parisTodayYmd(): string;
export declare function ymdToFrench(ymd: string): string;
export declare function frenchDateToYmd(value: string): string | null;
export declare function normalizeTimeHm(value: string): string | null;
/** `YYYY-MM-DDTHH:mm` in Paris wall clock (form state). */
export declare function utcToParisDateTimeLocal(value: DateInput): string;
export declare function parisDateTimeLocalToUtcIso(local: string): string;
export declare function parisYmdHmToUtcIso(ymd: string, hm: string): string;
export declare function parisWallDateTimeLocal(year: number, month: number, day: number, hour: number, minute: number): string;
export {};
