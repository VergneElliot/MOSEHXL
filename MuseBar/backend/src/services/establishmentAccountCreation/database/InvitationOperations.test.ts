import { describe, expect, it, vi } from 'vitest';
import { InvitationOperations } from './InvitationOperations';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('InvitationOperations', () => {
  it('completeInvitation updates invitation and writes audit', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'inv-1',
              invitation_token: 'tokentokentoken',
              establishment_id: 'est-1',
              email: 'a@b.com',
              accepted_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const ops = new InvitationOperations(logger() as never);
    const result = await ops.completeInvitation(
      client as never,
      { token: 'tokentokentoken', establishmentId: 'est-1', userEmail: 'a@b.com' },
      '7',
      '1.2.3.4',
      'vitest'
    );
    expect(result.id).toBe('inv-1');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('completeInvitation throws when invitation missing', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const ops = new InvitationOperations(logger() as never);
    await expect(
      ops.completeInvitation(
        client as never,
        { token: 'missingtokenxx', establishmentId: 'est-1', userEmail: 'a@b.com' },
        '7'
      )
    ).rejects.toThrow(/not found/);
  });

  it('validateInvitationCompletionData checks required fields', () => {
    const ops = new InvitationOperations(logger() as never);
    expect(
      ops.validateInvitationCompletionData({
        token: 'tok',
        establishmentId: 'e',
        userEmail: 'a@b.com',
      }).isValid
    ).toBe(true);
    expect(
      ops.validateInvitationCompletionData({
        token: '',
        establishmentId: 'e',
        userEmail: 'a@b.com',
      }).error
    ).toMatch(/token/i);
    expect(
      ops.validateInvitationCompletionData({
        token: 'tok',
        establishmentId: 'e',
        userEmail: 'bad',
      }).error
    ).toMatch(/email/i);
  });

  it('checkInvitationStatus reports missing and valid pending', async () => {
    const ops = new InvitationOperations(logger() as never);
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await expect(ops.checkInvitationStatus(client as never, 'gone')).resolves.toMatchObject({
      exists: false,
    });

    client.query.mockResolvedValue({
      rows: [
        {
          id: '1',
          invitation_token: 'tok',
          establishment_id: 'est-1',
          email: 'a@b.com',
          status: 'pending',
          expires_at: new Date(Date.now() + 86400000),
        },
      ],
    });
    await expect(ops.checkInvitationStatus(client as never, 'tok')).resolves.toMatchObject({
      exists: true,
      isValid: true,
      status: 'pending',
    });
  });
});
