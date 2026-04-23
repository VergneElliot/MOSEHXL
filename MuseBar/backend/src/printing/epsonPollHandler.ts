import type { Request, Response } from 'express';
import type { Pool } from 'pg';

import { dequeueEposJob } from '../services/printing';
import { parseConfigCell } from './printingConfigRepo';

export async function epsonServerDirectPollHandler(pool: Pool, req: Request, res: Response) {
  const rawId = req.query.establishment_id ?? req.query.eid;
  const establishmentId = String(rawId ?? '');
  const headerKey = req.header('x-epson-poll-key');
  const queryKey = req.query.key;
  const key = typeof headerKey === 'string' && headerKey.length > 0
    ? headerKey
    : String(queryKey ?? '');

  if (!establishmentId) {
    return res.status(400).type('text/plain').send('Missing or invalid establishment_id');
  }

  const configResult = await pool.query(
    `SELECT provider, config FROM printing_configurations
     WHERE establishment_id = $1 AND is_active = true
     ORDER BY created_at DESC LIMIT 1`,
    [establishmentId]
  );

  if (configResult.rows.length === 0) {
    return res.status(403).type('text/plain').send('No active printing configuration');
  }

  const row = configResult.rows[0] as { provider: string; config: unknown };
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

