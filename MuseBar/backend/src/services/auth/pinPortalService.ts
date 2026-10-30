/**
 * Establishment PIN portal: one card per staff profile with PIN.
 */

import { MembershipPinModel } from '../../models/membershipPin';
import { StaffPinSessionModel } from '../../models/staffPinSession';
import { TimeEntryModel, TimeClockNetworkSettingsModel, isIpAllowed } from '../../models/timeEntry';
import { listOwnedActiveTables } from './pinSessionPointage';
import { settleExpiredPinSessions } from './pinSessionService';

function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
  email: string
): string {
  const full = `${first ?? ''} ${last ?? ''}`.trim();
  return full || email;
}

export interface PinPortalCardDto {
  user_id: number;
  display_name: string;
  email: string;
  badge: 'open' | 'closed';
  session_id: string | null;
  opened_at: string | null;
  last_seen_at: string | null;
  pointage: 'open' | 'closed';
  clock_in_at: string | null;
  owned_tables: Array<{ dining_table_id: number; label: string; open_ticket_id: number }>;
  owned_table_count: number;
}

export interface PinPortalDto {
  on_venue_network: boolean;
  client_ip: string | null;
  cards: PinPortalCardDto[];
}

export async function buildPinPortal(
  establishmentId: string,
  clientIp: string | null | undefined
): Promise<PinPortalDto> {
  await settleExpiredPinSessions(establishmentId);
  await StaffPinSessionModel.closeDuplicateOpens(establishmentId);

  const network = await TimeClockNetworkSettingsModel.get(establishmentId);
  const ip = clientIp?.startsWith('::ffff:') ? clientIp.slice(7) : clientIp ?? null;
  const onVenue = isIpAllowed(ip, network.allowed_ips);

  const [pins, sessions, openEntries] = await Promise.all([
    MembershipPinModel.listPinMemberships(establishmentId),
    StaffPinSessionModel.listActive(establishmentId),
    TimeEntryModel.listCurrentlyClockedIn(establishmentId),
  ]);

  const sessionByUser = new Map(sessions.map((s) => [s.user_id, s]));
  const entryByUser = new Map(openEntries.map((e) => [e.user_id, e]));

  const cards: PinPortalCardDto[] = [];
  for (const pin of pins) {
    const session = sessionByUser.get(pin.user_id);
    const entry = entryByUser.get(pin.user_id);
    const tables = session
      ? await listOwnedActiveTables(establishmentId, pin.user_id)
      : [];
    cards.push({
      user_id: pin.user_id,
      display_name: displayName(pin.first_name, pin.last_name, pin.email),
      email: pin.email,
      badge: session ? 'open' : 'closed',
      session_id: session?.id ?? null,
      opened_at: session ? new Date(session.opened_at).toISOString() : null,
      last_seen_at: session ? new Date(session.last_seen_at).toISOString() : null,
      pointage: entry ? 'open' : 'closed',
      clock_in_at: entry?.clock_in_at ?? null,
      owned_tables: tables,
      owned_table_count: tables.length,
    });
  }

  // Active badges without a PIN row (edge) still appear.
  for (const session of sessions) {
    if (cards.some((c) => c.user_id === session.user_id)) continue;
    const entry = entryByUser.get(session.user_id);
    const tables = await listOwnedActiveTables(establishmentId, session.user_id);
    cards.push({
      user_id: session.user_id,
      display_name: session.display_name || session.email,
      email: session.email,
      badge: 'open',
      session_id: session.id,
      opened_at: new Date(session.opened_at).toISOString(),
      last_seen_at: new Date(session.last_seen_at).toISOString(),
      pointage: entry ? 'open' : 'closed',
      clock_in_at: entry?.clock_in_at ?? null,
      owned_tables: tables,
      owned_table_count: tables.length,
    });
  }

  // Final order (local unlock vs remote) is applied on the client.
  // Server: open+clocked → open mismatch → available, then A–Z.
  cards.sort((a, b) => {
    const rank = (c: PinPortalCardDto) =>
      c.badge === 'open' && c.pointage === 'open'
        ? 0
        : c.badge === 'open' || c.pointage === 'open'
          ? 1
          : 2;
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return a.display_name.localeCompare(b.display_name, 'fr', { sensitivity: 'base' });
  });

  return {
    on_venue_network: onVenue,
    client_ip: ip,
    cards,
  };
}
