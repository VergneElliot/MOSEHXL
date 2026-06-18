import type { Pool, PoolClient } from 'pg';

export type BridgePrintJobStatus = 'pending' | 'claimed' | 'printed' | 'failed' | 'expired';
export type BridgePrintDocumentType = 'test' | 'receipt' | 'invoice' | 'closure_bulletin';
export type BridgePrintPayloadFormat = 'escpos';

export interface BridgePrintJob {
  id: string;
  establishment_id: string;
  document_type: BridgePrintDocumentType;
  payload_format: BridgePrintPayloadFormat;
  payload_base64: string;
  status: BridgePrintJobStatus;
  attempt_count: number;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_by_user_id: number | null;
  created_at: Date;
  claimed_at: Date | null;
  printed_at: Date | null;
  failed_at: Date | null;
  expires_at: Date | null;
}

export interface BridgeQueueStatus {
  pending: number;
  claimed: number;
  printed: number;
  failed: number;
  expired: number;
  lastPrintedAt: string | null;
  lastFailedAt: string | null;
  lastError: string | null;
}

export interface CreateBridgePrintJobInput {
  establishmentId: string;
  documentType: BridgePrintDocumentType;
  payloadFormat: BridgePrintPayloadFormat;
  payloadBase64: string;
  createdByUserId?: number | null;
  metadata?: Record<string, unknown>;
  expiresAt?: Date | null;
}

const CLAIM_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_JOB_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

async function setTenantContext(client: PoolClient, establishmentId: string): Promise<void> {
  await client.query("SELECT set_config('app.establishment_id', $1, true)", [establishmentId]);
}

function normalizeJob(row: Record<string, unknown>): BridgePrintJob {
  return {
    id: String(row.id),
    establishment_id: String(row.establishment_id),
    document_type: row.document_type as BridgePrintDocumentType,
    payload_format: row.payload_format as BridgePrintPayloadFormat,
    payload_base64: String(row.payload_base64),
    status: row.status as BridgePrintJobStatus,
    attempt_count: Number(row.attempt_count),
    last_error: typeof row.last_error === 'string' ? row.last_error : null,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_by_user_id:
      typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
    created_at: row.created_at as Date,
    claimed_at: (row.claimed_at as Date | null) ?? null,
    printed_at: (row.printed_at as Date | null) ?? null,
    failed_at: (row.failed_at as Date | null) ?? null,
    expires_at: (row.expires_at as Date | null) ?? null,
  };
}

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

async function releaseStaleClaims(client: Pool | PoolClient, establishmentId: string): Promise<void> {
  await client.query(
    `UPDATE printing_jobs
     SET status = 'pending',
         claimed_at = NULL,
         last_error = COALESCE(last_error, 'Bridge claim timed out')
     WHERE establishment_id = $1
       AND status = 'claimed'
       AND claimed_at < $2`,
    [establishmentId, new Date(Date.now() - CLAIM_TIMEOUT_MS)]
  );
}

async function expireOldJobs(client: Pool | PoolClient, establishmentId: string): Promise<void> {
  await client.query(
    `UPDATE printing_jobs
     SET status = 'expired',
         failed_at = COALESCE(failed_at, CURRENT_TIMESTAMP),
         last_error = COALESCE(last_error, 'Print job expired')
     WHERE establishment_id = $1
       AND status IN ('pending', 'claimed')
       AND expires_at IS NOT NULL
       AND expires_at < CURRENT_TIMESTAMP`,
    [establishmentId]
  );
}

export async function createBridgePrintJob(
  pool: Pool,
  input: CreateBridgePrintJobInput
): Promise<BridgePrintJob> {
  const expiresAt = input.expiresAt ?? new Date(Date.now() + DEFAULT_JOB_TTL_MS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantContext(client, input.establishmentId);
    const result = await client.query(
      `INSERT INTO printing_jobs
         (establishment_id, document_type, payload_format, payload_base64, created_by_user_id, metadata, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING *`,
      [
        input.establishmentId,
        input.documentType,
        input.payloadFormat,
        input.payloadBase64,
        input.createdByUserId ?? null,
        JSON.stringify(input.metadata ?? {}),
        expiresAt,
      ]
    );
    await client.query('COMMIT');
    return normalizeJob(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function claimNextBridgePrintJob(
  pool: Pool,
  establishmentId: string
): Promise<BridgePrintJob | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantContext(client, establishmentId);
    await releaseStaleClaims(client, establishmentId);
    await expireOldJobs(client, establishmentId);

    const result = await client.query(
      `WITH next_job AS (
         SELECT id
         FROM printing_jobs
         WHERE establishment_id = $1
           AND status = 'pending'
         ORDER BY created_at ASC, id ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE printing_jobs job
       SET status = 'claimed',
           claimed_at = CURRENT_TIMESTAMP,
           attempt_count = attempt_count + 1,
           failed_at = NULL
       FROM next_job
       WHERE job.id = next_job.id
       RETURNING job.*`,
      [establishmentId]
    );

    await client.query('COMMIT');
    if (result.rows.length === 0) return null;
    return normalizeJob(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function ackBridgePrintJob(
  pool: Pool,
  establishmentId: string,
  jobId: string
): Promise<BridgePrintJob | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantContext(client, establishmentId);
    const result = await client.query(
      `UPDATE printing_jobs
       SET status = 'printed',
           printed_at = CURRENT_TIMESTAMP,
           claimed_at = NULL,
           failed_at = NULL,
           last_error = NULL
       WHERE id = $1
         AND establishment_id = $2
         AND status = 'claimed'
       RETURNING *`,
      [jobId, establishmentId]
    );
    await client.query('COMMIT');
    if (result.rows.length === 0) return null;
    return normalizeJob(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function failBridgePrintJob(
  pool: Pool,
  establishmentId: string,
  jobId: string,
  errorMessage: string
): Promise<BridgePrintJob | null> {
  const truncatedError = errorMessage.slice(0, 1000);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantContext(client, establishmentId);
    const result = await client.query(
      `UPDATE printing_jobs
       SET status = CASE WHEN attempt_count < $4 THEN 'pending' ELSE 'failed' END,
           claimed_at = NULL,
           failed_at = CURRENT_TIMESTAMP,
           last_error = $3
       WHERE id = $1
         AND establishment_id = $2
         AND status = 'claimed'
       RETURNING *`,
      [jobId, establishmentId, truncatedError, MAX_ATTEMPTS]
    );
    await client.query('COMMIT');
    if (result.rows.length === 0) return null;
    return normalizeJob(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getBridgeQueueStatus(
  pool: Pool,
  establishmentId: string
): Promise<BridgeQueueStatus> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantContext(client, establishmentId);
    await releaseStaleClaims(client, establishmentId);
    await expireOldJobs(client, establishmentId);

    const countsResult = await client.query(
      `SELECT status, COUNT(*)::int AS count
       FROM printing_jobs
       WHERE establishment_id = $1
       GROUP BY status`,
      [establishmentId]
    );
    const counts: Record<BridgePrintJobStatus, number> = {
      pending: 0,
      claimed: 0,
      printed: 0,
      failed: 0,
      expired: 0,
    };
    for (const row of countsResult.rows as Array<{ status: BridgePrintJobStatus; count: number }>) {
      counts[row.status] = row.count;
    }

    const lastPrinted = await client.query(
      `SELECT printed_at
       FROM printing_jobs
       WHERE establishment_id = $1
         AND status = 'printed'
       ORDER BY printed_at DESC NULLS LAST
       LIMIT 1`,
      [establishmentId]
    );
    const lastFailed = await client.query(
      `SELECT failed_at, last_error
       FROM printing_jobs
       WHERE establishment_id = $1
         AND status IN ('failed', 'expired')
       ORDER BY failed_at DESC NULLS LAST
       LIMIT 1`,
      [establishmentId]
    );

    await client.query('COMMIT');

    const printedAt = lastPrinted.rows[0]?.printed_at;
    const failedAt = lastFailed.rows[0]?.failed_at;

    return {
      ...counts,
      lastPrintedAt: toIsoString(printedAt),
      lastFailedAt: toIsoString(failedAt),
      lastError: typeof lastFailed.rows[0]?.last_error === 'string' ? lastFailed.rows[0].last_error : null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
