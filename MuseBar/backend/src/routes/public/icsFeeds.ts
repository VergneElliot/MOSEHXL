import express from 'express';
import { pool } from '../../db/pool';
import { runWithTenantContext } from '../../rls/tenantContext';
import { ReservationModel } from '../../models/reservation';
import { StaffShiftModel } from '../../models/staffShift';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';

const router = express.Router();

function icsEscape(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function buildCalendar(name: string, events: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MOSEHXL//Admin Space//FR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${icsEscape(name)}`,
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

router.get(
  '/reservations/:token.ics',
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || '');
    const est = await pool.query(
      `SELECT id, name FROM establishments WHERE reservations_ics_token = $1`,
      [token]
    );
    if (!est.rows[0]) throw new NotFoundError('Feed introuvable');
    const establishmentId = String(est.rows[0].id);
    const name = String(est.rows[0].name);

    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 1);
    const to = new Date();
    to.setUTCMonth(to.getUTCMonth() + 6);

    const reservations = await runWithTenantContext({ establishmentId }, () =>
      ReservationModel.list(establishmentId, {
        from: from.toISOString(),
        to: to.toISOString(),
      })
    );

    const events = reservations
      .filter((r) => r.status !== 'cancelled')
      .map((r) => {
        const end = r.ends_at || new Date(new Date(r.starts_at).getTime() + 90 * 60 * 1000).toISOString();
        return [
          'BEGIN:VEVENT',
          `UID:reservation-${r.id}@mosehxl.com`,
          `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
          `DTSTART:${toIcsUtc(r.starts_at)}`,
          `DTEND:${toIcsUtc(end)}`,
          `SUMMARY:${icsEscape(`${r.customer_name} (${r.party_size} pers.)`)}`,
          `DESCRIPTION:${icsEscape(r.notes || `Statut: ${r.status}`)}`,
          'END:VEVENT',
        ].join('\r\n');
      });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reservations-${establishmentId}.ics"`);
    return res.send(buildCalendar(`Réservations — ${name}`, events));
  })
);

router.get(
  '/planning/:token.ics',
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || '');
    const row = await pool.query(
      `SELECT t.user_id, t.establishment_id, u.first_name, u.last_name, e.name AS establishment_name
       FROM staff_planning_ics_tokens t
       JOIN users u ON u.id = t.user_id
       JOIN establishments e ON e.id = t.establishment_id
       WHERE t.token = $1`,
      [token]
    );
    if (!row.rows[0]) throw new NotFoundError('Feed introuvable');
    const establishmentId = String(row.rows[0].establishment_id);
    const userId = Number(row.rows[0].user_id);
    const person = `${row.rows[0].first_name || ''} ${row.rows[0].last_name || ''}`.trim() || `User ${userId}`;

    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 1);
    const to = new Date();
    to.setUTCMonth(to.getUTCMonth() + 3);

    const shifts = await runWithTenantContext({ establishmentId }, () =>
      StaffShiftModel.list(establishmentId, {
        from: from.toISOString(),
        to: to.toISOString(),
        userId,
      })
    );

    const events = shifts.map((s) =>
      [
        'BEGIN:VEVENT',
        `UID:shift-${s.id}@mosehxl.com`,
        `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
        `DTSTART:${toIcsUtc(s.starts_at)}`,
        `DTEND:${toIcsUtc(s.ends_at)}`,
        `SUMMARY:${icsEscape(s.label || `Service — ${person}`)}`,
        `DESCRIPTION:${icsEscape(s.note || '')}`,
        'END:VEVENT',
      ].join('\r\n')
    );

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="planning-${userId}.ics"`);
    return res.send(buildCalendar(`Planning — ${person}`, events));
  })
);

export default router;
