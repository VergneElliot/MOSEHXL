import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from './auth';
import { pinActorTokenFor, withPinActor } from '../test/pinActorTestUtils';
import { errorHandler } from '../middleware/errorHandler';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getAll: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: { query: mocks.poolQuery },
}));

vi.mock('../models', () => ({
  CategoryModel: {
    getAll: mocks.getAll,
  },
}));

import categoriesRouter from './categories';

const app = express();
app.use(express.json());
app.use('/categories', categoriesRouter);
app.use(errorHandler);

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

function pinWith(permissions: string[]) {
  return pinActorTokenFor({ id: 12, establishmentId: EST, permissions });
}

describe('categories permission gate', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getAll.mockReset();
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) return { rows: [] };
      return { rows: [] };
    });
    mocks.getAll.mockResolvedValue([{ id: 1, name: 'Boissons' }]);
  });

  it('denies GET / with account JWT alone (no PIN actor)', async () => {
    const res = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
  });

  it('allows GET / with access_menu', async () => {
    const res = await withPinActor(
      request(app)
        .get('/categories')
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_menu'])
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'Boissons' }]);
  });
});
