import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import type { BusinessSetupRequest, SetupContext } from '../types';

vi.mock('../../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { SetupAuditManager } from './SetupAuditManager';

function buildSetupData(): BusinessSetupRequest {
  return {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    password: 'Password123',
    confirm_password: 'Password123',
    business_name: 'Muse Bar',
    contact_email: 'contact@musebar.test',
    phone: '+33123456789',
    address: '1 rue de Paris',
    invitation_token: 'invitation-token-value',
  };
}

function buildContext(): SetupContext {
  return {
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    sessionId: 'session-1',
    timestamp: new Date('2026-04-29T12:00:00.000Z'),
  };
}

describe('SetupAuditManager', () => {
  it('writes setup audit entries using canonical audit_trail columns', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;

    await SetupAuditManager.createSetupAuditTrail(
      client,
      7,
      '11111111-1111-4111-8111-111111111111',
      buildSetupData(),
      buildContext()
    );

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('action_type');
    expect(sql).toContain('resource_type');
    expect(sql).toContain('action_details');
    expect(sql).not.toContain('old_values');
    expect(sql).not.toContain('new_values');
    expect(values[1]).toBe('BUSINESS_SETUP_COMPLETED');
    expect(values[2]).toBe('ESTABLISHMENT');
    expect(values[8]).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('queries setup history using action_type filters and proper tenant scoping', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    await SetupAuditManager.getSetupAuditHistory(
      pool,
      '11111111-1111-4111-8111-111111111111',
      10
    );

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, values] = pool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('action_type');
    expect(sql).toContain('SETUP_STEP_%');
    expect(sql).not.toContain(' action LIKE ');
    expect(values).toEqual(['11111111-1111-4111-8111-111111111111', 10]);
  });
});
