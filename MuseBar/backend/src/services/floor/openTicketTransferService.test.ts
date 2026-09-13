import { describe, expect, it, vi, beforeEach } from 'vitest';

const { connect, query, release, ticketHasActiveLines, abandonOpenTicketIfEmpty } = vi.hoisted(
  () => {
    const queryFn = vi.fn();
    const releaseFn = vi.fn();
    const connectFn = vi.fn(async () => ({ query: queryFn, release: releaseFn }));
    return {
      connect: connectFn,
      query: queryFn,
      release: releaseFn,
      ticketHasActiveLines: vi.fn(),
      abandonOpenTicketIfEmpty: vi.fn(),
    };
  }
);

vi.mock('../../db/pool', () => ({
  pool: { connect, query },
}));

vi.mock('./openTicketEmptyCleanup', () => ({
  ticketHasActiveLines,
  abandonOpenTicketIfEmpty,
}));

import { transferOpenTicketToTable } from './openTicketTransferService';

describe('transferOpenTicketToTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connect.mockResolvedValue({ query, release });
  });

  it('cancels empty target shell then moves the ticket', async () => {
    ticketHasActiveLines.mockResolvedValue(false);
    abandonOpenTicketIfEmpty.mockResolvedValue(true);

    query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 10, dining_table_id: 1 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 99 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 10, dining_table_id: 2 }],
      })
      .mockResolvedValueOnce(undefined);

    const ticket = await transferOpenTicketToTable(10, 'est-1', 2);
    expect(ticket.dining_table_id).toBe(2);
    expect(abandonOpenTicketIfEmpty).toHaveBeenCalledWith(99, 'est-1', expect.anything());
  });

  it('rejects when target has active lines', async () => {
    ticketHasActiveLines.mockResolvedValue(true);

    query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 99 }] })
      .mockResolvedValueOnce(undefined);

    await expect(transferOpenTicketToTable(10, 'est-1', 2)).rejects.toThrow(
      'TARGET_TABLE_OCCUPIED'
    );
    expect(abandonOpenTicketIfEmpty).not.toHaveBeenCalled();
  });
});
