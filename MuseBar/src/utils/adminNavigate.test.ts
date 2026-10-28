import { describe, expect, it, vi, afterEach } from 'vitest';
import { requestOpenAdmin, subscribeOpenAdmin } from './adminNavigate';

describe('adminNavigate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delivers open-admin events to subscribers', () => {
    const handler = vi.fn();
    const unsub = subscribeOpenAdmin(handler);
    requestOpenAdmin({ section: 'inbox', reservationId: 3 });
    expect(handler).toHaveBeenCalledWith({ section: 'inbox', reservationId: 3 });
    unsub();
    requestOpenAdmin({ section: 'reservations' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
