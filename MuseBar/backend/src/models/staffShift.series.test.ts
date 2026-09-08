import { describe, expect, it } from 'vitest';
import { applySeriesTimeDelta } from './staffShift';

describe('applySeriesTimeDelta', () => {
  it('shifts weekly siblings by the same start delta and new duration', () => {
    // Anchor: Mon 10:00–18:00 → Tue 11:00–17:00 (+1 day, +1h start, shorter day)
    const nextWeek = applySeriesTimeDelta({
      siblingStartsAt: '2026-09-14T08:00:00.000Z', // next Monday 10:00 Paris summer
      siblingEndsAt: '2026-09-14T16:00:00.000Z',
      anchorOldStartsAt: '2026-09-07T08:00:00.000Z',
      anchorOldEndsAt: '2026-09-07T16:00:00.000Z',
      anchorNewStartsAt: '2026-09-08T09:00:00.000Z',
      anchorNewEndsAt: '2026-09-08T15:00:00.000Z',
    });
    expect(nextWeek.starts_at).toBe('2026-09-15T09:00:00.000Z');
    expect(nextWeek.ends_at).toBe('2026-09-15T15:00:00.000Z');
  });

  it('rejects inverted ranges', () => {
    expect(() =>
      applySeriesTimeDelta({
        siblingStartsAt: '2026-09-14T08:00:00.000Z',
        siblingEndsAt: '2026-09-14T16:00:00.000Z',
        anchorOldStartsAt: '2026-09-07T08:00:00.000Z',
        anchorOldEndsAt: '2026-09-07T16:00:00.000Z',
        anchorNewStartsAt: '2026-09-07T18:00:00.000Z',
        anchorNewEndsAt: '2026-09-07T10:00:00.000Z',
      })
    ).toThrow(/ends_at/);
  });
});
