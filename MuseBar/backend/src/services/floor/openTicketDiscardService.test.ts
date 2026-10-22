import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  discardDraftItems: vi.fn(),
  get: vi.fn(),
  abandonOpenTicketIfEmpty: vi.fn(),
}));

vi.mock('../../models/database/openTicketModel', () => ({
  OpenTicketModel: {
    discardDraftItems: mocks.discardDraftItems,
    get: mocks.get,
  },
}));

vi.mock('./openTicketEmptyCleanup', () => ({
  abandonOpenTicketIfEmpty: mocks.abandonOpenTicketIfEmpty,
}));

import {
  abandonTicketIfNoActiveLines,
  discardDraftsClosingIfEmpty,
} from './openTicketDiscardService';

describe('openTicketDiscardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abandons ticket when all drafts discarded', async () => {
    mocks.discardDraftItems.mockResolvedValue([]);
    mocks.abandonOpenTicketIfEmpty.mockResolvedValue(true);
    mocks.get.mockResolvedValue({ id: 5, status: 'cancelled' });

    const result = await discardDraftsClosingIfEmpty(5, 'est-1');
    expect(mocks.abandonOpenTicketIfEmpty).toHaveBeenCalledWith(5, 'est-1');
    expect(result.items).toEqual([]);
    expect(result.ticket?.status).toBe('cancelled');
  });

  it('keeps ticket open when validated items remain', async () => {
    mocks.discardDraftItems.mockResolvedValue([{ id: 1, line_status: 'validated' }]);
    mocks.get.mockResolvedValue({ id: 5, status: 'open' });

    const result = await discardDraftsClosingIfEmpty(5, 'est-1');
    expect(mocks.abandonOpenTicketIfEmpty).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
  });

  it('abandonTicketIfNoActiveLines delegates to cleanup', async () => {
    mocks.abandonOpenTicketIfEmpty.mockResolvedValue(false);
    await expect(abandonTicketIfNoActiveLines(8, 'est-1')).resolves.toBe(false);
  });
});
