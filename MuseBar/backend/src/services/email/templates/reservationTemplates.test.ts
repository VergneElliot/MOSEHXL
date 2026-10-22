import { describe, expect, it } from 'vitest';
import { BuiltInTemplateId } from './types';
import {
  ReservationCancelledGuestTemplate,
  ReservationCancelledVenueTemplate,
  ReservationConfirmedTemplate,
  ReservationOnHoldTemplate,
  ReservationRefusedTemplate,
  ReservationReminderVenueTemplate,
  ReservationRequestedGuestTemplate,
  ReservationRequestedVenueTemplate,
} from './reservationTemplates';

describe('reservation email templates', () => {
  it('guest requested includes relance CTA placeholders', () => {
    const t = ReservationRequestedGuestTemplate.getTemplate();
    expect(t.id).toBe(BuiltInTemplateId.RESERVATION_REQUESTED_GUEST);
    expect(t.htmlBody).toContain('{{relanceUrl}}');
    expect(t.htmlBody).toContain('Relancer l’établissement');
    expect(t.subject).toContain('{{establishmentName}}');
    expect(t.textBody).toContain('{{partySize}}');
  });

  it('venue requested and reminder expose guest contact fields', () => {
    const requested = ReservationRequestedVenueTemplate.getTemplate();
    expect(requested.htmlBody).toContain('{{customerEmail}}');
    expect(requested.htmlBody).toContain('{{guestMessage}}');

    const reminder = ReservationReminderVenueTemplate.getTemplate();
    expect(reminder.id).toBe(BuiltInTemplateId.RESERVATION_REMINDER_VENUE);
    expect(reminder.htmlBody).toContain('Relance');
    expect(reminder.subject).toContain('{{customerName}}');
  });

  it('confirmed and on-hold include cancelUrl', () => {
    const confirmed = ReservationConfirmedTemplate.getTemplate();
    expect(confirmed.htmlBody).toContain('{{cancelUrl}}');
    expect(confirmed.htmlBody).toContain('confirmée');

    const onHold = ReservationOnHoldTemplate.getTemplate();
    expect(onHold.htmlBody).toContain('en attente');
    expect(onHold.variables).toContain('cancelUrl');
  });

  it('refused and cancelled variants keep establishment comment / venue notice', () => {
    const refused = ReservationRefusedTemplate.getTemplate();
    expect(refused.htmlBody).toContain('{{commentaire}}');
    expect(refused.id).toBe(BuiltInTemplateId.RESERVATION_REFUSED);

    const cancelledGuest = ReservationCancelledGuestTemplate.getTemplate();
    expect(cancelledGuest.htmlBody).toContain('annulée');

    const cancelledVenue = ReservationCancelledVenueTemplate.getTemplate();
    expect(cancelledVenue.htmlBody).toContain('{{customerPhone}}');
    expect(cancelledVenue.subject).toContain('Annulation client');
  });
});
