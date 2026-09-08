import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthorizationError } from '../../middleware/errorHandler';
import { P } from '../../permissions/registry';

const listActiveItems = vi.fn();
vi.mock('../../models/database/openTicketModel', () => ({
  OpenTicketModel: {
    get: vi.fn(),
    listActiveItems: (...args: unknown[]) => listActiveItems(...args),
  },
}));

import { assertCanAbandonTicket } from './floorTicketAuth';

describe('assertCanAbandonTicket', () => {
  beforeEach(() => {
    listActiveItems.mockReset();
  });

  const actor = {
    id: 1,
    display_name: 'Alice',
    email: 'a@x',
    role: 'staff',
    permissions: [] as string[],
    establishment_id: 'est',
  };

  it('allows abandon when only drafts exist', async () => {
    listActiveItems.mockResolvedValue([{ line_status: 'draft' }]);
    await expect(assertCanAbandonTicket(9, 'est', actor)).resolves.toBeUndefined();
  });

  it('blocks abandon of validated lines without orders_cancel', async () => {
    listActiveItems.mockResolvedValue([{ line_status: 'validated' }]);
    await expect(assertCanAbandonTicket(9, 'est', actor)).rejects.toBeInstanceOf(
      AuthorizationError
    );
  });

  it('allows abandon of validated lines with orders_cancel', async () => {
    listActiveItems.mockResolvedValue([{ line_status: 'validated' }]);
    await expect(
      assertCanAbandonTicket(9, 'est', {
        ...actor,
        permissions: [P.orders_cancel],
      })
    ).resolves.toBeUndefined();
  });
});
