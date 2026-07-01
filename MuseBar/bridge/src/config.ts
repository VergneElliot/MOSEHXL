import fs from 'node:fs';
import path from 'node:path';

export interface BridgePrinterRoute {
  slug: string;
  host: string;
  port: number;
}

export interface BridgeConfig {
  apiUrl: string;
  establishmentId: string;
  bridgeKey: string;
  printerDriver: string;
  printerHost: string;
  printerPort: number;
  printers: BridgePrinterRoute[];
  pollIntervalMs: number;
  printerTimeoutMs: number;
}

export function loadDotEnv(filePath = path.join(process.cwd(), '.env')): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (process.env[key] != null) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalInt(name: string, defaultValue: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return defaultValue;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
}

export function parsePrintersJson(raw: string | undefined): BridgePrinterRoute[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('PRINTERS_JSON must be valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('PRINTERS_JSON must be a JSON array');
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`PRINTERS_JSON[${index}] must be an object`);
    }
    const record = entry as Record<string, unknown>;
    const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
    const host = typeof record.host === 'string' ? record.host.trim() : '';
    const port = record.port != null ? Number(record.port) : 9100;
    if (!slug) throw new Error(`PRINTERS_JSON[${index}].slug is required`);
    if (!host) throw new Error(`PRINTERS_JSON[${index}].host is required`);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`PRINTERS_JSON[${index}].port must be between 1 and 65535`);
    }
    return { slug, host, port };
  });
}

export function loadConfig(): BridgeConfig {
  loadDotEnv();
  const apiUrl = required('MUSEBAR_API_URL').replace(/\/$/, '');
  const printerPort = optionalInt('PRINTER_PORT', 9100);
  if (printerPort < 1 || printerPort > 65535) {
    throw new Error('PRINTER_PORT must be between 1 and 65535');
  }

  return {
    apiUrl,
    establishmentId: required('ESTABLISHMENT_ID'),
    bridgeKey: required('BRIDGE_KEY'),
    printerDriver: process.env.PRINTER_DRIVER?.trim() || 'network-escpos',
    printerHost: required('PRINTER_HOST'),
    printerPort,
    printers: parsePrintersJson(process.env.PRINTERS_JSON),
    pollIntervalMs: optionalInt('POLL_INTERVAL_MS', 2000),
    printerTimeoutMs: optionalInt('PRINTER_TIMEOUT_MS', 8000),
  };
}
