import type { Request, Response } from 'express';
import type { Pool } from 'pg';

import { dequeueEposJob } from '../services/printing';
import { parseConfigCell } from './printingConfigRepo';

const UUID_V4_RELAXED_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_V4_RELAXED_REGEX.test(value);
}

async function getActivePrintingConfigurationForPoll(
  pool: Pool,
  establishmentId: string
): Promise<{ provider: string; config: unknown } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.establishment_id', $1, true)", [establishmentId]);
    const configResult = await client.query(
      `SELECT provider, config FROM printing_configurations
       WHERE establishment_id = $1 AND is_active = true
       ORDER BY created_at DESC LIMIT 1`,
      [establishmentId]
    );
    await client.query('COMMIT');

    if (configResult.rows.length === 0) {
      return null;
    }

    const row = configResult.rows[0] as { provider: string; config: unknown };
    return row;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function epsonServerDirectPollHandler(pool: Pool, req: Request, res: Response) {
  const rawId = req.query.establishment_id ?? req.query.eid;
  const establishmentId = String(rawId ?? '').trim();
  const headerKey = req.header('x-epson-poll-key');
  const queryKey = req.query.key;
  const key = typeof headerKey === 'string' && headerKey.length > 0
    ? headerKey
    : String(queryKey ?? '');

  if (!establishmentId) {
    return res.status(400).type('text/plain').send('Missing or invalid establishment_id');
  }
  if (!isValidUuid(establishmentId)) {
    return res.status(400).type('text/plain').send('Missing or invalid establishment_id');
  }

  const row = await getActivePrintingConfigurationForPoll(pool, establishmentId);
  if (!row) {
    return res.status(403).type('text/plain').send('No active printing configuration');
  }

  if (row.provider !== 'epson-server-direct') {
    return res.status(403).type('text/plain').send('Epson Server Direct not enabled');
  }

  const cfg = parseConfigCell(row.config);
  const pollKey = cfg.pollKey;
  if (typeof pollKey !== 'string' || key !== pollKey) {
    return res.status(403).type('text/plain').send('Forbidden');
  }

  const job = dequeueEposJob(establishmentId);
  if (!job) {
    return res.status(200).type('text/plain').send('');
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  return res.status(200).send(job.xml);
}

