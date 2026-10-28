/**
 * Once per Paris calendar day per establishment: in-app digest of today's reservations.
 */

import { pool } from '../../db/pool';
import { runWithTenantContext } from '../../rls/tenantContext';
import { NotificationModel } from '../../models/notifications';
import { NOTIFICATION_TYPES } from './notificationTypes';
import { P } from '../../permissions/registry';
import { Logger } from '../../utils/logger';

function parisYmd(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export async function emitReservationDayDigests(): Promise<number> {
  const ymd = parisYmd();
  let emitted = 0;
  const establishments = await pool.query(`SELECT id, name FROM establishments`);
  for (const est of establishments.rows as Array<{ id: string; name: string }>) {
    try {
      await runWithTenantContext({ establishmentId: est.id }, async () => {
        const countResult = await pool.query(
          `SELECT COUNT(*)::int AS c
           FROM reservations
           WHERE establishment_id = $1
             AND status NOT IN ('cancelled', 'no_show', 'rejected')
             AND (starts_at AT TIME ZONE 'Europe/Paris')::date = $2::date`,
          [est.id, ymd]
        );
        const count = Number((countResult.rows[0] as { c: number } | undefined)?.c ?? 0);
        if (count <= 0) return;

        const id = await NotificationModel.emit({
          establishmentId: est.id,
          type: NOTIFICATION_TYPES.reservation_day,
          title: `Réservations du jour (${count})`,
          body: `${count} réservation${count > 1 ? 's' : ''} prévue${count > 1 ? 's' : ''} aujourd’hui.`,
          permissionKey: P.access_reservations,
          audience: 'permission',
          payload: { date: ymd, count, href: 'admin:reservations' },
          dedupeKey: `reservation_day:${ymd}`,
        });
        if (id != null) emitted += 1;
      });
    } catch (error) {
      Logger.getInstance().error(
        'reservation day digest failed',
        error instanceof Error ? error : new Error(String(error)),
        'NOTIFICATIONS'
      );
    }
  }
  return emitted;
}

export class ReservationDayNotificationScheduler {
  private static interval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.runOnce();
    this.interval = setInterval(() => {
      void this.runOnce();
    }, 60 * 60 * 1000);
  }

  static stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.isRunning = false;
  }

  static async runOnce() {
    try {
      await emitReservationDayDigests();
    } catch (error) {
      Logger.getInstance().error(
        'ReservationDayNotificationScheduler failed',
        error instanceof Error ? error : new Error(String(error)),
        'NOTIFICATIONS'
      );
    }
  }
}
