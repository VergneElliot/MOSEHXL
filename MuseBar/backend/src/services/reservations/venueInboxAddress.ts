const INBOX_DOMAIN = 'mosehxl.com';

export function venueInboxEmail(slug: string): string {
  return `${slug}@${INBOX_DOMAIN}`;
}

export function venueInboxReservationReplyTo(slug: string, reservationId: number): string {
  return `${slug}+r${reservationId}@${INBOX_DOMAIN}`;
}

export function venueInboxFromAddress(slug: string, establishmentName: string): string {
  const email = venueInboxEmail(slug);
  const safeName = String(establishmentName || slug)
    .replace(/[<>\r\n"]/g, '')
    .trim()
    .slice(0, 80);
  return safeName ? `${safeName} <${email}>` : email;
}
