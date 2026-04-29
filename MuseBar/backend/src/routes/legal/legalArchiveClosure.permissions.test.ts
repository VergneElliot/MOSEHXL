import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getUserPermissions: vi.fn(),
  getArchiveExports: vi.fn(),
  getArchiveExportById: vi.fn(),
  exportData: vi.fn(),
  getClosureBulletins: vi.fn(),
  getLastFondDeCaisse: vi.fn(),
}));

vi.mock('../../app', () => ({
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

vi.mock('../../models/archiveService', () => ({
  ArchiveService: {
    getArchiveExports: mocks.getArchiveExports,
    getArchiveExportById: mocks.getArchiveExportById,
    exportData: mocks.exportData,
  },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    getClosureBulletins: mocks.getClosureBulletins,
    getClosureBulletinsPaginated: vi.fn(),
    getLastFondDeCaisse: mocks.getLastFondDeCaisse,
    createDailyClosure: vi.fn(),
    createWeeklyClosure: vi.fn(),
    createMonthlyClosure: vi.fn(),
    createAnnualClosure: vi.fn(),
  },
}));

import archiveRouter from './archive';
import closureRouter from './closure';

const app = express();
app.use(express.json());
app.use('/archive', archiveRouter);
app.use('/closure', closureRouter);

function tokenFor(role: 'establishment_admin' | 'staff') {
  return generateToken(
    {
      id: role === 'staff' ? 22 : 11,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: EST,
    },
    false
  );
}

describe('legal archive/closure permission gating', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.getArchiveExports.mockReset();
    mocks.getArchiveExportById.mockReset();
    mocks.exportData.mockReset();
    mocks.getClosureBulletins.mockReset();
    mocks.getLastFondDeCaisse.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.getArchiveExports.mockResolvedValue([]);
    mocks.getArchiveExportById.mockResolvedValue(null);
    mocks.exportData.mockResolvedValue({ id: 1 });
    mocks.getClosureBulletins.mockResolvedValue([]);
    mocks.getLastFondDeCaisse.mockResolvedValue(200);
  });

  it('denies /archive/list without access_closure', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/archive/list')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(mocks.getArchiveExports).not.toHaveBeenCalled();
  });

  it('allows /archive/list with access_closure', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);

    const res = await request(app)
      .get('/archive/list')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getArchiveExports).toHaveBeenCalledWith(EST);
  });

  it('allows /archive/:id with access_closure and scopes archive lookup', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);
    mocks.getArchiveExportById.mockResolvedValue({
      id: 12,
      establishment_id: EST,
      export_type: 'DAILY',
    });

    const res = await request(app)
      .get('/archive/12')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getArchiveExportById).toHaveBeenCalledWith(12, EST);
    expect(res.body.archive.id).toBe(12);
  });

  it('returns 404 for /archive/:id when archive is missing despite access_closure', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);
    mocks.getArchiveExportById.mockResolvedValue(null);

    const res = await request(app)
      .get('/archive/999')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(404);
    expect(mocks.getArchiveExportById).toHaveBeenCalledWith(999, EST);
    expect(res.body.error).toBe('Archive not found');
  });

  it('returns 400 for /archive/:id when archive id is invalid and skips lookup', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);

    const res = await request(app)
      .get('/archive/not-a-number')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid archive ID');
    expect(mocks.getArchiveExportById).not.toHaveBeenCalled();
  });

  it('returns 400 for /archive/create when required fields are missing', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);

    const res = await request(app)
      .post('/archive/create')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({ archiveType: 'DAILY' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Archive type, start date, and end date are required');
  });

  it('allows /archive/create with access_closure and sends establishment-scoped export payload', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);
    const archiveRecord = { id: 41, establishment_id: EST, export_type: 'DAILY' };
    mocks.exportData.mockResolvedValue(archiveRecord);

    const res = await request(app)
      .post('/archive/create')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({
        archiveType: 'DAILY',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

    expect(res.status).toBe(201);
    expect(mocks.exportData).toHaveBeenCalledWith(
      expect.objectContaining({
        export_type: 'DAILY',
        establishment_id: EST,
        created_by: '22',
        format: 'JSON',
        period_start: expect.any(Date),
        period_end: expect.any(Date),
      })
    );
    expect(res.body.archive.id).toBe(41);
  });

  it('returns 400 for /archive/:id/export when archive id is invalid', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);

    const res = await request(app)
      .post('/archive/not-a-number/export')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({ format: 'json' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid archive ID');
  });

  it('allows /archive/:id/export with access_closure and returns export payload contract', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);

    const res = await request(app)
      .post('/archive/77/export')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Archive exported successfully');
    expect(res.body.format).toBe('json');
    expect(res.body.export_data.archiveId).toBe(77);
    expect(res.body.export_data.format).toBe('json');
  });

  it('denies /closure/bulletins without access_closure', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/closure/bulletins')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(mocks.getClosureBulletins).not.toHaveBeenCalled();
  });

  it('allows /closure/bulletins with access_closure and scopes to caller establishment', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);
    mocks.getClosureBulletins.mockResolvedValue([
      { id: 1, closure_type: 'DAILY', establishment_id: EST },
    ]);

    const res = await request(app)
      .get('/closure/bulletins')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getClosureBulletins).toHaveBeenCalledWith(EST, undefined);
    expect(res.body.total).toBe(1);
  });

  it('allows /closure/monthly-latest with access_closure and uses monthly establishment scope', async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    mocks.getUserPermissions.mockResolvedValue(['access_closure']);
    mocks.getClosureBulletins.mockResolvedValue([
      {
        id: 77,
        closure_type: 'MONTHLY',
        period_start: monthStart,
        period_end: monthEnd,
        establishment_id: EST,
      },
    ]);

    const res = await request(app)
      .get('/closure/monthly-latest')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getClosureBulletins).toHaveBeenCalledWith(EST, 'MONTHLY');
    expect(res.body.id).toBe(77);
  });

  it('allows /closure/today-status with access_closure and strips total_transactions from bulletin', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_closure']);
    mocks.getClosureBulletins.mockResolvedValue([
      {
        id: 88,
        closure_type: 'DAILY',
        period_start: new Date().toISOString(),
        total_transactions: 22,
      },
    ]);
    mocks.getLastFondDeCaisse.mockResolvedValue(150);

    const res = await request(app)
      .get('/closure/today-status')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getClosureBulletins).toHaveBeenCalledWith(EST, 'DAILY');
    expect(mocks.getLastFondDeCaisse).toHaveBeenCalledWith(EST);
    expect(res.body.has_closure).toBe(true);
    expect(res.body.last_fond_de_caisse).toBe(150);
    expect(res.body.bulletin.total_transactions).toBeUndefined();
  });
});
