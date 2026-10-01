import { describe, expect, it } from 'vitest';
import {
  isPlausibleGuestEmail,
  isVenueManagedEmail,
  resolveInboxReplyRecipient,
} from './resolveInboxReplyRecipient';

describe('resolveInboxReplyRecipient', () => {
  it('prefers reservation guest email', () => {
    expect(
      resolveInboxReplyRecipient({
        message: {
          direction: 'outbound',
          from_address: 'musebar@mosehxl.com',
          to_address: 'guest@example.com',
        },
        reservationEmail: 'booker@example.com',
      })
    ).toBe('booker@example.com');
  });

  it('uses outbound to_address when no reservation email', () => {
    expect(
      resolveInboxReplyRecipient({
        message: {
          direction: 'outbound',
          from_address: 'musebar@mosehxl.com',
          to_address: 'Guest <guest@example.com>',
        },
      })
    ).toBe('guest@example.com');
  });

  it('uses inbound from_address for guest messages', () => {
    expect(
      resolveInboxReplyRecipient({
        message: {
          direction: 'inbound',
          from_address: 'Client <client@example.com>',
          to_address: 'musebar@mosehxl.com',
        },
      })
    ).toBe('client@example.com');
  });

  it('never returns a mosehxl.com address even if from looks like guest field', () => {
    expect(
      resolveInboxReplyRecipient({
        message: {
          direction: 'inbound',
          from_address: 'musebar@mosehxl.com',
          to_address: 'musebar@mosehxl.com',
        },
      })
    ).toBeNull();
  });

  it('skips venue from and picks last inbound guest in thread', () => {
    expect(
      resolveInboxReplyRecipient({
        message: {
          direction: 'outbound',
          from_address: 'musebar@mosehxl.com',
          to_address: 'musebar@mosehxl.com',
        },
        thread: [
          {
            direction: 'inbound',
            from_address: 'a@example.com',
            to_address: 'musebar@mosehxl.com',
          },
          {
            direction: 'outbound',
            from_address: 'musebar@mosehxl.com',
            to_address: 'musebar@mosehxl.com',
          },
        ],
      })
    ).toBe('a@example.com');
  });

  it('rejects manuel@local seed addresses', () => {
    expect(isPlausibleGuestEmail('manuel@local')).toBe(false);
    expect(
      resolveInboxReplyRecipient({
        message: {
          direction: 'inbound',
          from_address: 'manuel@local',
          to_address: 'musebar@mosehxl.com',
        },
        reservationEmail: null,
      })
    ).toBeNull();
  });

  it('detects venue-managed addresses including plus-tags', () => {
    expect(isVenueManagedEmail('musebar+r12@mosehxl.com')).toBe(true);
    expect(isVenueManagedEmail('client@gmail.com')).toBe(false);
  });
});
