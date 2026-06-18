import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';

const mocks = vi.hoisted(() => ({
  loggerError: vi.fn(),
  randomUUID: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      error: mocks.loggerError,
    }),
  },
}));

vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomUUID: mocks.randomUUID,
  };
});

import {
  getActiveBridgeConfiguration,
  listPrintingConfigurations,
  parseConfigCell,
  savePrintingConfiguration,
} from './printingConfigRepo';

describe('printingConfigRepo', () => {
  beforeEach(() => {
    mocks.loggerError.mockReset();
    mocks.randomUUID.mockReset();
    delete process.env.APP_URL;
  });

  it('logs and returns empty object for invalid JSON config cells', () => {
    const parsed = parseConfigCell('{ invalid-json');
    expect(parsed).toEqual({});
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('lists configurations scoped by establishment and enriches Epson poll metadata', async () => {
    process.env.APP_URL = 'https://mosehxl.com';
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            provider: 'epson-server-direct',
            config: JSON.stringify({ pollKey: 'epson-key' }),
          },
        ],
      }),
    } as unknown as Pool;

    const rows = await listPrintingConfigurations(pool, 'est-1');

    expect((pool.query as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.stringContaining('WHERE establishment_id = $1'),
      ['est-1']
    );
    expect(rows[0].epson_server_direct_poll_key_header).toBe('x-epson-poll-key');
    expect(rows[0].epson_server_direct_poll_url).toContain('/api/printing/epson/poll?establishment_id=est-1');
  });

  it('enriches bridge configurations with local bridge env snippet', async () => {
    process.env.APP_URL = 'https://mosehxl.com';
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 2,
            provider: 'bridge',
            config: JSON.stringify({ bridgeKey: 'bridge-secret', printerLabel: 'Caisse' }),
          },
        ],
      }),
    } as unknown as Pool;

    const rows = await listPrintingConfigurations(pool, 'est-bridge');

    expect(rows[0].bridge_key_header).toBe('x-bridge-key');
    expect(rows[0].bridge_poll_url).toBe(
      'https://mosehxl.com/api/printing/bridge/poll?establishment_id=est-bridge'
    );
    expect(rows[0].bridge_env).toContain('MUSEBAR_API_URL=https://mosehxl.com');
    expect(rows[0].bridge_env).toContain('ESTABLISHMENT_ID=est-bridge');
    expect(rows[0].bridge_env).toContain('BRIDGE_KEY=bridge-secret');
  });

  it('saves configuration with tenant-scoped update/insert and auto-generates Epson poll key', async () => {
    mocks.randomUUID.mockReturnValue('generated-poll-key');
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // UPDATE deactivate previous
      .mockResolvedValueOnce({
        rows: [
          {
            id: 33,
            provider: 'epson-server-direct',
            config: JSON.stringify({ pollKey: 'generated-poll-key' }),
            is_active: true,
          },
        ],
      });
    const pool = { query } as unknown as Pool;

    const { configuration, mergedConfig } = await savePrintingConfiguration(
      pool,
      'est-2',
      'epson-server-direct',
      {}
    );

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE establishment_id = $1'),
      ['est-2']
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO printing_configurations'),
      ['est-2', 'epson-server-direct', JSON.stringify({ pollKey: 'generated-poll-key' })]
    );
    expect(mergedConfig).toEqual({ pollKey: 'generated-poll-key' });
    expect(configuration.config).toEqual({ pollKey: 'generated-poll-key' });
  });

  it('auto-generates bridge key when saving bridge configuration', async () => {
    mocks.randomUUID.mockReturnValue('generated-bridge-key');
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 34,
            provider: 'bridge',
            config: JSON.stringify({ bridgeKey: 'generated-bridge-key' }),
            is_active: true,
          },
        ],
      });
    const pool = { query } as unknown as Pool;

    const { configuration, mergedConfig } = await savePrintingConfiguration(pool, 'est-4', 'bridge', {});

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO printing_configurations'),
      ['est-4', 'bridge', JSON.stringify({ bridgeKey: 'generated-bridge-key' })]
    );
    expect(mergedConfig).toEqual({ bridgeKey: 'generated-bridge-key' });
    expect(configuration.config).toEqual({ bridgeKey: 'generated-bridge-key' });
  });

  it('returns active bridge config only for bridge provider', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set tenant
      .mockResolvedValueOnce({
        rows: [{ provider: 'bridge', config: JSON.stringify({ bridgeKey: 'secret' }) }],
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as unknown as Pool;

    await expect(getActiveBridgeConfiguration(pool, 'est-5')).resolves.toEqual({ bridgeKey: 'secret' });
    expect(query).toHaveBeenCalledWith("SELECT set_config('app.establishment_id', $1, true)", ['est-5']);
    expect(release).toHaveBeenCalled();
  });

  it('rejects unknown printing providers with statusCode 400', async () => {
    const pool = {
      query: vi.fn(),
    } as unknown as Pool;

    await expect(
      savePrintingConfiguration(pool, 'est-3', 'unknown-provider' as never, {})
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
