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
  logAction: vi.fn(),
}));

vi.mock('../models/database/productOptionGroupModel', () => ({
  ProductOptionGroupModel: {
    getAllActive: mocks.getAllActive,
    getById: mocks.getById,
    create: mocks.create,
    update: mocks.update,
    delete: mocks.delete,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: unknown }).user = {
      id: 3,
      email: 'menu@example.com',
      role: 'admin',
      is_admin: false,
      establishment_id: 'est-1',
    };
    return next();
  },
  getEstablishmentId: () => 'est-1',
  requireAnyPermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requirePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

import productOptionGroupsRouter from './productOptionGroups';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/product-option-groups', productOptionGroupsRouter);
  app.use(errorHandler);
  return app;
}

describe('product option groups routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logAction.mockResolvedValue(undefined);
  });

  it('GET / returns active groups', async () => {
    mocks.getAllActive.mockResolvedValue([
      {
        id: 1,
        name: 'Cuisson',
        is_required: true,
        allow_free_text: false,
        choices: [{ id: 10, label: 'Saignant' }],
      },
    ]);

    const response = await request(buildApp()).get('/api/product-option-groups');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Cuisson');
  });

  it('POST / creates a required preset group with choices', async () => {
    mocks.create.mockResolvedValue({
      id: 2,
      name: 'Cuisson',
      is_required: true,
      allow_free_text: false,
      choices: [{ id: 11, label: 'Bien cuit' }],
    });

    const response = await request(buildApp())
      .post('/api/product-option-groups')
      .send({
        name: 'Cuisson',
        is_required: true,
        choices: [{ label: 'Bien cuit' }],
      });

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cuisson',
        is_required: true,
        choices: [{ label: 'Bien cuit', display_order: undefined }],
      }),
      'est-1'
    );
  });

  it('POST / rejects required preset-only group without choices', async () => {
    const response = await request(buildApp())
      .post('/api/product-option-groups')
      .send({
        name: 'Cuisson',
        is_required: true,
        allow_free_text: false,
        choices: [],
      });

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('DELETE /:id soft-deletes assigned groups', async () => {
    mocks.delete.mockResolvedValue({ deleted: true, action: 'soft' });

    const response = await request(buildApp()).delete('/api/product-option-groups/4');
    expect(response.status).toBe(200);
    expect(response.body.action).toBe('soft');
  });
});
