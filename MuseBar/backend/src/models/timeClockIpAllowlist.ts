/**
 * Venue Wi‑Fi allowlist matching for pointage (IPv4 + IPv6 /64 prefixes).
 */

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

/**
 * Accept bare IPv4/IPv6 or CIDR.
 * IPv4: /0–/32. IPv6: /0–/128 (venues typically use /64 for privacy addresses).
 */
export function isValidIpOrCidr(value: string): boolean {
  if (value.includes('/')) {
    const [ip, prefix] = value.split('/');
    const p = Number(prefix);
    if (!ip || !Number.isInteger(p) || p < 0) return false;
    if (isIpv4(ip)) return p <= 32;
    if (isIpv6(ip)) return p <= 128;
    return false;
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
  try {
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

function expandIpv6Groups(ip: string): number[] | null {
  const raw = ip.trim().toLowerCase();
  if (!raw.includes(':')) return null;
  const sides = raw.split('::');
  if (sides.length > 2) return null;
  const parseSide = (side: string): number[] => {
    if (!side) return [];
    return side.split(':').map((g) => {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return NaN;
      return Number.parseInt(g, 16);
    });
  };
  if (sides.length === 1) {
    const groups = parseSide(sides[0]!);
    if (groups.length !== 8 || groups.some((n) => Number.isNaN(n))) return null;
    return groups;
  }
  const left = parseSide(sides[0]!);
  const right = parseSide(sides[1]!);
  if (left.some((n) => Number.isNaN(n)) || right.some((n) => Number.isNaN(n))) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  return [...left, ...Array(missing).fill(0), ...right];
}

function ipv6PrefixMatches(ip: string, network: string, prefixLen: number): boolean {
  const a = expandIpv6Groups(ip);
  const b = expandIpv6Groups(network);
  if (!a || !b) return false;
  const fullGroups = Math.floor(prefixLen / 16);
  const remBits = prefixLen % 16;
  for (let i = 0; i < fullGroups; i++) {
    if (a[i] !== b[i]) return false;
  }
  if (remBits === 0 || fullGroups >= 8) return true;
  const mask = (0xffff << (16 - remBits)) & 0xffff;
  return (a[fullGroups]! & mask) === (b[fullGroups]! & mask);
}

export function normalizeClientIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  return cleaned || null;
}

/** Stable network prefix for an IPv6 host (default /64 for privacy extensions). */
export function ipv6HostToPrefixCidr(ip: string, prefixLen = 64): string | null {
  const normalized = normalizeClientIp(ip);
  if (!normalized || !isIpv6(normalized) || isIpv4(normalized)) return null;
  if (!Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > 128) return null;
  const groups = expandIpv6Groups(normalized);
  if (!groups) return null;
  const fullGroups = Math.floor(prefixLen / 16);
  const remBits = prefixLen % 16;
  const out = groups.map((g, i) => {
    if (i < fullGroups) return g;
    if (i === fullGroups && remBits > 0) {
      const mask = (0xffff << (16 - remBits)) & 0xffff;
      return g & mask;
    }
    return 0;
  });
  return `${out.map((g) => g.toString(16)).join(':')}/${prefixLen}`;
}

export function isIpAllowed(clientIp: string | undefined | null, allowlist: string[]): boolean {
  const ip = normalizeClientIp(clientIp);
  if (!ip) return false;
  if (allowlist.length === 0) return false;

  for (const entry of allowlist) {
    const normalizedEntry = normalizeClientIp(entry) ?? entry.trim();
    if (normalizedEntry.includes('/')) {
      const [network, prefixStr] = normalizedEntry.split('/');
      const prefix = Number(prefixStr);
      if (!network || !Number.isInteger(prefix) || prefix < 0) continue;

      if (isIpv4(ip) && isIpv4(network) && prefix <= 32) {
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        if ((ipv4ToInt(ip) & mask) === (ipv4ToInt(network) & mask)) {
          return true;
        }
        continue;
      }

      if (isIpv6(ip) && isIpv6(network) && prefix <= 128) {
        if (ipv6PrefixMatches(ip, network, prefix)) return true;
      }
      continue;
    }
    if (normalizeClientIp(entry) === ip) return true;
  }
  return false;
}
