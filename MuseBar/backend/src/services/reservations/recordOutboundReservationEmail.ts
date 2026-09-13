import { venueInboxEmail } from './venueInboxAddress';
import { InboxModel } from '../../models/inbox';
import { Logger } from '../../utils/logger';

/** Persist a staff/system outbound copy so Boîte mail shows a conversation. */
export async function recordOutboundReservationEmail(input: {
  establishmentId: string;
  establishmentSlug: string;
  reservationId: number;
  toAddress: string;
  subject: string;
  textBody: string;
}): Promise<void> {
  try {
    await InboxModel.createMessage({
      establishment_id: input.establishmentId,
      from_address: venueInboxEmail(input.establishmentSlug),
      to_address: input.toAddress,
      subject: input.subject,
      text_body: input.textBody,
      reservation_id: input.reservationId,
      direction: 'outbound',
    });
  } catch (error) {
    Logger.getInstance().warn(
      'Failed to store outbound reservation email copy',
      {
        reservationId: input.reservationId,
        error: error instanceof Error ? error.message : String(error),
      },
      'RESERVATION_EMAIL'
    );
  }
}
