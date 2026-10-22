import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOpenForTable: vi.fn(),
  listActiveItems: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../../models/database/openTicketModel', () => ({
  OpenTicketModel: {
    getOpenForTable: mocks.getOpenForTable,
    listActiveItems: mocks.listActiveItems,
    create: mocks.create,
  },
}));

import { ConflictError } from '../../middleware/errorHandler';
import { openOrReuseEmptyTicket } from './openTicketOpenService';

describe('openOrReuseEmptyTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reuses an empty open ticket without creating', async () => {
    mocks.getOpenForTable.mockResolvedValue({ id: 10, dining_table_id: 1 });
    mocks.listActiveItems.mockResolvedValue([]);
    const result = await openOrReuseEmptyTicket('est-1', {
      dining_table_id: 1,
      opened_by_user_id: 2,
    });
    expect(result).toEqual({
      ticket: { id: 10, dining_table_id: 1 },
      items: [],
      created: false,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects when existing ticket has active items', async () => {
    mocks.getOpenForTable.mockResolvedValue({ id: 10 });
    mocks.listActiveItems.mockResolvedValue([{ id: 1 }]);
    await expect(
      openOrReuseEmptyTicket('est-1', { dining_table_id: 1, opened_by_user_id: 2 })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('creates a new ticket when none open', async () => {
    mocks.getOpenForTable.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 99, dining_table_id: 3 });
    const result = await openOrReuseEmptyTicket('est-1', {
      dining_table_id: 3,
      opened_by_user_id: 4,
      covers: 2,
    });
    expect(result.created).toBe(true);
    expect(result.ticket.id).toBe(99);
  });

  it('maps unique open-per-table constraint to ConflictError', async () => {
    mocks.getOpenForTable.mockResolvedValue(null);
    mocks.create.mockRejectedValue(new Error('duplicate key idx_open_tickets_one_open_per_table'));
    await expect(
      openOrReuseEmptyTicket('est-1', { dining_table_id: 1, opened_by_user_id: 2 })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
