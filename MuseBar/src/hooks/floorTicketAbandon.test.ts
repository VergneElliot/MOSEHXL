import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@mosehxl/types';
import type { OrderItem } from '../types';
import { abandonFloorTicket } from './floorTicketAbandon';

const abandonTicket = vi.fn();

vi.mock('../services/api/floor', () => ({
  abandonTicket: (...args: unknown[]) => abandonTicket(...args),
}));

function line(partial: Partial<OrderItem> & Pick<OrderItem, 'id'>): OrderItem {
  return {
    productId: 'p1',
    productName: 'Item',
    quantity: 1,
    unitPrice: 1,
    totalPrice: 1,
    taxRate: 0.1,
    taxAmount: 0.09,
    isHappyHourApplied: false,
    ...partial,
  };
}

describe('abandonFloorTicket', () => {
  beforeEach(() => {
    abandonTicket.mockReset().mockResolvedValue(undefined);
  });

  it('draft-only cart only needs intervention', async () => {
    const ensureIntervention = vi.fn().mockResolvedValue(undefined);
    const ensureOrdersCancel = vi.fn();
    await abandonFloorTicket({
      ticketId: 4,
      pinToken: 'tok',
      cart: [line({ id: '1', tableLineStatus: 'draft' })],
      ensureIntervention,
      ensureOrdersCancel,
    });
    expect(ensureIntervention).toHaveBeenCalledOnce();
    expect(ensureOrdersCancel).not.toHaveBeenCalled();
    expect(abandonTicket).toHaveBeenCalledWith(4, 'tok');
  });

  it('validated lines require orders_cancel step-up', async () => {
    const ensureIntervention = vi.fn().mockResolvedValue(undefined);
    const ensureOrdersCancel = vi.fn().mockResolvedValue(undefined);
    await abandonFloorTicket({
      ticketId: 9,
      pinToken: 'tok',
      cart: [line({ id: '1', tableLineStatus: 'validated' })],
      ensureIntervention,
      ensureOrdersCancel,
    });
    expect(ensureOrdersCancel).toHaveBeenCalledWith(
      PERMISSIONS.orders_cancel,
      expect.objectContaining({ title: expect.stringContaining('validés') })
    );
    expect(abandonTicket).toHaveBeenCalledWith(9, 'tok');
  });
});
