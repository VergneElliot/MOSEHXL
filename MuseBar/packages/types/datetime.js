"use strict";
/**
 * France civil date/time for display and form wall-clock values.
 * Instant storage stays UTC ISO / timestamptz. Hash-chain timestamps stay UTC ISO.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_LOCALE = exports.APP_TIMEZONE = void 0;
exports.parseToDate = parseToDate;
exports.getParisParts = getParisParts;
exports.parisWallToUtc = parisWallToUtc;
exports.formatDateTime = formatDateTime;
exports.formatDateTimeSeconds = formatDateTimeSeconds;
exports.formatDateOnly = formatDateOnly;
exports.formatTime = formatTime;
exports.formatDateLong = formatDateLong;
exports.formatParisYmdCompact = formatParisYmdCompact;
exports.formatParisDateTimeCompact = formatParisDateTimeCompact;
exports.formatParisYmd = formatParisYmd;
exports.parisTodayYmd = parisTodayYmd;
exports.ymdToFrench = ymdToFrench;
exports.frenchDateToYmd = frenchDateToYmd;
exports.normalizeTimeHm = normalizeTimeHm;
exports.utcToParisDateTimeLocal = utcToParisDateTimeLocal;
exports.parisDateTimeLocalToUtcIso = parisDateTimeLocalToUtcIso;
exports.parisYmdHmToUtcIso = parisYmdHmToUtcIso;
exports.parisWallDateTimeLocal = parisWallDateTimeLocal;
exports.APP_TIMEZONE = 'Europe/Paris';
exports.APP_LOCALE = 'fr-FR';
function pad2(n) {
    return String(n).padStart(2, '0');
}
function parseToDate(value) {
    if (value == null || value === '')
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
const PARIS_PARTS = new Intl.DateTimeFormat('en-GB', {
    timeZone: exports.APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});
function getParisParts(date) {
    const bag = {};
    for (const part of PARIS_PARTS.formatToParts(date)) {
        if (part.type !== 'literal')
            bag[part.type] = part.value;
    }
    let hour = Number(bag.hour);
    if (hour === 24)
        hour = 0;
    return {
        year: Number(bag.year),
        month: Number(bag.month),
        day: Number(bag.day),
        hour,
        minute: Number(bag.minute),
        second: Number(bag.second),
    };
}
/** Offset of Europe/Paris vs UTC at `date`, in milliseconds (positive in winter/summer, e.g. +3600000). */
function parisOffsetMs(date) {
    const p = getParisParts(date);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - date.getTime();
}
/**
 * Interpret a Paris wall-clock civil time as an exact UTC instant (DST-safe).
 */
function parisWallToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const first = new Date(utcGuess - parisOffsetMs(new Date(utcGuess)));
    const secondPass = new Date(utcGuess - parisOffsetMs(first));
    return secondPass;
}
function formatDateTime(value) {
    const date = parseToDate(value);
    if (!date)
        return 'N/A';
    const p = getParisParts(date);
    return `${pad2(p.day)}/${pad2(p.month)}/${p.year} ${pad2(p.hour)}:${pad2(p.minute)}`;
}
function formatDateTimeSeconds(value) {
    const date = parseToDate(value);
    if (!date)
        return 'N/A';
    const p = getParisParts(date);
    return `${pad2(p.day)}/${pad2(p.month)}/${p.year} ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}
function formatDateOnly(value) {
    const date = parseToDate(value);
    if (!date)
        return 'N/A';
    const p = getParisParts(date);
    return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}
function formatTime(value) {
    const date = parseToDate(value);
    if (!date)
        return 'N/A';
    const p = getParisParts(date);
    return `${pad2(p.hour)}:${pad2(p.minute)}`;
}
function formatDateLong(value) {
    const date = parseToDate(value);
    if (!date)
        return 'N/A';
    return new Intl.DateTimeFormat(exports.APP_LOCALE, {
        timeZone: exports.APP_TIMEZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}
/** YYYYMMDD in Europe/Paris (Flux 10.3 civil date). */
function formatParisYmdCompact(value) {
    const date = parseToDate(value);
    if (!date)
        throw new Error(`Invalid date: ${String(value)}`);
    const p = getParisParts(date);
    return `${p.year}${pad2(p.month)}${pad2(p.day)}`;
}
/** YYYYMMDDHHmmss in Europe/Paris. */
function formatParisDateTimeCompact(value = new Date()) {
    const date = parseToDate(value);
    if (!date)
        throw new Error(`Invalid date: ${String(value)}`);
    const p = getParisParts(date);
    return `${p.year}${pad2(p.month)}${pad2(p.day)}${pad2(p.hour)}${pad2(p.minute)}${pad2(p.second)}`;
}
function formatParisYmd(value) {
    const date = parseToDate(value);
    if (!date)
        return '';
    const p = getParisParts(date);
    return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}
function parisTodayYmd() {
    return formatParisYmd(new Date());
}
function ymdToFrench(ymd) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m)
        return ymd;
    return `${m[3]}/${m[2]}/${m[1]}`;
}
function frenchDateToYmd(value) {
    const trimmed = value.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (iso)
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const fr = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(trimmed);
    if (!fr)
        return null;
    const day = Number(fr[1]);
    const month = Number(fr[2]);
    const year = Number(fr[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31)
        return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
}
function normalizeTimeHm(value) {
    const trimmed = value.trim().toLowerCase().replace(/h/g, ':').replace(/\s+/g, '');
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
    if (!m)
        return null;
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour > 23 || minute > 59)
        return null;
    return `${pad2(hour)}:${pad2(minute)}`;
}
/** `YYYY-MM-DDTHH:mm` in Paris wall clock (form state). */
function utcToParisDateTimeLocal(value) {
    const date = parseToDate(value);
    if (!date)
        return '';
    const p = getParisParts(date);
    return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}
function parisDateTimeLocalToUtcIso(local) {
    const trimmed = local.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
    if (!m) {
        const date = parseToDate(trimmed);
        return date ? date.toISOString() : trimmed;
    }
    return parisWallToUtc(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), m[6] ? Number(m[6]) : 0).toISOString();
}
function parisYmdHmToUtcIso(ymd, hm) {
    const date = frenchDateToYmd(ymd) || ymd;
    const time = normalizeTimeHm(hm);
    if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Date ou heure invalide');
    }
    return parisDateTimeLocalToUtcIso(`${date}T${time}`);
}
function parisWallDateTimeLocal(year, month, day, hour, minute) {
    return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`;
}
