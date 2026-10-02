/**
 * Venue Wi‑Fi (public IP / CIDR allowlist) for PIN pointage.
 * Badge open/close is always allowed; clock-in/out only when on the allowlist.
 */

import {
  TimeClockNetworkSettingsModel,
  isIpAllowed,
} from '../../models/timeEntry';

export function normalizeClientIp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

/**
 * True when the client IP is on the establishment allowlist.
 * Empty allowlist → false (no accidental clock-in from everywhere).
 */
export async function isPinPointageOnVenueNetwork(
  establishmentId: string,
  clientIp: string | undefined | null
): Promise<boolean> {
  const network = await TimeClockNetworkSettingsModel.get(establishmentId);
  const ip = normalizeClientIp(clientIp);
  return isIpAllowed(ip, network.allowed_ips);
}
