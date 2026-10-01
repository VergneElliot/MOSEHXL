/**
 * Create a public reservation + inbox seed. Guest message never lands in notes.
 */

import { formatDateOnly } from '@mosehxl/types';
import { runWithTenantContext } from '../../rls/tenantContext';
import { ReservationModel, type Reservation } from '../../models/reservation';
import {
  OpeningHoursSettingsModel,
  isBookableSlot,
} from '../../models/openingHoursSettings';
import { ReservationClosedDatesModel, toDateKey } from '../../models/reservationClosedDates';
import { InboxModel } from '../../models/inbox';
import { GuestNoShowFlagModel } from '../../models/guestNoShowFlag';
import { ValidationError } from '../../middleware/errorHandler';
import { seedReservationInboxMessage } from './seedReservationInboxMessage';
import { notifyReservationRequested } from './reservationEmailService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicEstablishmentRef = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  timezone: string | null;
};

export async function createPublicReservationBooking(input: {
  establishment: PublicEstablishmentRef;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  startsAtRaw: string;
  guestMessage: string | null;
}): Promise<{
  reservation: Reservation;
  inboxMessageId: number;
}> {
  const {
    establishment: est,
    customerName,
    customerEmail,
    customerPhone,
    partySize,
    startsAtRaw,
    guestMessage,
  } = input;

  if (!customerName || customerName.length < 2) {
    throw new ValidationError('Nom requis');
  }
  if (!EMAIL_RE.test(customerEmail)) {
    throw new ValidationError('Email invalide');
  }
  if (!customerPhone || customerPhone.length < 6) {
    throw new ValidationError('Téléphone requis');
  }
  if (!Number.isFinite(partySize) || partySize < 1 || partySize > 200) {
    throw new ValidationError('Nombre de personnes invalide');
  }
  if (!startsAtRaw) throw new ValidationError('Date/heure requise');

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    throw new ValidationError('Date/heure invalide');
  }
  if (startsAt.getTime() < Date.now() - 5 * 60 * 1000) {
    throw new ValidationError('La date doit être dans le futur');
  }

  const hours = await runWithTenantContext({ establishmentId: est.id }, () =>
    OpeningHoursSettingsModel.get(est.id)
  );
  const closedDates = await runWithTenantContext({ establishmentId: est.id }, () =>
    ReservationClosedDatesModel.get(est.id)
  );
  const timezone = hours.timezone || est.timezone || 'Europe/Paris';
  const slot = isBookableSlot(startsAt, hours, timezone, closedDates.dates);
  if (!slot.ok) {
    throw new ValidationError(slot.reason || 'Créneau non disponible');
  }
  const dateKey = toDateKey(startsAt, timezone);
  if (closedDates.dates.includes(dateKey)) {
    throw new ValidationError('Les réservations sont fermées pour cette date');
  }

  const reliability = await GuestNoShowFlagModel.lookup(customerEmail, customerPhone);
  const startsIso = startsAt.toISOString();

  const { reservation, inboxMessageId } = await runWithTenantContext(
    { establishmentId: est.id },
    async () => {
      const inbox = await seedReservationInboxMessage({
        establishmentId: est.id,
        establishmentSlug: est.slug,
        customerName,
        customerEmail,
        customerPhone,
        partySize,
        startsAtIso: startsIso,
        notes: guestMessage,
        source: 'public',
        reliabilityLine: reliability.flagged
          ? `⚠ ALERTE NO-SHOW : ce contact a déjà été signalé (${reliability.flag_count}×, dernier : ${reliability.last_flagged_at ? formatDateOnly(reliability.last_flagged_at) : '—'})`
          : null,
      });

      const created = await ReservationModel.create({
        establishment_id: est.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        party_size: partySize,
        starts_at: startsIso,
        status: 'requested',
        notes: null,
        source: 'public',
        inbox_message_id: inbox.id,
      });

      await InboxModel.linkReservation(est.id, inbox.id, created.id);
      return { reservation: created, inboxMessageId: inbox.id };
    }
  );

  void notifyReservationRequested({
    reservation,
    establishmentName: est.name,
    establishmentSlug: est.slug,
    venueEmail: est.email,
    timezone,
    guestMessage,
  });

  return { reservation, inboxMessageId };
}
