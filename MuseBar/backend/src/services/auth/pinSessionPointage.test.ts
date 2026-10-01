import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getOpenEntry: vi.fn(),
  getOpenEntryAnyEstablishment: vi.fn(),
  clockIn: vi.fn(),
  clockOut: vi.fn(),
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

  it('counts only tickets owned via last_served_by_user_id', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ n: 2 }] });
    await expect(countOpenTicketsForWaiter('est-1', 42)).resolves.toBe(2);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('last_served_by_user_id = $2'),
      ['est-1', 42]
    );
    const sql = String(mocks.query.mock.calls[0]?.[0] ?? '');
    expect(sql).not.toMatch(/opened_by_user_id/);
  });
});

describe('clockOutOnPinClose', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.clockOut.mockReset();
  });

  it('blocks when the waiter still owns open tables', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ n: 1 }] });
    await expect(
      clockOutOnPinClose({ establishmentId: 'est-1', userId: 7 })
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'PIN_CLOSE_OPEN_TABLES',
    } satisfies Partial<AppError>);
    expect(mocks.clockOut).not.toHaveBeenCalled();
  });

  it('clocks out when no tables are attributed to the waiter', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ n: 0 }] });
    mocks.clockOut.mockResolvedValueOnce(undefined);
    await clockOutOnPinClose({ establishmentId: 'est-1', userId: 7, ip: '1.2.3.4' });
    expect(mocks.clockOut).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      userId: 7,
      ip: '1.2.3.4',
    });
  });

  it('checks tables but skips TimeEntry when recordPointage is false', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ n: 0 }] });
    await clockOutOnPinClose({
      establishmentId: 'est-1',
      userId: 7,
      recordPointage: false,
    });
    expect(mocks.clockOut).not.toHaveBeenCalled();
  });
});
