import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { P } from '../../permissions/registry';

// `middleware/auth` → `user` → `app` is pulled; avoid loading the real `app` (and thus
// the full category router) when this suite imports `orderLegal`.
vi.mock('../../db/pool', () => {
  return {
    __esModule: true,
    default: express(),
    pool: {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      connect: vi.fn().mockResolvedValue({ query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }),
    },
  };
});

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  addEntry: vi.fn().mockResolvedValue({ id: 99, sequence: 1 }),
}));

vi.mock('../../models', () => ({
  OrderModel: { getById: mocks.getById },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: { addEntry: mocks.addEntry },
}));

import orderLegal from './orderLegal';

const app = express();
app.use(express.json());
app.use('/legal', orderLegal);

const est = 'establishment-11111111-1111-1111-1111-111111111111';

function adminToken() {
  return generateToken(
    {
      id: 2,
      email: 'admin@example.com',
      is_admin: false,
      role: 'establishment_admin',
      establishment_id: est,
    },
    false
  );
}

function staffToken() {
  return generateToken(
    {
      id: 3,
      email: 'staff@example.com',
      is_admin: false,
      role: 'staff',
      establishment_id: est,
    },
    false
  );
}

const validBody = {
  orderId: 1,
  entryType: 'SALE',
  totalAmount: 10.5,
  totalTax: 2.1,
  paymentMethod: 'card',
  metadata: { note: 'test' },
};

describe('POST /legal/journal-entry (hardening)', () => {
  beforeEach(() => {
    mocks.getById.mockReset();
    mocks.addEntry.mockReset();
    mocks.addEntry.mockResolvedValue({ id: 99, sequence: 1 } as Record<string, unknown>);
  });

  it('returns 403 for non–establishment-admin (e.g. staff without admin role — same gate class as high-risk writes)', async () => {
    const res = await request(app)
      .post('/legal/journal-entry')
      .set('Authorization', `Bearer ${staffToken()}`)
      .send(validBody);
    expect(res.status).toBe(403);
    expect(mocks.getById).not.toHaveBeenCalled();
  });

  it('returns 404 when the order is not in the caller establishment', async () => {
    mocks.getById.mockResolvedValue(null);
    const res = await request(app)
      .post('/legal/journal-entry')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validBody);
    expect(res.status).toBe(404);
    expect(mocks.getById).toHaveBeenCalledWith(1, est);
  });

  it('returns 201 and ignores client userId, using JWT user id for addEntry', async () => {
    mocks.getById.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .post('/legal/journal-entry')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validBody, userId: 9999 });

    expect(res.status).toBe(201);
    expect(mocks.addEntry).toHaveBeenCalledWith(
      est,
      'SALE',
      1,
      10.5,
      2.1,
      'card',
      { note: 'test' },
      '2'
    );
  });

  it('documents that Historique cancels use requirePermission(orders_cancel) (registry key stable)', () => {
    expect(P.orders_cancel).toBe('orders_cancel');
  });
});
