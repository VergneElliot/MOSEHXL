import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logSoftwareEventForAllEstablishmentsBestEffort: vi.fn(),
}));

vi.mock('./softwareEventJournal', () => ({
  logSoftwareEventForAllEstablishmentsBestEffort: mocks.logSoftwareEventForAllEstablishmentsBestEffort,
}));

import { TimeChangeMonitor } from './timeChangeMonitor';

describe('TimeChangeMonitor', () => {
  beforeEach(() => {
    TimeChangeMonitor.stop();
    mocks.logSoftwareEventForAllEstablishmentsBestEffort.mockReset();
    mocks.logSoftwareEventForAllEstablishmentsBestEffort.mockResolvedValue(undefined);
  });

  it('does not emit events during normal interval progression', async () => {
    let nowMs = Date.parse('2026-04-30T18:00:00.000Z');
    let offsetMinutes = 120;

    TimeChangeMonitor.start({
      checkIntervalMs: 1000,
      driftThresholdMs: 500,
      timezone: 'Europe/Paris',
      now: () => nowMs,
      getOffsetMinutes: () => offsetMinutes,
    });

    nowMs += 1000;
    await TimeChangeMonitor.checkNow();

    expect(mocks.logSoftwareEventForAllEstablishmentsBestEffort).not.toHaveBeenCalled();
    expect(offsetMinutes).toBe(120);
  });

  it('emits time-change event when wall-clock jump exceeds threshold', async () => {
    let nowMs = Date.parse('2026-04-30T18:00:00.000Z');

    TimeChangeMonitor.start({
      checkIntervalMs: 1000,
      driftThresholdMs: 500,
      timezone: 'Europe/Paris',
      now: () => nowMs,
      getOffsetMinutes: () => 120,
    });

    nowMs += 5000;
    await TimeChangeMonitor.checkNow();

    expect(mocks.logSoftwareEventForAllEstablishmentsBestEffort).toHaveBeenCalledWith(
      'SYSTEM_TIME_CHANGE_DETECTED',
      expect.objectContaining({
        elapsed_ms: 5000,
        expected_interval_ms: 1000,
        drift_threshold_ms: 500,
      })
    );
  });

  it('emits timezone offset change event when offset changes', async () => {
    let nowMs = Date.parse('2026-04-30T18:00:00.000Z');
    let offsetMinutes = 120;

    TimeChangeMonitor.start({
      checkIntervalMs: 1000,
      driftThresholdMs: 500,
      timezone: 'Europe/Paris',
      now: () => nowMs,
      getOffsetMinutes: () => offsetMinutes,
    });

    nowMs += 1000;
    offsetMinutes = 60;
    await TimeChangeMonitor.checkNow();

    expect(mocks.logSoftwareEventForAllEstablishmentsBestEffort).toHaveBeenCalledWith(
      'SYSTEM_TIMEZONE_OFFSET_CHANGED',
      expect.objectContaining({
        timezone: 'Europe/Paris',
        previous_offset_minutes: 120,
        current_offset_minutes: 60,
      })
    );
  });
});
