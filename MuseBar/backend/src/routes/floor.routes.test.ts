import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  createTicket: vi.fn(),
  getOpenForTable: vi.fn(),
}));

vi.mock('../models/database/floorModel', () => ({
  FloorPlanModel: {
    list: mocks.list,
    create: mocks.create,
    get: mocks.get,
    update: vi.fn(),
    delete: vi.fn(),
  },
  DiningTableModel: {
    list: vi.fn(async () => []),
    listStatus: vi.fn(async () => []),
    get: mocks.get,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../models/database/openTicketModel', () => ({
  OpenTicketModel: {
    create: mocks.createTicket,
    getOpenForTable: mocks.getOpenForTable,
    get: vi.fn(),
    listItems: vi.fn(async () => []),
    replaceItems: vi.fn(),
    abandon: vi.fn(),
    closeWithOrder: vi.fn(),
  },
}));

vi.mock('./auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      id: 1,
      email: 'admin@test.com',
      is_admin: false,
      role: 'establishment_admin',
      establishment_id: '11111111-1111-1111-1111-111111111111',
    };
    next();
  },
  requirePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  getEstablishmentId: () => '11111111-1111-1111-1111-111111111111',
}));

vi.mock('../middleware/pinActor', async () => {
  const actual = await vi.importActual<typeof import('../middleware/pinActor')>('../middleware/pinActor');
  return {
    ...actual,
    requirePosPinActor: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.pinActor = {
        token_use: 'pin_actor',
        id: 7,
        email: 'waiter@test.com',
        role: 'staff',
        establishment_id: '11111111-1111-1111-1111-111111111111',
        display_name: 'Waiter',
        permissions: ['access_pos'],
      };
      next();
    },
  };
});

import floorRouter from './floor';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/floor', floorRouter);
  app.use(errorHandler);
  return app;
}

describe('floor routes Phase A', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists plans', async () => {
    mocks.list.mockResolvedValueOnce([{ id: 1, name: 'Salle' }]);
    const res = await request(buildApp()).get('/api/floor/plans');
    expect(res.status).toBe(200);
    expect(res.body.plans).toHaveLength(1);
  });

  it('opens a ticket when table is free', async () => {
    mocks.get.mockResolvedValueOnce({
      id: 3,
      is_active: true,
      establishment_id: '11111111-1111-1111-1111-111111111111',
    });
    mocks.getOpenForTable.mockResolvedValueOnce(null);
    mocks.createTicket.mockResolvedValueOnce({
      id: 99,
      dining_table_id: 3,
      status: 'open',
      opened_by_user_id: 7,
    });

    const res = await request(buildApp()).post('/api/floor/tickets').send({ dining_table_id: 3 });
    expect(res.status).toBe(201);
    expect(res.body.ticket.id).toBe(99);
  });

  it('rejects second open ticket on same table', async () => {
    mocks.get.mockResolvedValueOnce({ id: 3, is_active: true });
    mocks.getOpenForTable.mockResolvedValueOnce({ id: 50, status: 'open' });
    const res = await request(buildApp()).post('/api/floor/tickets').send({ dining_table_id: 3 });
    expect(res.status).toBe(409);
  });
});
