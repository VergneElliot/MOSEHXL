import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  getAllEstablishments: vi.fn(),
  getEstablishmentById: vi.fn(),
  deleteEstablishment: vi.fn(),
  createEstablishment: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
  poolQuery: vi.fn(),
}));

vi.mock('./auth', () => ({
  requireAuth: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../app', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../services/establishment', () => ({
  EstablishmentService: class {
    getAllEstablishments = mocks.getAllEstablishments;
    getEstablishmentById = mocks.getEstablishmentById;
    deleteEstablishment = mocks.deleteEstablishment;
  },
  EstablishmentCreationOrchestrator: class {
    createEstablishment = mocks.createEstablishment;
  },
}));

vi.mock('../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      info: mocks.loggerInfo,
      error: mocks.loggerError,
      warn: vi.fn(),
    }),
  },
}));

vi.mock('../config/environment', () => ({
  getEnvironmentConfig: () => ({}),
}));

vi.mock('../services/legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
}));

import enhancedEstablishmentsRouter from './enhancedEstablishments';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = {
    id: 11,
    role: 'system_admin',
    is_admin: true,
    establishment_id: null,
    email: 'admin@example.com',
  };
  next();
});
app.use('/establishments', enhancedEstablishmentsRouter);

describe('enhancedEstablishments software-event journaling', () => {
  beforeEach(() => {
    mocks.getAllEstablishments.mockReset();
    mocks.getEstablishmentById.mockReset();
    mocks.deleteEstablishment.mockReset();
    mocks.createEstablishment.mockReset();
    mocks.logSoftwareEventBestEffort.mockReset();
    mocks.loggerInfo.mockReset();
    mocks.loggerError.mockReset();

    mocks.getAllEstablishments.mockResolvedValue({ establishments: [], total: 0 });
    mocks.getEstablishmentById.mockResolvedValue({});
    mocks.deleteEstablishment.mockResolvedValue(undefined);
    mocks.createEstablishment.mockResolvedValue({
      success: true,
      establishment: { id: '22222222-2222-4222-8222-222222222222', name: 'Cafe Blue' },
    });
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('logs software event after successful establishment creation', async () => {
    const res = await request(app)
      .post('/establishments')
      .send({ name: 'Cafe Blue', email: 'owner@example.com' });

    expect(res.status).toBe(201);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith({
      establishmentId: '22222222-2222-4222-8222-222222222222',
      eventType: 'ESTABLISHMENT_CREATED',
      userId: '11',
      eventData: {
        establishment_id: '22222222-2222-4222-8222-222222222222',
        establishment_name: 'Cafe Blue',
      },
    });
  });

  it('logs software event after successful establishment deletion', async () => {
    const targetId = '33333333-3333-4333-8333-333333333333';
    const res = await request(app).delete(`/establishments/${targetId}`);

    expect(res.status).toBe(200);
    expect(mocks.deleteEstablishment).toHaveBeenCalledWith(targetId);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith({
      establishmentId: targetId,
      eventType: 'ESTABLISHMENT_DELETED',
      userId: '11',
      eventData: {
        establishment_id: targetId,
      },
    });
  });
});
