import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getLabor: vi.fn(),
  getHours: vi.fn(),
  getClosed: vi.fn(),
  openDaysOfWeekFromHours: vi.fn(),
  frenchPublicHolidaysForYears: vi.fn(),
}));

vi.mock('../../models/laborSettings', () => ({
  LaborSettingsModel: { get: mocks.getLabor },
}));

vi.mock('../../models/establishmentOperatingHours', () => ({
  EstablishmentOperatingHoursModel: { get: mocks.getHours },
}));

vi.mock('../../models/reservationClosedDates', () => ({
  ReservationClosedDatesModel: { get: mocks.getClosed },
}));

vi.mock('../../models/openingHoursSettings', () => ({
  openDaysOfWeekFromHours: mocks.openDaysOfWeekFromHours,
}));

vi.mock('./frenchPublicHolidays', () => ({
  frenchPublicHolidaysForYears: mocks.frenchPublicHolidaysForYears,
}));

import { resolvePayrollSettings } from './payrollSettingsResolver';

describe('resolvePayrollSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLabor.mockResolvedValue({
      leave_counting_mode: 'ouvres',
      work_week_days: [1, 2, 3, 4, 5],
      hours_per_meal: 8,
      exclude_public_holidays: true,
    });
    mocks.getHours.mockResolvedValue({});
    mocks.getClosed.mockResolvedValue({ dates: ['2026-12-25'] });
    mocks.openDaysOfWeekFromHours.mockReturnValue([1, 2, 3, 4, 5, 6]);
    mocks.frenchPublicHolidaysForYears.mockReturnValue([
      { date: '2026-01-01', name: 'Jour de l’an' },
      { date: '2026-12-25', name: 'Noël' },
    ]);
  });

  it('merges open days, closed dates and public holidays into settings', async () => {
    const settings = await resolvePayrollSettings('est-1', {
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(settings.establishment_open_days).toEqual([1, 2, 3, 4, 5, 6]);
    expect(settings.non_working_dates).toEqual(
      expect.arrayContaining(['2026-01-01', '2026-12-25'])
    );
    expect(settings.exclude_public_holidays).toBe(true);
    expect(mocks.frenchPublicHolidaysForYears).toHaveBeenCalled();
  });

  it('skips public holidays when exclude_public_holidays is false', async () => {
    mocks.getLabor.mockResolvedValue({
      leave_counting_mode: 'ouvres',
      work_week_days: [1, 2, 3],
      exclude_public_holidays: false,
    });
    const settings = await resolvePayrollSettings('est-1');
    expect(settings.non_working_dates).toEqual(['2026-12-25']);
    expect(mocks.frenchPublicHolidaysForYears).not.toHaveBeenCalled();
  });
});
