import { describe, expect, it } from 'vitest';
import { extractInboxLocalPart, extractInboxRecipient } from './extractInboxLocalPart';

describe('extractInboxRecipient', () => {
  it('parses plain and display-name recipients', () => {
    expect(extractInboxRecipient('bistrot@mosehxl.com')).toEqual({
      slug: 'bistrot',
      reservationId: null,
    });
    expect(extractInboxRecipient('Le Bistrot <bistrot@mosehxl.com>')).toEqual({
      slug: 'bistrot',
      reservationId: null,
    });
  });

  it('parses plus-address reservation tags', () => {
    expect(extractInboxRecipient('bistrot+r42@mosehxl.com')).toEqual({
      slug: 'bistrot',
      reservationId: 42,
    });
    expect(extractInboxRecipient('Name <bistrot+r7@mosehxl.com>')).toEqual({
      slug: 'bistrot',
      reservationId: 7,
    });
  });

  it('parses SendGrid envelope JSON', () => {
    expect(
      extractInboxRecipient(
        JSON.stringify({ to: ['bistrot+r3@mosehxl.com'], from: 'a@b.com' })
      )
    ).toEqual({ slug: 'bistrot', reservationId: 3 });
  });

  it('returns null when no mosehxl.com local-part', () => {
    expect(extractInboxRecipient('someone@gmail.com')).toBeNull();
    expect(extractInboxLocalPart('someone@gmail.com')).toBeNull();
  });
});
