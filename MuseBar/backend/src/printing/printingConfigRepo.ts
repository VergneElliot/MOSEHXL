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
  'digital',
];

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
  if (row.provider === 'epson-server-direct' && base && typeof cfg.pollKey === 'string') {
    const q = new URLSearchParams({
      establishment_id: establishmentId,
      key: cfg.pollKey,
    });
    epson_server_direct_poll_url = `${base}/api/printing/epson/poll?${q.toString()}`;
  }
  return { ...row, config: cfg, epson_server_direct_poll_url };
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

