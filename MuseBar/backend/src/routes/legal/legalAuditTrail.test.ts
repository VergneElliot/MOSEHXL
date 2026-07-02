import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { errorHandler } from '../../middleware/errorHandler';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getUserPermissions: vi.fn(),
  getEstablishmentAuditTrail: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    getUserPermissions: mocks.getUserPermissions,
  },
}));

vi.mock('../../models/auditTrail', () => ({
  AuditTrailModel: {
    getEstablishmentAuditTrail: mocks.getEstablishmentAuditTrail,
  },
}));

import auditRouter from './audit';

const app = express();
app.use(express.json());
app.use('/audit', auditRouter);
app.use(errorHandler);

function tokenFor(role: 'establishment_admin' | 'staff', establishmentId: string | null = EST) {
  return generateToken(
    {
      id: role === 'staff' ? 12 : 7,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: establishmentId,
    },
    false
  );
}

describe('legal audit trail route', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.getEstablishmentAuditTrail.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.getEstablishmentAuditTrail.mockResolvedValue({
      entries: [{ id: 1, action_type: 'LOGIN', timestamp: new Date() }],
      total: 1,
    });
  });

  it('denies /audit/trail for non-admin staff', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const res = await request(app)
      .get('/audit/trail')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);
    expect(res.status).toBe(403);
    expect(mocks.getEstablishmentAuditTrail).not.toHaveBeenCalled();
  });

  it('allows /audit/trail for establishment_admin and returns audit entries', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const res = await request(app)
      .get('/audit/trail?limit=25&offset=0')
      .set('Authorization', `Bearer ${tokenFor('establishment_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.audit_entries).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(mocks.getEstablishmentAuditTrail).toHaveBeenCalledWith(
      EST,
      expect.objectContaining({ limit: 25, offset: 0 })
    );
  });
});
