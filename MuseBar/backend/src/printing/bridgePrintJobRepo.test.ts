import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ackBridgePrintJob,
  claimNextBridgePrintJob,
  createBridgePrintJob,
  failBridgePrintJob,
  getBridgeQueueStatus,
} from './bridgePrintJobRepo';

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'j1',
    establishment_id: 'est-1',
    document_type: 'receipt',
    payload_format: 'escpos',
    payload_base64: 'abc',
    status: 'pending',
    attempt_count: 0,
    last_error: null,
    metadata: {},
    created_by_user_id: null,
    created_at: new Date(),
    claimed_at: null,
    printed_at: null,
    failed_at: null,
    expires_at: null,
    ...overrides,
  };
}

describe('bridgePrintJobRepo', () => {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const pool = { connect: vi.fn(async () => client) };

  beforeEach(() => {
    client.query.mockReset();
    client.release.mockReset();
    pool.connect.mockClear();
  });

  it('createBridgePrintJob inserts and normalizes', async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // set_config
      .mockResolvedValueOnce({ rows: [jobRow()] })
      .mockResolvedValueOnce({}); // COMMIT
    const job = await createBridgePrintJob(pool as never, {
      establishmentId: 'est-1',
      documentType: 'receipt',
      payloadFormat: 'escpos',
      payloadBase64: 'abc',
    });
    expect(job.id).toBe('j1');
    expect(client.release).toHaveBeenCalled();
  });

  it('claimNextBridgePrintJob returns null when empty', async () => {
    client.query.mockResolvedValue({ rows: [] });
    await expect(claimNextBridgePrintJob(pool as never, 'est-1')).resolves.toBeNull();
  });

  it('ack / fail update claimed jobs', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [jobRow({ status: 'printed' })] })
      .mockResolvedValueOnce({});
    await expect(ackBridgePrintJob(pool as never, 'est-1', 'j1')).resolves.toMatchObject({
      status: 'printed',
    });

    client.query.mockReset();
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [jobRow({ status: 'pending', last_error: 'boom' })] })
      .mockResolvedValueOnce({});
    await expect(failBridgePrintJob(pool as never, 'est-1', 'j1', 'boom')).resolves.toMatchObject({
      last_error: 'boom',
    });
  });

  it('getBridgeQueueStatus aggregates counts', async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // set_config
      .mockResolvedValueOnce({}) // releaseStaleClaims
      .mockResolvedValueOnce({}) // expireOldJobs
      .mockResolvedValueOnce({
        rows: [
          { status: 'pending', count: 1 },
          { status: 'printed', count: 2 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // lastPrinted
      .mockResolvedValueOnce({ rows: [] }) // lastFailed
      .mockResolvedValueOnce({}); // COMMIT
    const status = await getBridgeQueueStatus(pool as never, 'est-1');
    expect(status.pending).toBe(1);
    expect(status.printed).toBe(2);
  });
});
