import {
  createReservation,
  updateReservation,
  type ReservationDto,
} from '../../services/api/adminSpace';
import { parisDateTimeLocalToUtcIso } from '../../utils/formatDate';

export type GuestEmailDeliveryHint = {
  sent: boolean;
  to: string | null;
  error?: string;
};

/** Persist create/update; returns a guest-email warning when delivery failed. */
export async function saveReservationEdit(
  edit: Partial<ReservationDto>
): Promise<{ emailWarning: string | null }> {
  if (!edit.customer_name || !edit.starts_at || !edit.party_size) {
    throw new Error('Nom, date et nombre de personnes requis');
  }
  const startsAt = edit.starts_at.includes('T')
    ? parisDateTimeLocalToUtcIso(edit.starts_at)
    : edit.starts_at;

  if (edit.id) {
    const result = (await updateReservation(edit.id, {
      ...edit,
      starts_at: startsAt,
      status_reason: edit.status_reason ?? null,
    })) as {
      reservation: ReservationDto;
      guest_email_delivery?: GuestEmailDeliveryHint | null;
    };
    const delivery = result.guest_email_delivery;
    if (
      delivery &&
      !delivery.sent &&
      delivery.error &&
      delivery.error !== 'status_unchanged' &&
      delivery.error !== 'status_has_no_guest_mail'
    ) {
      return {
        emailWarning: `Réservation enregistrée, mais l’e-mail client n’a pas été envoyé (${delivery.error}).`,
      };
    }
    return { emailWarning: null };
  }

  await createReservation({
    customer_name: edit.customer_name,
    starts_at: startsAt,
    party_size: Number(edit.party_size),
    customer_email: edit.customer_email ?? null,
    customer_phone: edit.customer_phone ?? null,
    notes: edit.notes ?? null,
    status: edit.status || 'requested',
    status_reason: edit.status_reason ?? null,
  });
  return { emailWarning: null };
}
