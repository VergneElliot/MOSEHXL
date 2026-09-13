import { describe, expect, it } from 'vitest';
import { resolveFulfillmentStatus, fulfillmentLabelFr } from './ticketLineFulfillment';
import { countByFulfillment } from './advanceTicketLineFulfillment';

describe('ticketLineFulfillment', () => {
  it('resolves Validé → Envoyé → Servi from timestamps', () => {
    expect(
      resolveFulfillmentStatus({
        line_status: 'draft',
        validated_at: null,
        kitchen_sent_at: null,
        served_at: null,
      })
    ).toBe('draft');

    expect(
      resolveFulfillmentStatus({
        line_status: 'validated',
        validated_at: new Date(),
        kitchen_sent_at: null,
        served_at: null,
      })
    ).toBe('validated');

    expect(
      resolveFulfillmentStatus({
        line_status: 'validated',
        validated_at: new Date(),
        kitchen_sent_at: new Date(),
        served_at: null,
      })
    ).toBe('sent');

    expect(
      resolveFulfillmentStatus({
        line_status: 'validated',
        validated_at: new Date(),
        kitchen_sent_at: new Date(),
        served_at: new Date(),
      })
    ).toBe('served');
  });

  it('labels statuses in French', () => {
    expect(fulfillmentLabelFr('validated')).toBe('Validé');
    expect(fulfillmentLabelFr('sent')).toBe('Envoyé');
    expect(fulfillmentLabelFr('served')).toBe('Servi');
  });

  it('counts by fulfillment stage', () => {
    expect(
      countByFulfillment([
        {
          line_status: 'validated',
          validated_at: new Date(),
          kitchen_sent_at: null,
          served_at: null,
        },
        {
          line_status: 'validated',
          validated_at: new Date(),
          kitchen_sent_at: new Date(),
          served_at: null,
        },
        {
          line_status: 'validated',
          validated_at: new Date(),
          kitchen_sent_at: new Date(),
          served_at: new Date(),
        },
        {
          line_status: 'draft',
          validated_at: null,
          kitchen_sent_at: null,
          served_at: null,
        },
      ])
    ).toEqual({ validated: 1, sent: 1, served: 1 });
  });
});
