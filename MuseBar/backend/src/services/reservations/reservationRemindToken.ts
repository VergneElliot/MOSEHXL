/**
 * Opaque HMAC tokens for public reservation actions (remind / cancel).
 */

import crypto from 'crypto';

export type ReservationPublicAction = 'remind' | 'cancel';

function secret(): string {
  return (
    process.env.RESERVATION_REMIND_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    'mosehxl-reservation-remind-dev'
  );
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex').slice(0, 20);
}

export function createReservationActionToken(
  reservationId: number,
  slug: string,
  action: ReservationPublicAction
): string {
  const payload = `${action}.${reservationId}.${slug.toLowerCase()}`;
  return `${action}.${reservationId}.${sign(payload)}`;
}

/** Legacy remind tokens: `{id}.{sig}` without action prefix. */
export function createReservationRemindToken(reservationId: number, slug: string): string {
  const payload = `${reservationId}.${slug.toLowerCase()}`;
  const sig = sign(payload);
  return `${reservationId}.${sig}`;
}

export function parseReservationRemindToken(
  token: string,
  expectedSlug: string
): { reservationId: number } | null {
  const parsed = parseReservationActionToken(token, expectedSlug);
  if (parsed?.action === 'remind') return { reservationId: parsed.reservationId };
  return null;
}

export function parseReservationActionToken(
  token: string,
  expectedSlug: string
): { reservationId: number; action: ReservationPublicAction } | null {
  const raw = String(token || '').trim();
  const parts = raw.split('.');

  // New format: action.id.sig
  if (parts.length === 3 && (parts[0] === 'remind' || parts[0] === 'cancel')) {
    const action = parts[0] as ReservationPublicAction;
    const reservationId = parseInt(parts[1]!, 10);
    if (!Number.isFinite(reservationId) || reservationId < 1) return null;
    const expected = createReservationActionToken(reservationId, expectedSlug, action);
    const a = Buffer.from(raw);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { reservationId, action };
  }

  // Legacy remind: id.sig
  if (parts.length === 2) {
    const reservationId = parseInt(parts[0]!, 10);
    if (!Number.isFinite(reservationId) || reservationId < 1) return null;
    const expected = createReservationRemindToken(reservationId, expectedSlug);
    const a = Buffer.from(raw);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { reservationId, action: 'remind' };
  }

  return null;
}

export const CANCEL_MIN_HOURS_BEFORE = 48;

export function canGuestCancelReservation(startsAtIso: string, now = new Date()): boolean {
  const starts = new Date(startsAtIso).getTime();
  if (Number.isNaN(starts)) return false;
  return starts - now.getTime() >= CANCEL_MIN_HOURS_BEFORE * 60 * 60 * 1000;
}
