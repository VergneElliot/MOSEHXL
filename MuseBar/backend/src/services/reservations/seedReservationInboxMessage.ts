import { formatDateTime } from '@mosehxl/types';
import { InboxModel, type InboxMessage } from '../../models/inbox';
import { venueInboxEmail } from './venueInboxAddress';

/** Synthetic inbox row so reservations appear in Boîte mail and link for UI. */
export async function seedReservationInboxMessage(input: {
  establishmentId: string;
  establishmentSlug: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  partySize: number;
  startsAtIso: string;
  notes: string | null;
  source: 'public' | 'manual';
  reliabilityLine?: string | null;
  reservationId?: number | null;
}): Promise<InboxMessage> {
  const startsFormatted = formatDateTime(input.startsAtIso);
  const sourceLabel =
    input.source === 'public' ? 'Demande publique de réservation' : 'Réservation créée depuis l’agenda';
  const from = (input.customerEmail || '').trim() || 'manuel@local';

  return InboxModel.createMessage({
    establishment_id: input.establishmentId,
    from_address: from,
    to_address: venueInboxEmail(input.establishmentSlug),
    subject: `${sourceLabel} — ${input.customerName} — ${startsFormatted}`,
    text_body: [
      sourceLabel,
      input.reliabilityLine || null,
      `Client: ${input.customerName}`,
      `Email: ${input.customerEmail || '—'}`,
      `Téléphone: ${input.customerPhone || '—'}`,
      `Personnes: ${input.partySize}`,
      `Date: ${startsFormatted}`,
      input.notes ? `Notes: ${input.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    reservation_id: input.reservationId ?? null,
    direction: 'inbound',
  });
}
