import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createReservationRemindToken: vi.fn(() => 'remind-token'),
  createReservationActionToken: vi.fn(() => 'cancel-token'),
}));

vi.mock('./reservationRemindToken', () => ({
  createReservationRemindToken: mocks.createReservationRemindToken,
  createReservationActionToken: mocks.createReservationActionToken,
}));

import { buildCancelUrl, buildRelanceUrl } from './reservationEmailService';

describe('reservation email URL builders', () => {
  const prevFront = process.env.FRONTEND_URL;
  const prevApp = process.env.APP_URL;

  afterEach(() => {
    if (prevFront === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prevFront;
    if (prevApp === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevApp;
    vi.clearAllMocks();
  });

  it('buildRelanceUrl uses FRONTEND_URL and remind token', () => {
    process.env.FRONTEND_URL = 'https://app.example.com/';
    const url = buildRelanceUrl('slug-a', 9);
    expect(mocks.createReservationRemindToken).toHaveBeenCalledWith(9, 'slug-a');
    expect(url).toBe('https://app.example.com/reserve/slug-a/relancer/remind-token');
  });

  it('buildCancelUrl encodes cancel action token', () => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    const url = buildCancelUrl('slug-b', 3);
    expect(mocks.createReservationActionToken).toHaveBeenCalledWith(3, 'slug-b', 'cancel');
    expect(url).toBe('https://app.example.com/reserve/slug-b/annuler/cancel-token');
  });
});
