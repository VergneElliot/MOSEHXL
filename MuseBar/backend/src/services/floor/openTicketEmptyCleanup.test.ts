import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.query },
}));

import {
  abandonAllEmptyOpenTickets,
  abandonEmptyOpenTicketsForWaiter,
  abandonOpenTicketIfEmpty,
  ticketHasActiveLines,
} from './openTicketEmptyCleanup';

describe('openTicketEmptyCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ticketHasActiveLines is true when a draft/validated row exists', async () => {
    mocks.query.mockResolvedValue({ rowCount: 1, rows: [{}] });
    await expect(ticketHasActiveLines(5, 'est-1')).resolves.toBe(true);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('open_ticket_items'),
      [5, 'est-1']
    );
  });

  it('abandonOpenTicketIfEmpty returns false when ticket still has lines', async () => {
    mocks.query.mockResolvedValueOnce({ rowCount: 1, rows: [{}] });
    await expect(abandonOpenTicketIfEmpty(5, 'est-1')).resolves.toBe(false);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it('abandonOpenTicketIfEmpty cancels empty open ticket', async () => {
    mocks.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5 }] });
    await expect(abandonOpenTicketIfEmpty(5, 'est-1')).resolves.toBe(true);
    expect(mocks.query.mock.calls[1][0]).toContain("status = 'cancelled'");
  });

  it('abandonEmptyOpenTicketsForWaiter returns cancelled count', async () => {
    mocks.query.mockResolvedValue({ rowCount: 3 });
    await expect(abandonEmptyOpenTicketsForWaiter('est-1', 9)).resolves.toBe(3);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('last_served_by_user_id'),
      ['est-1', 9]
    );
  });

  it('abandonAllEmptyOpenTickets sweeps venue shells', async () => {
    mocks.query.mockResolvedValue({ rowCount: 2 });
    await expect(abandonAllEmptyOpenTickets('est-1')).resolves.toBe(2);
    expect(mocks.query.mock.calls[0][1]).toEqual(['est-1']);
  });
});
