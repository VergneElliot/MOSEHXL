import { randomUUID } from 'crypto';

import type { PrintingConfig } from '../services/printing/types';
import type { Pool } from 'pg';
import { Logger } from '../utils/logger';

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'PRINTING_CONFIG_REPO');
  } catch {
    process.stderr.write(`[PRINTING_CONFIG_REPO] ${message}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

export const ALLOWED_PRINT_PROVIDERS: PrintingConfig['provider'][] = [
  'epson-server-direct',
  'network-escpos',
  'bridge',
  'digital',
];

function assertNetworkEscPosConfig(mergedConfig: Record<string, unknown>): void {
  const host = mergedConfig.printerHost ?? process.env.THERMAL_PRINTER_HOST;
  if (typeof host !== 'string' || !host.trim()) {
    throw Object.assign(
      new Error('printerHost is required for network ESC/POS (or set THERMAL_PRINTER_HOST)'),
      { statusCode: 400 }
    );
  }
  const portRaw = mergedConfig.printerPort ?? process.env.THERMAL_PRINTER_PORT ?? 9100;
  const port = typeof portRaw === 'number' ? portRaw : parseInt(String(portRaw), 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw Object.assign(new Error('printerPort must be between 1 and 65535'), { statusCode: 400 });
  }
}

export function parseConfigCell(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (error) {
      logParseFailure('Failed to parse printing configuration JSON', error);
      return {};
    }
  }
  return {};
}

export function enrichConfigurationRow(row: Record<string, unknown>, establishmentId: string) {
  const cfg = parseConfigCell(row.config);
  const base = (process.env.APP_URL || process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  let epson_server_direct_poll_url: string | null = null;
  let epson_server_direct_poll_key_header: string | null = null;
  if (row.provider === 'epson-server-direct' && base && typeof cfg.pollKey === 'string') {
    const q = new URLSearchParams({
      establishment_id: establishmentId,
    });
    epson_server_direct_poll_url = `${base}/api/printing/epson/poll?${q.toString()}`;
    epson_server_direct_poll_key_header = 'x-epson-poll-key';
  }
  let bridge_env: string | null = null;
  let bridge_poll_url: string | null = null;
  let bridge_key_header: string | null = null;
  if (row.provider === 'bridge' && base && typeof cfg.bridgeKey === 'string') {
    bridge_poll_url = `${base}/api/printing/bridge/poll?establishment_id=${encodeURIComponent(establishmentId)}`;
    bridge_key_header = 'x-bridge-key';
    bridge_env = [
      `MUSEBAR_API_URL=${base}`,
      `ESTABLISHMENT_ID=${establishmentId}`,
      `BRIDGE_KEY=${cfg.bridgeKey}`,
      'PRINTER_DRIVER=network-escpos',
      'PRINTER_HOST=192.168.0.95',
      'PRINTER_PORT=9100',
      'POLL_INTERVAL_MS=2000',
    ].join('\n');
  }
  return {
    ...row,
    config: cfg,
    epson_server_direct_poll_url,
    epson_server_direct_poll_key_header,
    bridge_env,
    bridge_poll_url,
    bridge_key_header,
  };
}

export async function getActivePrintingConfiguration(
  pool: Pool,
  establishmentId: string
): Promise<{ provider: string; config: Record<string, unknown> } | null> {
  const configResult = await pool.query(
    `SELECT provider, config
     FROM printing_configurations
     WHERE establishment_id = $1 AND is_active = true
     ORDER BY created_at DESC
     LIMIT 1`,
    [establishmentId]
  );
  if (configResult.rows.length === 0) return null;
  const row = configResult.rows[0] as { provider: string; config: unknown };
  return { provider: row.provider, config: parseConfigCell(row.config) };
}

export async function listPrintingConfigurations(pool: Pool, establishmentId: string) {
  const configResult = await pool.query(
    `SELECT * FROM printing_configurations
     WHERE establishment_id = $1
     ORDER BY created_at DESC`,
    [establishmentId]
  );

  return configResult.rows.map((row) =>
    enrichConfigurationRow(row as Record<string, unknown>, establishmentId)
  );
}

export async function savePrintingConfiguration(
  pool: Pool,
  establishmentId: string,
  provider: PrintingConfig['provider'],
  bodyConfig: unknown
) {
  if (!ALLOWED_PRINT_PROVIDERS.includes(provider)) {
    throw Object.assign(new Error(`Provider must be one of: ${ALLOWED_PRINT_PROVIDERS.join(', ')}`), {
      statusCode: 400,
    });
  }

  let mergedConfig: Record<string, unknown> =
    typeof bodyConfig === 'object' && bodyConfig !== null ? { ...(bodyConfig as object) } : {};

  if (provider === 'epson-server-direct' && typeof mergedConfig.pollKey !== 'string') {
    mergedConfig = { ...mergedConfig, pollKey: randomUUID() };
  }

  if (provider === 'bridge' && typeof mergedConfig.bridgeKey !== 'string') {
    mergedConfig = { ...mergedConfig, bridgeKey: randomUUID() };
  }

  if (provider === 'network-escpos') {
    assertNetworkEscPosConfig(mergedConfig);
    if (mergedConfig.printerPort == null) {
      mergedConfig = { ...mergedConfig, printerPort: 9100 };
    }
  }

  await pool.query(
    `UPDATE printing_configurations
     SET is_active = false
     WHERE establishment_id = $1`,
    [establishmentId]
  );

  const result = await pool.query(
    `INSERT INTO printing_configurations
     (establishment_id, provider, config, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [establishmentId, provider, JSON.stringify(mergedConfig)]
  );

  const configuration = enrichConfigurationRow(
    result.rows[0] as Record<string, unknown>,
    establishmentId
  );

  return { configuration, mergedConfig };
}

export async function getActiveBridgeConfiguration(
  pool: Pool,
  establishmentId: string
): Promise<Record<string, unknown> | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.establishment_id', $1, true)", [establishmentId]);
    const result = await client.query(
      `SELECT provider, config
       FROM printing_configurations
       WHERE establishment_id = $1 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [establishmentId]
    );
    await client.query('COMMIT');

    const row = result.rows[0] as { provider?: string; config?: unknown } | undefined;
    if (!row || row.provider !== 'bridge') return null;
    return parseConfigCell(row.config);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

