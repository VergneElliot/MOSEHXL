import moment from 'moment-timezone';
import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';
import { logSoftwareEventForAllEstablishmentsBestEffort } from './softwareEventJournal';

type TimeChangeMonitorOptions = {
  checkIntervalMs?: number;
  driftThresholdMs?: number;
  timezone?: string;
  now?: () => number;
  getOffsetMinutes?: (timestampMs: number, timezone: string) => number;
};

type TimeChangeMonitorOptionsResolved = {
  checkIntervalMs: number;
  driftThresholdMs: number;
  timezone: string;
  now: () => number;
  getOffsetMinutes: (timestampMs: number, timezone: string) => number;
};

const DEFAULT_CHECK_INTERVAL_MS = 60_000;
const DEFAULT_DRIFT_THRESHOLD_MS = 90_000;

function defaultGetOffsetMinutes(timestampMs: number, timezone: string): number {
  return moment.tz(timestampMs, timezone).utcOffset();
}

export class TimeChangeMonitor {
  private static interval: NodeJS.Timeout | null = null;
  private static options: TimeChangeMonitorOptionsResolved | null = null;
  private static lastObservedWallClockMs: number | null = null;
  private static lastTimezoneOffsetMinutes: number | null = null;

  public static start(options: TimeChangeMonitorOptions = {}): void {
    if (this.interval) return;

    const resolvedOptions: TimeChangeMonitorOptionsResolved = {
      checkIntervalMs: options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS,
      driftThresholdMs: options.driftThresholdMs ?? DEFAULT_DRIFT_THRESHOLD_MS,
      timezone: options.timezone ?? DEFAULT_APP_TIMEZONE,
      now: options.now ?? (() => Date.now()),
      getOffsetMinutes: options.getOffsetMinutes ?? defaultGetOffsetMinutes,
    };

    this.options = resolvedOptions;
    this.lastObservedWallClockMs = resolvedOptions.now();
    this.lastTimezoneOffsetMinutes = resolvedOptions.getOffsetMinutes(
      this.lastObservedWallClockMs,
      resolvedOptions.timezone
    );

    this.interval = setInterval(() => {
      void this.checkNow();
    }, resolvedOptions.checkIntervalMs);
  }

  public static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.options = null;
    this.lastObservedWallClockMs = null;
    this.lastTimezoneOffsetMinutes = null;
  }

  public static async checkNow(): Promise<void> {
    if (!this.options || this.lastObservedWallClockMs === null || this.lastTimezoneOffsetMinutes === null) {
      return;
    }

    const nowMs = this.options.now();
    const elapsedMs = nowMs - this.lastObservedWallClockMs;

    if (
      elapsedMs < 0 ||
      elapsedMs > this.options.checkIntervalMs + this.options.driftThresholdMs
    ) {
      await logSoftwareEventForAllEstablishmentsBestEffort('SYSTEM_TIME_CHANGE_DETECTED', {
        timezone: this.options.timezone,
        elapsed_ms: elapsedMs,
        expected_interval_ms: this.options.checkIntervalMs,
        drift_threshold_ms: this.options.driftThresholdMs,
        detected_at: new Date(nowMs).toISOString(),
      });
    }

    const currentOffsetMinutes = this.options.getOffsetMinutes(nowMs, this.options.timezone);
    if (currentOffsetMinutes !== this.lastTimezoneOffsetMinutes) {
      await logSoftwareEventForAllEstablishmentsBestEffort('SYSTEM_TIMEZONE_OFFSET_CHANGED', {
        timezone: this.options.timezone,
        previous_offset_minutes: this.lastTimezoneOffsetMinutes,
        current_offset_minutes: currentOffsetMinutes,
        detected_at: new Date(nowMs).toISOString(),
      });
    }

    this.lastObservedWallClockMs = nowMs;
    this.lastTimezoneOffsetMinutes = currentOffsetMinutes;
  }

  public static isRunning(): boolean {
    return this.interval !== null;
  }

  public static getStatus(): {
    isRunning: boolean;
    checkIntervalMs: number | null;
    driftThresholdMs: number | null;
    timezone: string | null;
  } {
    return {
      isRunning: this.isRunning(),
      checkIntervalMs: this.options?.checkIntervalMs ?? null,
      driftThresholdMs: this.options?.driftThresholdMs ?? null,
      timezone: this.options?.timezone ?? null,
    };
  }

}
