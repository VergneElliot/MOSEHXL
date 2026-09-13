/**
 * Resolve establishment slug (+ optional reservation id) from SendGrid Inbound Parse
 * `to` / `envelope` fields. Supports plus-addressing: slug+r42@mosehxl.com
 */

export type InboxRecipient = {
  slug: string;
  reservationId: number | null;
};

function expandHaystack(rawTo: string): string {
  let haystack = String(rawTo || '');
  const trimmed = haystack.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { to?: unknown };
      if (Array.isArray(parsed.to)) {
        haystack = parsed.to.map(String).join(' ');
      } else if (parsed.to != null) {
        haystack = String(parsed.to);
      }
    } catch {
      /* keep original */
    }
  }
  return haystack;
}

export function extractInboxRecipient(rawTo: string): InboxRecipient | null {
  const haystack = expandHaystack(rawTo).toLowerCase();
  const match = haystack.match(/([a-z][a-z0-9]{0,63})(?:\+r(\d+))?@mosehxl\.com/);
  if (!match?.[1]) return null;
  const reservationId = match[2] ? Number(match[2]) : null;
  return {
    slug: match[1],
    reservationId:
      reservationId != null && Number.isFinite(reservationId) && reservationId > 0
        ? reservationId
        : null,
  };
}

/** @deprecated prefer extractInboxRecipient */
export function extractInboxLocalPart(rawTo: string): string | null {
  return extractInboxRecipient(rawTo)?.slug ?? null;
}
