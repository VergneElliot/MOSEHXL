import { pool } from '../db/pool';
import { Logger } from '../utils/logger';

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'TIME_CLOCK');
  } catch {
    process.stderr.write(
      `[TIME_CLOCK] ${message}: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
}

const ALLOWED_IPS_KEY = 'time_clock_allowed_ips';

export interface TimeClockNetworkSettings {
  allowed_ips: string[];
}

export function normalizeAllowedIps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (!isValidIpOrCidr(trimmed)) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

/** Accept bare IPv4/IPv6 or IPv4 CIDR (e.g. 203.0.113.10 or 203.0.113.0/24). */
export function isValidIpOrCidr(value: string): boolean {
  if (value.includes('/')) {
    const [ip, prefix] = value.split('/');
    const p = Number(prefix);
    if (!ip || !Number.isInteger(p) || p < 0 || p > 32) return false;
    return isIpv4(ip);
  }
  return isIpv4(value) || isIpv6(value);
}

function isIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

function isIpv6(ip: string): boolean {
  // Loose check: colon-separated hex groups (supports :: compression via URL parser).
  try {
    // Node accepts IPv6 in URL hostname when wrapped in brackets.
    const parsed = new URL(`http://[${ip}]/`);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map((p) => Number(p));
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function normalizeClientIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  return cleaned || null;
}

export function isIpAllowed(clientIp: string | undefined | null, allowlist: string[]): boolean {
  const ip = normalizeClientIp(clientIp);
  if (!ip) return false;
  if (allowlist.length === 0) return false;

  for (const entry of allowlist) {
    if (entry.includes('/')) {
      const [network, prefixStr] = entry.split('/');
      const prefix = Number(prefixStr);
      if (!isIpv4(ip) || !network || !isIpv4(network)) continue;
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      if ((ipv4ToInt(ip) & mask) === (ipv4ToInt(network) & mask)) {
        return true;
      }
      continue;
    }
    if (normalizeClientIp(entry) === ip) return true;
  }
  return false;
}

export class TimeClockNetworkSettingsModel {
  static async get(establishmentId: string): Promise<TimeClockNetworkSettings> {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, ALLOWED_IPS_KEY]
    );
    if (result.rows.length === 0) {
      return { allowed_ips: [] };
    }
    try {
      const parsed = JSON.parse(result.rows[0].setting_value) as Record<string, unknown>;
      return { allowed_ips: normalizeAllowedIps(parsed.allowed_ips ?? parsed) };
    } catch (error) {
      logParseFailure('Failed to parse time_clock_allowed_ips JSON', error);
      return { allowed_ips: [] };
    }
  }

  static async upsert(
    establishmentId: string,
    settings: TimeClockNetworkSettings
  ): Promise<TimeClockNetworkSettings> {
    const normalized: TimeClockNetworkSettings = {
      allowed_ips: normalizeAllowedIps(settings.allowed_ips),
    };
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, ALLOWED_IPS_KEY, JSON.stringify(normalized)]
    );
    return normalized;
  }
}
