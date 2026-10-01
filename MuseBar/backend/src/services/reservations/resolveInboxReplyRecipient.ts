import type { InboxMessage } from '../../models/inbox';

const VENUE_MAIL_DOMAIN = 'mosehxl.com';

export function extractEmailAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = String(raw).match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match?.[0]?.toLowerCase() ?? null;
}

/** True for slug@mosehxl.com / slug+r12@mosehxl.com — never a guest destination. */
export function isVenueManagedEmail(address: string | null | undefined): boolean {
  const email = extractEmailAddress(address);
  if (!email) return false;
  return email.endsWith(`@${VENUE_MAIL_DOMAIN}`);
}

/** Reject venue domain, @local seeds, and malformed addresses. */
export function isPlausibleGuestEmail(address: string | null | undefined): boolean {
  const email = extractEmailAddress(address);
  if (!email) return false;
  if (isVenueManagedEmail(email)) return false;
  if (email.endsWith('@local')) return false;
  return /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(email);
}

function firstPlausibleGuest(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const email = extractEmailAddress(candidate);
    if (email && isPlausibleGuestEmail(email)) return email;
  }
  return null;
}

/**
 * Guest address for staff replies. Prefer reservation email; never reply to
 * our own venue inbox when the selected row is an outbound copy.
 */
export function resolveInboxReplyRecipient(input: {
  message: Pick<InboxMessage, 'direction' | 'from_address' | 'to_address'>;
  reservationEmail?: string | null;
  thread?: Array<Pick<InboxMessage, 'direction' | 'from_address' | 'to_address'>>;
}): string | null {
  const lastInbound = [...(input.thread ?? [])]
    .reverse()
    .find((m) => m.direction === 'inbound');

  if (input.message.direction === 'outbound') {
    return firstPlausibleGuest(
      input.reservationEmail,
      input.message.to_address,
      lastInbound?.from_address
    );
  }

  return firstPlausibleGuest(
    input.reservationEmail,
    input.message.from_address,
    lastInbound?.from_address,
    // last resort: if somehow viewing outbound-shaped fields
    input.message.to_address
  );
}
