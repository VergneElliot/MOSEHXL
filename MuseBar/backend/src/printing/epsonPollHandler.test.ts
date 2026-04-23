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
  const pool = {
    query: vi.fn(),
  } as unknown as Pool;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and XML when header key is valid', async () => {
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ provider: 'epson-server-direct', config: { pollKey: 'secret-key' } }],
    });
    mocks.dequeueEposJob.mockReturnValue({ id: 10, xml: '<epos-print />' });

    const req = makeReq({
      query: { establishment_id: 'est-1' },
      headers: { 'x-epson-poll-key': 'secret-key' },
    });
    const { res, state } = makeRes();

    await epsonServerDirectPollHandler(pool, req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body).toBe('<epos-print />');
    expect(state.headers['Content-Type']).toBe('application/xml; charset=utf-8');
  });

  it('accepts legacy query key fallback when header is missing', async () => {
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ provider: 'epson-server-direct', config: { pollKey: 'legacy-key' } }],
    });
    mocks.dequeueEposJob.mockReturnValue(undefined);

    const req = makeReq({
      query: { establishment_id: 'est-1', key: 'legacy-key' },
    });
    const { res, state } = makeRes();

    await epsonServerDirectPollHandler(pool, req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body).toBe('');
  });

  it('returns 403 when provided key is invalid', async () => {
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ provider: 'epson-server-direct', config: { pollKey: 'expected-key' } }],
    });
    mocks.dequeueEposJob.mockReturnValue(undefined);

    const req = makeReq({
      query: { establishment_id: 'est-1', key: 'wrong-key' },
    });
    const { res, state } = makeRes();

    await epsonServerDirectPollHandler(pool, req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body).toBe('Forbidden');
  });
});
