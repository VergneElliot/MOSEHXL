import { describe, expect, it } from 'vitest';
import type { OngoingOrderItemDto } from '../../services/api/floorOngoingOrders';
import {
  fulfillmentAgeLabel,
  fulfillmentLabel,
  nextFulfillmentAction,
} from './ongoingOrderFulfillmentUi';

function item(
  partial: Partial<OngoingOrderItemDto> & Pick<OngoingOrderItemDto, 'fulfillment_status'>
): OngoingOrderItemDto {
  return {
    id: 1,
    product_name: 'IPA',
    quantity: 1,
    unit_price: 5,
    total_price: 5,
    line_status: 'validated',
    kitchen_sent_at: null,
    validated_at: '2026-09-10T17:00:00.000Z',
    served_at: null,
    ...partial,
  };
}

describe('ongoingOrderFulfillmentUi', () => {
  it('labels and next actions follow Validé → Envoyé → Servi', () => {
    expect(fulfillmentLabel('validated')).toBe('Validé');
    expect(fulfillmentLabel('sent')).toBe('Envoyé');
    expect(fulfillmentLabel('served')).toBe('Servi');
    expect(nextFulfillmentAction('validated')).toEqual({
      target: 'sent',
      label: 'Marquer envoyé',
    });
    expect(nextFulfillmentAction('sent')).toEqual({
      target: 'served',
      label: 'Marquer servi',
    });
    expect(nextFulfillmentAction('served')).toBeNull();
  });

  it('ages from the timestamp of the current step', () => {
    const now = Date.parse('2026-09-10T18:00:00.000Z');
    expect(
      fulfillmentAgeLabel(
        item({
          fulfillment_status: 'validated',
          validated_at: '2026-09-10T17:30:00.000Z',
        }),
        now
      )
    ).toContain('Validé depuis');
    expect(
      fulfillmentAgeLabel(
        item({
          fulfillment_status: 'sent',
          kitchen_sent_at: '2026-09-10T17:45:00.000Z',
        }),
        now
      )
    ).toContain('Envoyé depuis');
  });
});
