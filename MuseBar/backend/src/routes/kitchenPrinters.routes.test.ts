import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  getAllActive: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  enqueueTest: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock('../models/database/kitchenPrinterModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../models/database/kitchenPrinterModel')>();
  return {
    ...actual,
    KitchenPrinterModel: {
      getAllActive: mocks.getAllActive,
      getById: mocks.getById,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  };
});

vi.mock('../services/kitchenPrinting/kitchenPrinterTestPrintService', () => ({
  enqueueKitchenPrinterTestPrint: mocks.enqueueTest,
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {},
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { id: number } }).user = { id: 3 };
    return next();
  },
  getEstablishmentId: () => 'est-1',
  requireAnyPermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requirePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

import kitchenPrintersRouter from './kitchenPrinters';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/kitchen-printers', kitchenPrintersRouter);
  app.use(errorHandler);
  return app;
}

describe('kitchen printers routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logAction.mockResolvedValue(undefined);
  });

  it('GET / returns active printers', async () => {
    mocks.getAllActive.mockResolvedValue([
      { id: 1, name: 'Bar', slug: 'bar', connection_type: 'bridge', connection_config: {} },
    ]);

    const response = await request(buildApp()).get('/api/kitchen-printers');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].slug).toBe('bar');
  });

  it('POST / creates a bridge printer', async () => {
    mocks.create.mockResolvedValue({
      id: 2,
      name: 'Cuisine',
      slug: 'cuisine',
      connection_type: 'bridge',
      connection_config: { bridgeTarget: 'cuisine' },
    });

    const response = await request(buildApp())
      .post('/api/kitchen-printers')
      .send({ name: 'Cuisine', connection_type: 'bridge' });

    expect(response.status).toBe(201);
    expect(response.body.slug).toBe('cuisine');
    expect(mocks.create).toHaveBeenCalled();
  });

  it('POST /:id/test-print enqueues a dry test job', async () => {
    mocks.getById.mockResolvedValue({
      id: 1,
      name: 'Bar',
      slug: 'bar',
      connection_type: 'bridge',
      connection_config: { bridgeTarget: 'bar' },
    });
    mocks.enqueueTest.mockResolvedValue({ jobId: 'job-1' });

    const response = await request(buildApp()).post('/api/kitchen-printers/1/test-print');
    expect(response.status).toBe(202);
    expect(response.body.job_id).toBe('job-1');
    expect(mocks.enqueueTest).toHaveBeenCalled();
  });
});
