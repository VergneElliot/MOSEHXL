import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const query = vi.fn();
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }));
  return { query, release, connect };
});

vi.mock('../../db/pool', () => ({
  pool: { connect: mocks.connect },
}));

import { advanceTicketLineFulfillment } from './advanceTicketLineFulfillment';

describe('advanceTicketLineFulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
  });

  it('throws NOT_FOUND when ticket missing', async () => {
    mocks.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(
      advanceTicketLineFulfillment({
        ticketId: 1,
        itemId: 2,
        establishmentId: 'est-1',
        target: 'sent',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mocks.release).toHaveBeenCalled();
  });

  it('throws VALIDATION when item is not validated', async () => {
    mocks.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 2, line_status: 'draft', validated_at: null, kitchen_sent_at: null }],
      })
      .mockResolvedValueOnce(undefined);

    await expect(
      advanceTicketLineFulfillment({
        ticketId: 1,
        itemId: 2,
        establishmentId: 'est-1',
        target: 'sent',
      })
    ).rejects.toMatchObject({ code: 'VALIDATION', message: 'ITEM_NOT_VALIDATED' });
  });

  it('sets kitchen_sent_at when advancing to sent', async () => {
    const row = {
      id: 2,
      line_status: 'validated',
      validated_at: new Date(),
      kitchen_sent_at: null,
      served_at: null,
    };
    const updated = { ...row, kitchen_sent_at: new Date() };
    mocks.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [row] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [updated] }) // UPDATE item
      .mockResolvedValueOnce(undefined) // touch ticket
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await advanceTicketLineFulfillment({
      ticketId: 1,
      itemId: 2,
      establishmentId: 'est-1',
      target: 'sent',
    });
    expect(result).toEqual(updated);
    expect(mocks.query.mock.calls.some((c) => String(c[0]).includes('kitchen_sent_at'))).toBe(
      true
    );
  });

  it('idempotently returns row already sent', async () => {
    const row = {
      id: 2,
      line_status: 'validated',
      validated_at: new Date(),
      kitchen_sent_at: new Date(),
      served_at: null,
    };
    mocks.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [row] })
      .mockResolvedValueOnce(undefined); // COMMIT

    await expect(
      advanceTicketLineFulfillment({
        ticketId: 1,
        itemId: 2,
        establishmentId: 'est-1',
        target: 'sent',
      })
    ).resolves.toEqual(row);
  });
});
