import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';
import type { Request, Response } from 'express';
import { epsonServerDirectPollHandler } from './epsonPollHandler';

const mocks = vi.hoisted(() => ({
  dequeueEposJob: vi.fn(),
}));

vi.mock('../services/printing', () => ({
  dequeueEposJob: mocks.dequeueEposJob,
}));

function makeReq(input: {
  query?: Record<string, unknown>;
  headers?: Record<string, string | undefined>;
}): Request {
  const headers = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );

  return {
    query: input.query ?? {},
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

function makeRes() {
  const state = {
    statusCode: 200,
    typeValue: '',
    body: '',
    headers: {} as Record<string, string>,
  };

  const res = {
    status: vi.fn((code: number) => {
      state.statusCode = code;
      return res;
    }),
    type: vi.fn((value: string) => {
      state.typeValue = value;
      return res;
    }),
    send: vi.fn((value: string) => {
      state.body = value;
      return res;
    }),
    setHeader: vi.fn((name: string, value: string) => {
      state.headers[name] = value;
    }),
  } as unknown as Response;

  return { res, state };
}

describe('epsonServerDirectPollHandler', () => {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn(),
  } as unknown as Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    (pool.connect as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client);
    client.query.mockReset();
    client.release.mockReset();
  });

  it('returns 200 and XML when header key is valid', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set_config
      .mockResolvedValueOnce({
        rows: [{ provider: 'epson-server-direct', config: { pollKey: 'secret-key' } }],
      }) // config select
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    mocks.dequeueEposJob.mockReturnValue({ id: 10, xml: '<epos-print />' });

    const req = makeReq({
      query: { establishment_id: '11111111-1111-4111-8111-111111111111' },
      headers: { 'x-epson-poll-key': 'secret-key' },
    });
    const { res, state } = makeRes();

    await epsonServerDirectPollHandler(pool, req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body).toBe('<epos-print />');
    expect(state.headers['Content-Type']).toBe('application/xml; charset=utf-8');
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      "SELECT set_config('app.establishment_id', $1, true)",
      ['11111111-1111-4111-8111-111111111111']
    );
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('accepts legacy query key fallback when header is missing', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ provider: 'epson-server-direct', config: { pollKey: 'legacy-key' } }],
      })
      .mockResolvedValueOnce({ rows: [] });
    mocks.dequeueEposJob.mockReturnValue(undefined);

    const req = makeReq({
      query: { establishment_id: '11111111-1111-4111-8111-111111111111', key: 'legacy-key' },
    });
    const { res, state } = makeRes();

    await epsonServerDirectPollHandler(pool, req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body).toBe('');
  });

  it('returns 403 when provided key is invalid', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ provider: 'epson-server-direct', config: { pollKey: 'expected-key' } }],
      })
      .mockResolvedValueOnce({ rows: [] });
    mocks.dequeueEposJob.mockReturnValue(undefined);

    const req = makeReq({
      query: { establishment_id: '11111111-1111-4111-8111-111111111111', key: 'wrong-key' },
    });
    const { res, state } = makeRes();

    await epsonServerDirectPollHandler(pool, req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body).toBe('Forbidden');
  });

  it('returns 400 for invalid establishment id format', async () => {
    const req = makeReq({
      query: { establishment_id: 'est-1', key: 'legacy-key' },
    });
    const { res, state } = makeRes();

    await epsonServerDirectPollHandler(pool, req, res);

    expect(state.statusCode).toBe(400);
    expect(state.body).toBe('Missing or invalid establishment_id');
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
