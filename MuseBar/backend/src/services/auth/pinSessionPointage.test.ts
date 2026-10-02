import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getOpenEntry: vi.fn(),
  getOpenEntryAnyEstablishment: vi.fn(),
  clockIn: vi.fn(),
  clockOut: vi.fn(),
  abandonEmptyOpenTicketsForWaiter: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.query },
}));

vi.mock('../../models/timeEntry', () => ({
  TimeEntryModel: {
    getOpenEntry: mocks.getOpenEntry,
    getOpenEntryAnyEstablishment: mocks.getOpenEntryAnyEstablishment,
    clockIn: mocks.clockIn,
    clockOut: mocks.clockOut,
  },
}));

vi.mock('../floor/openTicketEmptyCleanup', () => ({
  abandonEmptyOpenTicketsForWaiter: mocks.abandonEmptyOpenTicketsForWaiter,
}));

vi.mock('../../utils/logger', () => ({
  Logger: { getInstance: () => ({ error: vi.fn() }) },
}));

import {
  clockOutOnPinClose,
  countOpenTicketsForWaiter,
} from './pinSessionPointage';
import { AppError } from '../../middleware/errorHandler';

describe('countOpenTicketsForWaiter', () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it('counts only tickets owned via last_served_by_user_id with active lines', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ n: 2 }] });
    await expect(countOpenTicketsForWaiter('est-1', 42)).resolves.toBe(2);
    const sql = String(mocks.query.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/last_served_by_user_id = \$2/);
    expect(sql).toMatch(/line_status IN \('draft', 'validated'\)/);
    expect(sql).not.toMatch(/opened_by_user_id/);
  });
});

describe('clockOutOnPinClose', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.clockOut.mockReset();
    mocks.abandonEmptyOpenTicketsForWaiter.mockReset();
    mocks.abandonEmptyOpenTicketsForWaiter.mockResolvedValue(0);
  });

  it('purges empty shells then blocks when owned tables still have items', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ label: '12' }] });
    await expect(
      clockOutOnPinClose({ establishmentId: 'est-1', userId: 7 })
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'PIN_CLOSE_OPEN_TABLES',
    } satisfies Partial<AppError>);
    expect(mocks.abandonEmptyOpenTicketsForWaiter).toHaveBeenCalledWith('est-1', 7);
    expect(mocks.clockOut).not.toHaveBeenCalled();
  });

  it('clocks out when no active owned tables remain after purge', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    mocks.clockOut.mockResolvedValueOnce(undefined);
    await clockOutOnPinClose({ establishmentId: 'est-1', userId: 7, ip: '1.2.3.4' });
    expect(mocks.abandonEmptyOpenTicketsForWaiter).toHaveBeenCalledWith('est-1', 7);
    expect(mocks.clockOut).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      userId: 7,
      ip: '1.2.3.4',
    });
  });

  it('checks tables but skips TimeEntry when recordPointage is false', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    await clockOutOnPinClose({
      establishmentId: 'est-1',
      userId: 7,
      recordPointage: false,
    });
    expect(mocks.clockOut).not.toHaveBeenCalled();
  });
});
