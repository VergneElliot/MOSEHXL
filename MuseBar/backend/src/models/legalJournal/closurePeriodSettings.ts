import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';
import { ClosureSettingsModel } from '../closureSettings';

/** Business-day cut time and timezone used by every closure period. */
export async function getClosurePeriodSettings(
  establishmentId: string
): Promise<{ cutTime: string; tz: string }> {
  const settings = await ClosureSettingsModel.getClosureSettings(establishmentId);
  return {
    cutTime: settings.daily_closure_time || '02:00',
    tz: settings.timezone || DEFAULT_APP_TIMEZONE,
  };
}
