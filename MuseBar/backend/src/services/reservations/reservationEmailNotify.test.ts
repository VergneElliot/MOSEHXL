import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendTemplateEmail: vi.fn(),
  getInstance: vi.fn(),
  getEnv: vi.fn(() => ({})),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
  recordOutbound: vi.fn(),
  createRemind: vi.fn(() => 'remind'),
  createAction: vi.fn(() => 'cancel'),
  isPlausible: vi.fn(() => true),
}));

vi.mock('../email/EmailService', () => ({
  EmailService: { getInstance: mocks.getInstance },
}));

vi.mock('../../config/environment', () => ({
  getEnvironmentConfig: mocks.getEnv,
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      warn: mocks.loggerWarn,
      error: mocks.loggerError,
      info: mocks.loggerInfo,
    }),
  },
}));

vi.mock('./recordOutboundReservationEmail', () => ({
  recordOutboundReservationEmail: mocks.recordOutbound,
}));

vi.mock('./reservationRemindToken', () => ({
  createReservationRemindToken: mocks.createRemind,
  createReservationActionToken: mocks.createAction,
}));

vi.mock('./resolveInboxReplyRecipient', () => ({
  isPlausibleGuestEmail: mocks.isPlausible,
}));

import {
  notifyGuestReservationStatus,
  notifyReservationCancelled,
  notifyReservationReminder,
  notifyReservationRequested,
} from './reservationEmailService';
import type { Reservation } from '../../models/reservation';

const reservation: Reservation = {
  id: 9,
  establishment_id: 'est-1',
  starts_at: '2026-11-01T19:00:00.000Z',
  ends_at: null,
  party_size: 2,
  customer_name: 'Ada',
  customer_email: 'ada@example.com',
  customer_phone: null,
  status: 'requested',
  status_reason: null,
  notes: null,
  source: 'public',
  inbox_message_id: null,
  created_by: null,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
};

describe('reservationEmailService notify helpers', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
    });
    mocks.createRemind.mockReturnValue('remind');
    mocks.createAction.mockReturnValue('cancel');
    mocks.isPlausible.mockReturnValue(true);
    mocks.getEnv.mockReturnValue({});
    mocks.sendTemplateEmail.mockResolvedValue({ success: true });
    mocks.getInstance.mockReturnValue({ sendTemplateEmail: mocks.sendTemplateEmail });
    mocks.recordOutbound.mockResolvedValue(undefined);
  });

  it('notifyReservationRequested sends guest + venue templates', async () => {
    await notifyReservationRequested({
      reservation,
      establishmentName: 'Café',
      establishmentSlug: 'cafe',
      venueEmail: 'venue@example.com',
      guestMessage: 'Terrasse svp',
    });
    expect(mocks.sendTemplateEmail).toHaveBeenCalledTimes(2);
  });

  it('notifyReservationReminder / cancelled call sendTemplateEmail', async () => {
    await notifyReservationReminder({
      reservation,
      establishmentName: 'Café',
      establishmentSlug: 'cafe',
      venueEmail: 'venue@example.com',
    });
    expect(mocks.sendTemplateEmail).toHaveBeenCalledTimes(1);

    mocks.sendTemplateEmail.mockClear();
    await notifyReservationCancelled({
      reservation: { ...reservation, status: 'cancelled' },
      establishmentName: 'Café',
      establishmentSlug: 'cafe',
      venueEmail: 'venue@example.com',
    });
    expect(mocks.sendTemplateEmail).toHaveBeenCalledTimes(2);
  });

  it('notifyGuestReservationStatus skips missing/invalid email', async () => {
    await expect(
      notifyGuestReservationStatus({
        reservation: { ...reservation, customer_email: null },
        establishmentName: 'Café',
        establishmentSlug: 'cafe',
      })
    ).resolves.toMatchObject({ sent: false, error: 'missing_customer_email' });

    mocks.isPlausible.mockReturnValue(false);
    await expect(
      notifyGuestReservationStatus({
        reservation,
        establishmentName: 'Café',
        establishmentSlug: 'cafe',
      })
    ).resolves.toMatchObject({ sent: false, error: 'invalid_customer_email' });
  });

  it('skips send when email service unavailable or recipient missing', async () => {
    mocks.getInstance.mockImplementation(() => {
      throw new Error('no email');
    });
    await notifyReservationReminder({
      reservation,
      establishmentName: 'Café',
      establishmentSlug: 'cafe',
      venueEmail: 'venue@example.com',
    });
    expect(mocks.sendTemplateEmail).not.toHaveBeenCalled();
  });
});
