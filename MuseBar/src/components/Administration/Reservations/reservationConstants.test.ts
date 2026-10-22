import { describe, expect, it } from 'vitest';
import { localDateKey, statusColor, STATUSES, STATUS_COLOR } from './reservationConstants';

describe('reservationConstants', () => {
  it('localDateKey formats YMD', () => {
    expect(localDateKey(new Date(2026, 8, 5))).toBe('2026-09-05');
  });

  it('statusColor maps known statuses', () => {
    expect(statusColor('confirmed')).toBe('success');
    expect(statusColor('requested')).toBe('info');
    expect(statusColor('on_hold')).toBe('warning');
    expect(statusColor('refused')).toBe('error');
    expect(statusColor('no_show')).toBe('error');
    expect(statusColor('cancelled')).toBe('default');
    expect(statusColor('seated')).toBe('secondary');
    expect(statusColor('unknown')).toBe('default');
  });

  it('exposes status label and hex color tables', () => {
    expect(STATUSES.some((s) => s.id === 'confirmed')).toBe(true);
    expect(STATUS_COLOR.confirmed).toMatch(/^#/);
  });
});
