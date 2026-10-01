/**
 * Venue Wi‑Fi (public IP / CIDR allowlist) gate for PIN badge open/close = pointage.
 * Unlock of an already-open badge and normal POS use are not gated here.
 */

import {
  TimeClockNetworkSettingsModel,
  isIpAllowed,
} from '../../models/timeEntry';
import { AppError } from '../../middleware/errorHandler';

export function normalizeClientIp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

/**
 * Throws 403 when the client is not on the establishment allowlist
 * (or when the allowlist is empty — pointage must be configured).
 */
export async function assertPinPointageOnVenueNetwork(
  establishmentId: string,
  clientIp: string | undefined | null
): Promise<void> {
  const network = await TimeClockNetworkSettingsModel.get(establishmentId);
  const ip = normalizeClientIp(clientIp);
  if (isIpAllowed(ip, network.allowed_ips)) return;

  throw new AppError(
    "Ouverture / fermeture de badge (pointage) uniquement sur le Wi‑Fi de l'établissement. La caisse reste utilisable hors réseau.",
    403,
    'PIN_POINTAGE_OFF_VENUE_NETWORK',
    {
      client_ip: ip,
      allowed_ips_configured: network.allowed_ips.length > 0,
    }
  );
}
