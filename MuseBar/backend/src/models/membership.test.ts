import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
    connect: mocks.poolConnect,
  },
}));

import { MembershipModel } from './membership';

describe('MembershipModel', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.poolConnect.mockReset();
  });

  it('toApiList maps memberships for the client', () => {
    expect(
      MembershipModel.toApiList([
        {
          user_id: 1,
          establishment_id: 'e1',
          role: 'staff',
          is_active: true,
          calendar_color: '#aabbcc',
          establishment_name: 'Bar',
        },
      ])
    ).toEqual([
      {
        establishment_id: 'e1',
        name: 'Bar',
        role: 'staff',
        calendar_color: '#aabbcc',
      },
    ]);
  });

  it('availableColorsForUser delegates to calendar color helpers', () => {
    const colors = MembershipModel.availableColorsForUser(['#1565C0'], '#2E7D32');
    expect(Array.isArray(colors)).toBe(true);
    expect(colors).toContain('#2E7D32');
  });

  it('listUsedCalendarColors and allocateCalendarColor use the pool', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ calendar_color: '#aabbcc' }, { calendar_color: 'bad' }],
    });
    const used = await MembershipModel.listUsedCalendarColors('est-1', 9);
    expect(used).toEqual(['#AABBCC']);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('user_id <>'),
      ['est-1', 9]
    );

    const color = await MembershipModel.allocateCalendarColor('est-1');
    expect(typeof color).toBe('string');
    expect(color.startsWith('#')).toBe(true);
  });

  it('get / listForUser / resolveActive read memberships', async () => {
    const row = {
      user_id: 1,
      establishment_id: 'est-1',
      role: 'staff',
      is_active: true,
      calendar_color: '#112233',
      establishment_name: 'Bar',
    };
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] });

    await expect(MembershipModel.get(1, 'est-1')).resolves.toEqual(row);
    await expect(MembershipModel.listForUser(1)).resolves.toEqual([row]);
    await expect(MembershipModel.resolveActive(1, 'missing')).resolves.toEqual(row);
  });

  it('setCalendarColor rejects invalid or taken colors', async () => {
    await expect(MembershipModel.setCalendarColor(1, 'est-1', 'nope')).rejects.toMatchObject({
      code: 'INVALID_COLOR',
    });

    mocks.poolQuery.mockResolvedValue({ rows: [{ calendar_color: '#aabbcc' }] });
    await expect(MembershipModel.setCalendarColor(1, 'est-1', '#aabbcc')).rejects.toMatchObject({
      code: 'COLOR_TAKEN',
    });
  });

  it('setCalendarColor updates when color is free', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [] }) // used colors
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 1,
            establishment_id: 'est-1',
            role: 'staff',
            is_active: true,
            calendar_color: '#112233',
          },
        ],
      });

    const updated = await MembershipModel.setCalendarColor(1, 'est-1', '#112233');
    expect(updated.calendar_color).toBe('#112233');
  });

  it('setActiveEstablishment updates the user row', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    await MembershipModel.setActiveEstablishment(3, 'est-1', 'staff');
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users'),
      [3, 'est-1', 'staff']
    );
  });

  it('listUsersForEstablishment can include inactive members', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: 1, email: 'a@b.c', is_active: false }],
    });
    const users = await MembershipModel.listUsersForEstablishment('est-1', {
      includeInactive: true,
    });
    expect(users).toHaveLength(1);
    expect(mocks.poolQuery.mock.calls[0]![0]).not.toContain('AND m.is_active = TRUE');
  });
});
