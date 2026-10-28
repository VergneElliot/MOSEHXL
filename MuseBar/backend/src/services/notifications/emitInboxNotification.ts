import { NotificationModel } from '../../models/notifications';
import { NOTIFICATION_TYPES } from './notificationTypes';
import { P } from '../../permissions/registry';

/** Emit after a new inbound inbox row (email or reservation seed). */
export async function emitInboxNotification(input: {
  establishmentId: string;
  messageId: number | string;
  subject: string;
  reservationId?: number | null;
}): Promise<number | null> {
  const isReservation = input.reservationId != null;
  return NotificationModel.emit({
    establishmentId: input.establishmentId,
    type: isReservation
      ? NOTIFICATION_TYPES.reservation_request
      : NOTIFICATION_TYPES.inbox_message,
    title: isReservation ? 'Nouvelle demande de réservation' : 'Nouveau message reçu',
    body: input.subject || '(sans objet)',
    permissionKey: isReservation ? P.access_reservations : P.access_inbox,
    audience: 'permission',
    payload: {
      inbox_message_id: input.messageId,
      reservation_id: input.reservationId ?? null,
      href: isReservation ? 'admin:reservations' : 'admin:inbox',
    },
    dedupeKey: `inbox:${input.messageId}`,
  });
}
