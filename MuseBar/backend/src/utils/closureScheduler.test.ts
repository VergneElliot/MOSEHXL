import { afterEach, describe, expect, it, vi } from 'vitest';
import moment from 'moment-timezone';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getClosureSettings: vi.fn(),
  logActionBestEffort: vi.fn(),
  runWithTenantContext: vi.fn(async (_ctx: unknown, fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../models/closureSettings', () => ({
  ClosureSettingsModel: {
    getClosureSettings: mocks.getClosureSettings,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logActionBestEffort: mocks.logActionBestEffort,
  },
}));

vi.mock('../rls/tenantContext', () => ({
  runWithTenantContext: mocks.runWithTenantContext,
}));

vi.mock('../models/legalJournal', () => ({
  LegalJournalModel: {
    createDailyClosureOpen: vi.fn(),
  },
}));

vi.mock('../models/legalJournal/businessDayPeriod', () => ({
  getBusinessDayPeriod: vi.fn(),
}));

vi.mock('../models/legalJournal/journalQueries', () => ({
  JournalQueries: {},
}));

import { ClosureScheduler } from './closureScheduler';

describe('ClosureScheduler', () => {
  afterEach(() => {
    ClosureScheduler.stop();
    vi.clearAllMocks();
  });

  it('start is idempotent and stop clears interval', async () => {
    const spy = vi.spyOn(global, 'setInterval').mockReturnValue(123 as never);
    const clearSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
    await ClosureScheduler.start();
    await ClosureScheduler.start();
    expect(spy).toHaveBeenCalledTimes(1);
    ClosureScheduler.stop();
    expect(clearSpy).toHaveBeenCalled();
    spy.mockRestore();
    clearSpy.mockRestore();
  });

  it('shouldExecuteClosure is true only inside grace window after target time', async () => {
    const settings = { daily_closure_time: '02:00', grace_period_minutes: 30 };
    const before = moment.tz('2026-10-22 01:59', 'Europe/Paris');
    await expect(ClosureScheduler.shouldExecuteClosure(settings, before)).resolves.toBe(false);

    const inGrace = moment.tz('2026-10-22 02:10', 'Europe/Paris');
    await expect(ClosureScheduler.shouldExecuteClosure(settings, inGrace)).resolves.toBe(true);

    const afterGrace = moment.tz('2026-10-22 03:00', 'Europe/Paris');
    await expect(ClosureScheduler.shouldExecuteClosure(settings, afterGrace)).resolves.toBe(false);
  });

  it('getClosureSettings delegates to ClosureSettingsModel', async () => {
    mocks.getClosureSettings.mockResolvedValue({ auto_closure_enabled: false });
    await expect(ClosureScheduler.getClosureSettings('est-1')).resolves.toEqual({
      auto_closure_enabled: false,
    });
  });

  it('checkAndExecuteClosure skips establishments with auto closure disabled', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 'est-1' }] });
    mocks.getClosureSettings.mockResolvedValue({
      auto_closure_enabled: false,
      timezone: 'Europe/Paris',
      daily_closure_time: '02:00',
      grace_period_minutes: 30,
    });
    await ClosureScheduler.checkAndExecuteClosure();
    expect(mocks.runWithTenantContext).toHaveBeenCalled();
  });
});
