import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationQueries } from './invitationQueries';

describe('InvitationQueries', () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
  });

  it('getInvitationsByEstablishment filters by status and limit', async () => {
    query.mockResolvedValue({ rows: [{ email: 'a@b.com' }] });
    const rows = await InvitationQueries.getInvitationsByEstablishment({ query } as never, 'est-1', {
      status: 'pending',
      limit: 5,
      sortOrder: 'ASC',
    });
    expect(rows).toHaveLength(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('status = $2');
    expect(sql).toContain('LIMIT $3');
    expect(sql).toContain('ORDER BY created_at ASC');
    expect(params).toEqual(['est-1', 'pending', 5]);
  });

  it('getInvitationByToken returns pending non-expired invitation or null', async () => {
    query.mockResolvedValue({ rows: [{ invitation_token: 'tok', status: 'pending' }] });
    await expect(InvitationQueries.getInvitationByToken({ query } as never, 'tok')).resolves.toMatchObject({
      invitation_token: 'tok',
    });
    query.mockResolvedValue({ rows: [] });
    await expect(InvitationQueries.getInvitationByToken({ query } as never, 'gone')).resolves.toBeNull();
  });
});
