import { describe, expect, it } from 'vitest';
import {
  venueInboxEmail,
  venueInboxFromAddress,
  venueInboxReservationReplyTo,
} from './venueInboxAddress';

describe('venueInboxAddress', () => {
  it('builds slug@mosehxl.com and reservation reply-to', () => {
    expect(venueInboxEmail('musebar')).toBe('musebar@mosehxl.com');
    expect(venueInboxReservationReplyTo('musebar', 42)).toBe('musebar+r42@mosehxl.com');
  });

  it('sanitizes display name in From header', () => {
    expect(venueInboxFromAddress('musebar', 'Bar "Test" <x>')).toBe(
      'Bar Test x <musebar@mosehxl.com>'
    );
    expect(venueInboxFromAddress('musebar', '')).toBe('musebar <musebar@mosehxl.com>');
  });
});
