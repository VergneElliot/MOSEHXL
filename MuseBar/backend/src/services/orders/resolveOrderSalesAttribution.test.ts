import { describe, expect, it } from 'vitest';
import { resolveOrderSalesAttribution } from './resolveOrderSalesAttribution';

describe('resolveOrderSalesAttribution', () => {
  it('attributes PIN comptoir to the PIN identity', () => {
    expect(
      resolveOrderSalesAttribution({
        tableLabel: null,
        bodyWaiterUserId: 99,
        bodyWaiterDisplayName: 'Ignored',
        pinActor: { id: 7, display_name: 'Alice' },
      })
    ).toEqual({
      table_label: null,
      waiter_user_id: 7,
      waiter_display_name: 'Alice',
    });
  });

  it('leaves no-PIN comptoir unattributed (Total comptoir)', () => {
    expect(
      resolveOrderSalesAttribution({
        tableLabel: null,
        bodyWaiterUserId: 99,
        bodyWaiterDisplayName: 'Ignored',
        pinActor: null,
      })
    ).toEqual({
      table_label: null,
      waiter_user_id: null,
      waiter_display_name: null,
    });
  });

  it('keeps table body owner snapshot', () => {
    expect(
      resolveOrderSalesAttribution({
        tableLabel: 'T12',
        bodyWaiterUserId: 3,
        bodyWaiterDisplayName: 'Bob',
        pinActor: { id: 7, display_name: 'Alice' },
      })
    ).toEqual({
      table_label: 'T12',
      waiter_user_id: 3,
      waiter_display_name: 'Bob',
    });
  });
});
