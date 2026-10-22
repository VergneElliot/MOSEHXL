import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  resolvePayrollSettings: vi.fn(),
  countLeaveDaysForPayrollWithCap: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../services/labor/payrollSettingsResolver', () => ({
  resolvePayrollSettings: mocks.resolvePayrollSettings,
}));

vi.mock('../services/labor/payrollCalculations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/labor/payrollCalculations')>();
  return {
    ...actual,
    countLeaveDaysForPayrollWithCap: mocks.countLeaveDaysForPayrollWithCap,
  };
});

import { StaffLeaveModel } from './staffLeave';

function leaveRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    establishment_id: 'est-1',
    user_id: 5,
    leave_type: 'paid_leave',
    starts_on: '2026-09-01',
    ends_on: '2026-09-03',
    half_day_start: false,
    half_day_end: true,
    status: 'pending',
    note: 'Trip',
    review_note: null,
    requested_by: 5,
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
    first_name: 'Ann',
    last_name: 'Lee',
    email: 'ann@example.com',
    ...overrides,
  };
}

describe('StaffLeaveModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list maps rows and applies filters', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [leaveRow()] });
    const rows = await StaffLeaveModel.list('est-1', {
      from: '2026-09-01',
      to: '2026-09-30',
      userId: 5,
      status: 'pending',
    });
    expect(rows[0]).toMatchObject({
      id: 1,
      ends_on: '2026-09-03',
      half_day_end: true,
      email: 'ann@example.com',
    });
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('slr.status ='),
      expect.arrayContaining(['est-1', '2026-09-01', '2026-09-30', 5, 'pending'])
    );
  });

  it('getById returns null when missing', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    await expect(StaffLeaveModel.getById('est-1', 9)).resolves.toBeNull();
  });

  it('create inserts and maps the returned row', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [leaveRow({ status: 'pending' })] });
    const created = await StaffLeaveModel.create({
      establishment_id: 'est-1',
      user_id: 5,
      leave_type: 'rtt',
      starts_on: '2026-09-01',
      ends_on: '2026-09-01',
      requested_by: 5,
      note: '  ',
    });
    expect(created.user_id).toBe(5);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO staff_leave_requests'),
      expect.arrayContaining(['est-1', 5, 'rtt'])
    );
  });

  it('updateStatus and listApprovedForRange', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({
        rows: [leaveRow({ status: 'approved', reviewed_by: 2, reviewed_at: '2026-08-02T00:00:00Z' })],
      })
      .mockResolvedValueOnce({ rows: [leaveRow({ status: 'approved' })] });

    const updated = await StaffLeaveModel.updateStatus('est-1', 1, {
      status: 'approved',
      reviewed_by: 2,
      review_note: 'ok',
    });
    expect(updated?.status).toBe('approved');

    const approved = await StaffLeaveModel.listApprovedForRange(
      'est-1',
      '2026-09-01',
      '2026-09-30'
    );
    expect(approved).toHaveLength(1);
  });

  it('upsertEntitlement writes defaults', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    await StaffLeaveModel.upsertEntitlement({
      establishment_id: 'est-1',
      user_id: 5,
      year: 2026,
    });
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('staff_leave_entitlements'),
      ['est-1', 5, 2026, 25, 0]
    );
  });

  it('getBalances aggregates used CP/RTT with payroll counting', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({
        rows: [{ id: 5, first_name: 'Ann', last_name: 'Lee', email: 'a@b.c' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_id: 5, paid_leave_days: 25, rtt_days: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [
          leaveRow({ leave_type: 'paid_leave', status: 'approved', user_id: 5 }),
          leaveRow({ id: 2, leave_type: 'rtt', status: 'approved', user_id: 5 }),
        ],
      });
    mocks.resolvePayrollSettings.mockResolvedValue({});
    mocks.countLeaveDaysForPayrollWithCap
      .mockReturnValueOnce({ counted_days: 3 })
      .mockReturnValueOnce({ counted_days: 1 });

    const balances = await StaffLeaveModel.getBalances('est-1', 2026);
    expect(balances).toEqual([
      expect.objectContaining({
        user_id: 5,
        used_paid_leave: 3,
        used_rtt: 1,
        remaining_paid_leave: 22,
        remaining_rtt: 1,
      }),
    ]);
  });
});
