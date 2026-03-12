/**
 * Establishment-scoped settings API.
 * Settings are stored per establishment on the server so they sync across devices.
 */

import { request } from './core';
import type { HappyHourSettings } from '../../types';

export async function getHappyHourSettings(): Promise<HappyHourSettings> {
  const data = await request<HappyHourSettings>('/settings/happy-hour');
  return {
    isEnabled: data.isEnabled ?? true,
    startTime: data.startTime ?? '16:00',
    endTime: data.endTime ?? '19:00',
    isManuallyActivated: data.isManuallyActivated ?? false,
    discountType: data.discountType ?? 'percentage',
    discountValue: typeof data.discountValue === 'number' ? data.discountValue : Number(data.discountValue) || 0.2,
  };
}

export async function updateHappyHourSettings(settings: HappyHourSettings): Promise<HappyHourSettings> {
  const data = await request<HappyHourSettings>('/settings/happy-hour', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return data;
}
