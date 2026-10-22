import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listOngoingOrders, setTicketItemFulfillment } from './floorOngoingOrders';
import { request } from './core';

vi.mock('./core', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe('floorOngoingOrders API', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('listOngoingOrders unwraps orders and defaults to []', async () => {
    mockedRequest.mockResolvedValueOnce({
      orders: [{ ticket_id: 1, table_id: 2, table_label: 'T1', items: [] }],
    });
    await expect(listOngoingOrders()).resolves.toEqual([
      expect.objectContaining({ ticket_id: 1, table_label: 'T1' }),
    ]);

    mockedRequest.mockResolvedValueOnce({});
    await expect(listOngoingOrders()).resolves.toEqual([]);
  });

  it('setTicketItemFulfillment posts status with the PIN header', async () => {
    mockedRequest.mockResolvedValueOnce({
      item: { id: 9, fulfillment_status: 'sent', product_name: 'IPA' },
    });
    const item = await setTicketItemFulfillment(3, 9, 'sent', 'pin-tok');
    expect(item).toMatchObject({ id: 9, fulfillment_status: 'sent' });
    expect(mockedRequest).toHaveBeenCalledWith(
      '/floor/tickets/3/items/9/fulfillment',
      expect.objectContaining({
        method: 'POST',
        headers: { 'x-pin-actor-token': 'pin-tok' },
        body: JSON.stringify({ status: 'sent' }),
      })
    );
  });
});
