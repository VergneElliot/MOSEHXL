import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolvePayrollSettings: vi.fn(),
  listUsers: vi.fn(),
  totalsByUser: vi.fn(),
  listLeaves: vi.fn(),
}));

vi.mock('./payrollSettingsResolver', () => ({
  resolvePayrollSettings: mocks.resolvePayrollSettings,
}));

vi.mock('../../models/user', () => ({
  UserModel: { listUsersByEstablishment: mocks.listUsers },
}));

vi.mock('../../models/timeEntry', () => ({
  TimeEntryModel: { totalsByUser: mocks.totalsByUser },
}));

vi.mock('../../models/staffLeave', () => ({
  StaffLeaveModel: { list: mocks.listLeaves },
}));

import { buildAccountantCsv, buildPayrollSummary } from './payrollReportService';

describe('payrollReportService', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.resolvePayrollSettings.mockResolvedValue({
      meal_threshold_hours: 5,
      cp_business_days_only: true,
      closed_days_of_week: [0],
      work_week_days: [1, 2, 3, 4, 5],
      establishment_open_days: [1, 2, 3, 4, 5, 6],
      cp_annual_cap_days: 30,
    });
  });

  it('buildPayrollSummary aggregates hours, meals, and leave lines', async () => {
    mocks.listUsers.mockResolvedValue([
      { id: 1, first_name: 'Ada', last_name: 'L', email: 'ada@example.com' },
    ]);
    mocks.totalsByUser.mockResolvedValue([
      { user_id: 1, total_minutes: 600, entry_count: 3 },
    ]);
    mocks.listLeaves.mockResolvedValue([]);

    const report = await buildPayrollSummary('est-1', '2026-04-01', '2026-04-30');
    expect(report.employees).toHaveLength(1);
    expect(report.employees[0]?.email).toBe('ada@example.com');
    expect(report.employees[0]?.entry_count).toBe(3);
    expect(report.payroll_settings).toBeTruthy();
  });

  it('buildAccountantCsv emits semicolon CSV with leave detail', () => {
    const csv = buildAccountantCsv({
      from: 'a',
      to: 'b',
      payroll_settings: {} as never,
      notes: [],
      employees: [
        {
          user_id: 1,
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
          total_minutes: 60,
          hours_decimal: 1.5,
          hours_formatted: '1,50',
          meals: 1,
          paid_leave_days: 2,
          rtt_days: 0,
          other_leave_days: 0,
          entry_count: 2,
          leave_lines: [
            {
              leave_id: 1,
              leave_type: 'paid',
              requested_from: '2026-04-01',
              requested_to: '2026-04-02',
              counted_days: 2,
              count_from: '2026-04-01',
              count_through: '2026-04-02',
              return_on: '2026-04-03',
            },
          ],
        },
      ],
    });
    expect(csv).toContain('employe_id;nom;email');
    expect(csv).toContain('ada@example.com');
    expect(csv).toContain('DÉTAIL CONGÉS');
    expect(csv).toContain('paid');
  });
});
