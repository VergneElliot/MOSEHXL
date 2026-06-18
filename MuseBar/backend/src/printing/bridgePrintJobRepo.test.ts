import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';

import {
  ackBridgePrintJob,
  claimNextBridgePrintJob,
  createBridgePrintJob,
  failBridgePrintJob,
  getBridgeQueueStatus,
} from './bridgePrintJobRepo';

describe('bridgePrintJobRepo', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('creates durable bridge jobs with ESC/POS payloads', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set tenant
      .mockResolvedValueOnce({
        rows: [{
          id: 'job-1',
          establishment_id: 'est-1',
          document_type: 'receipt',
          payload_format: 'escpos',
          payload_base64: 'abc=',
          status: 'pending',
          attempt_count: 0,
          metadata: { order_id: 7 },
          created_by_user_id: 8,
          created_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as unknown as Pool;

    const job = await createBridgePrintJob(pool, {
      establishmentId: 'est-1',
      documentType: 'receipt',
      payloadFormat: 'escpos',
      payloadBase64: 'abc=',
      createdByUserId: 8,
      metadata: { order_id: 7 },
    });

    expect(job.id).toBe('job-1');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO printing_jobs'),
      expect.arrayContaining(['est-1', 'receipt', 'escpos', 'abc=', 8])
    );
    expect(query).toHaveBeenCalledWith("SELECT set_config('app.establishment_id', $1, true)", ['est-1']);
    expect(release).toHaveBeenCalled();
  });

  it('claims the oldest pending job inside a transaction', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set tenant
      .mockResolvedValueOnce({ rows: [] }) // release stale
      .mockResolvedValueOnce({ rows: [] }) // expire old
      .mockResolvedValueOnce({
        rows: [{
          id: 'job-2',
          establishment_id: 'est-1',
          document_type: 'test',
          payload_format: 'escpos',
          payload_base64: 'abc=',
          status: 'claimed',
          attempt_count: 1,
          metadata: {},
          created_by_user_id: null,
          created_at: new Date(),
          claimed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    const job = await claimNextBridgePrintJob(pool, 'est-1');

    expect(job?.id).toBe('job-2');
    expect(query).toHaveBeenCalledWith('BEGIN');
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE SKIP LOCKED'), ['est-1']);
    expect(release).toHaveBeenCalled();
  });

  it('acks and fails only claimed jobs owned by the establishment', async () => {
    const printed = {
      id: 'job-3',
      establishment_id: 'est-1',
      document_type: 'receipt',
      payload_format: 'escpos',
      payload_base64: 'abc=',
      status: 'printed',
      attempt_count: 1,
      metadata: {},
      created_by_user_id: null,
      created_at: new Date(),
      printed_at: new Date(),
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set tenant
      .mockResolvedValueOnce({ rows: [printed] })
      .mockResolvedValueOnce({ rows: [] }) // COMMIT
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set tenant
      .mockResolvedValueOnce({ rows: [{ ...printed, status: 'pending', last_error: 'offline' }] })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as unknown as Pool;

    const acked = await ackBridgePrintJob(pool, 'est-1', 'job-3');
    const failed = await failBridgePrintJob(pool, 'est-1', 'job-4', 'offline');

    expect(acked?.status).toBe('printed');
    expect(failed?.last_error).toBe('offline');
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("AND status = 'claimed'"),
      ['job-3', 'est-1']
    );
    expect(query).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining("CASE WHEN attempt_count < $4 THEN 'pending' ELSE 'failed' END"),
      ['job-4', 'est-1', 'offline', 3]
    );
  });

  it('summarizes queue status and recent errors', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set tenant
      .mockResolvedValueOnce({ rows: [] }) // release stale
      .mockResolvedValueOnce({ rows: [] }) // expire old
      .mockResolvedValueOnce({
        rows: [
          { status: 'pending', count: 2 },
          { status: 'failed', count: 1 },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ printed_at: new Date('2026-06-18T10:00:00Z') }] })
      .mockResolvedValueOnce({
        rows: [{ failed_at: new Date('2026-06-18T11:00:00Z'), last_error: 'offline' }],
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as unknown as Pool;

    const status = await getBridgeQueueStatus(pool, 'est-1');

    expect(status.pending).toBe(2);
    expect(status.failed).toBe(1);
    expect(status.lastError).toBe('offline');
    expect(status.lastPrintedAt).toBe('2026-06-18T10:00:00.000Z');
  });
});
