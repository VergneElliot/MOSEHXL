import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

import { OrderItemModel, OrderModel, SubBillModel } from './orderModel';

describe('OrderModel', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('getAll / countAll apply waiter and search filters', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    await OrderModel.getAll('est-1', {
      waiterUserId: 7,
      search: '12',
      limit: 10,
      offset: 5,
    });
    const [sql, values] = mocks.poolQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('waiter_user_id');
    expect(sql).toContain('LIMIT');
    expect(sql).toContain('OFFSET');
    expect(values[0]).toBe('est-1');
    expect(values).toContain(7);
    expect(values).toContain(10);
    expect(values).toContain(5);

    mocks.poolQuery.mockResolvedValue({ rows: [{ total: 3 }] });
    await expect(OrderModel.countAll('est-1', { search: 'café' })).resolves.toBe(3);
  });

  it('listWaitersWithSales / getById / create / delete', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ waiter_user_id: 1, waiter_display_name: 'Ada' }] })
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({ rows: [{ id: 10, total_amount: 5 }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(OrderModel.listWaitersWithSales('est-1')).resolves.toEqual([
      { waiter_user_id: 1, waiter_display_name: 'Ada' },
    ]);
    await expect(OrderModel.getById(9, 'est-1')).resolves.toEqual({ id: 9 });
    await expect(
      OrderModel.create(
        {
          total_amount: 5,
          total_tax: 1,
          payment_method: 'card',
          status: 'completed',
        } as never,
        'est-1'
      )
    ).resolves.toMatchObject({ id: 10 });
    await expect(OrderModel.delete(10, 'est-1')).resolves.toBe(true);
  });

  it('update only allows whitelisted columns', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await OrderModel.update(1, { status: 'completed', establishment_id: 'hack' } as never, 'est-1');
    const [sql] = mocks.poolQuery.mock.calls[0] as [string];
    expect(sql).toMatch(/SET status = \$3/);
    expect(sql).not.toMatch(/SET[^W]*establishment_id/);

    mocks.poolQuery.mockClear();
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    await OrderModel.update(1, { evil: true } as never, 'est-1');
    expect(mocks.poolQuery.mock.calls[0][0]).toContain('SELECT * FROM orders');
  });
});

describe('OrderItemModel / SubBillModel', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('getByOrderId scopes through parent order', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 1, product_name: 'Café' }] });
    const items = await OrderItemModel.getByOrderId(5, 'est-1');
    expect(items).toHaveLength(1);
    expect(mocks.poolQuery.mock.calls[0][0]).toContain('establishment_id');
  });

  it('SubBillModel.getByOrderId returns rows', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 2 }] });
    await expect(SubBillModel.getByOrderId(5, 'est-1')).resolves.toEqual([{ id: 2 }]);
  });
});
