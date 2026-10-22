import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  isConfigured: vi.fn(),
  validateConfiguration: vi.fn(),
  isObjectStorageConfigured: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../services/email/EmailService', () => ({
  EmailService: {
    getInstance: () => ({
      isConfigured: mocks.isConfigured,
      validateConfiguration: mocks.validateConfiguration,
    }),
  },
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

vi.mock('../../services/storage/objectStorage', () => ({
  isObjectStorageConfigured: mocks.isObjectStorageConfigured,
}));

import emailStatusRouter from './emailStatus';

const app = express();
app.use(express.json());
app.use('/admin/email-status', emailStatusRouter);

function tokenFor(role: 'establishment_admin' | 'staff') {
  return generateToken(
    {
      id: role === 'staff' ? 12 : 7,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: EST,
    },
    false
  );
}

describe('admin email-status JWT role gate', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.isConfigured.mockReset();
    mocks.validateConfiguration.mockReset();
    mocks.isObjectStorageConfigured.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.isConfigured.mockReturnValue(true);
    mocks.validateConfiguration.mockReturnValue({ ok: true, errors: [] });
    mocks.isObjectStorageConfigured.mockReturnValue(false);
  });

  it('denies GET / for staff JWT without establishment_admin role', async () => {
    const res = await request(app)
      .get('/admin/email-status')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/administrator/i);
    expect(mocks.isConfigured).not.toHaveBeenCalled();
  });

  it('allows GET / for establishment_admin JWT (no PIN required)', async () => {
    const res = await request(app)
      .get('/admin/email-status')
      .set('Authorization', `Bearer ${tokenFor('establishment_admin')}`);

    expect(res.status).toBe(200);
    expect(mocks.isConfigured).toHaveBeenCalled();
    expect(res.body).toMatchObject({
      sendgrid_configured: true,
      object_storage_configured: false,
    });
    expect(Array.isArray(res.body.notes)).toBe(true);
  });
});
