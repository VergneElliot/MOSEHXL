import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getByOrderItemIds: vi.fn(),
}));

vi.mock('../../models/database/orderItemOptionModel', () => ({
  OrderItemOptionModel: { getByOrderItemIds: mocks.getByOrderItemIds },
}));

import { attachOptionsToOrderItems } from './orderItemOptionsService';

describe('attachOptionsToOrderItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array without querying when no items', async () => {
    await expect(attachOptionsToOrderItems([], 'est-1')).resolves.toEqual([]);
    expect(mocks.getByOrderItemIds).not.toHaveBeenCalled();
  });

  it('attaches options map per item id', async () => {
    const optionsMap = new Map([
      [1, [{ id: 10, option_name: 'Sans sucre' }]],
    ]);
    mocks.getByOrderItemIds.mockResolvedValue(optionsMap);
    const items = [
      { id: 1, product_name: 'Café' },
      { id: 2, product_name: 'Thé' },
    ] as never[];

    const result = await attachOptionsToOrderItems(items, 'est-1');
    expect(mocks.getByOrderItemIds).toHaveBeenCalledWith([1, 2], 'est-1');
    expect(result[0].options).toEqual([{ id: 10, option_name: 'Sans sucre' }]);
    expect(result[1].options).toEqual([]);
  });
});
