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
  getAllArchived: vi.fn(),
  getAllIncludingArchived: vi.fn(),
  getByCategory: vi.fn(),
  getById: vi.fn(),
  getTop: vi.fn(),
  enrich: vi.fn(async (products: unknown[]) => products),
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: { query: mocks.poolQuery },
}));

vi.mock('../models', () => ({
  ProductModel: {
    getAll: mocks.getAll,
    getAllArchived: mocks.getAllArchived,
    getAllIncludingArchived: mocks.getAllIncludingArchived,
    getByCategory: mocks.getByCategory,
    getById: mocks.getById,
  },
}));

vi.mock('../services/kitchenPrinting/kitchenPrinterCatalogService', () => ({
  enrichProductsWithOperationalCatalog: mocks.enrich,
}));

vi.mock('../models/legalJournal/businessDayStatsRepository', () => ({
  BusinessDayStatsRepository: {
    getTopProductsForEstablishment: mocks.getTop,
  },
}));

import productsRouter from './products';

const app = express();
app.use(express.json());
app.use('/products', productsRouter);
app.use(errorHandler);

function token() {
  return generateToken(
    {
      id: 12,
      email: 'staff@example.com',
      is_admin: false,
      role: 'staff',
      establishment_id: EST,
    },
    false
  );
}

function pin() {
  return pinActorTokenFor({ id: 12, establishmentId: EST, permissions: ['access_pos', 'access_menu'] });
}

describe('products read endpoints (happy paths)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
    });
    mocks.enrich.mockImplementation(async (products: unknown[]) => products);
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) return { rows: [] };
      return { rows: [] };
    });
    mocks.getAll.mockResolvedValue([{ id: 1 }]);
    mocks.getAllArchived.mockResolvedValue([{ id: 2 }]);
    mocks.getAllIncludingArchived.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mocks.getByCategory.mockResolvedValue([{ id: 3 }]);
    mocks.getById.mockResolvedValue({ id: 9, name: 'Café' });
    mocks.getTop.mockResolvedValue([{ product_id: 1, qty: 5 }]);
  });

  it('GET /archived /all /category /:id /top-sellers', async () => {
    const auth = { Authorization: `Bearer ${token()}` };
    const pinTok = pin();

    let res = await withPinActor(request(app).get('/products/archived').set(auth), pinTok);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 2 }]);

    res = await withPinActor(request(app).get('/products/all').set(auth), pinTok);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    res = await withPinActor(request(app).get('/products/category/4').set(auth), pinTok);
    expect(res.status).toBe(200);
    expect(mocks.getByCategory).toHaveBeenCalledWith(4, EST);

    res = await withPinActor(request(app).get('/products/9').set(auth), pinTok);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 9, name: 'Café' });

    res = await withPinActor(request(app).get('/products/top-sellers?limit=3').set(auth), pinTok);
    expect(res.status).toBe(200);
    expect(mocks.getTop).toHaveBeenCalledWith(EST, 3);
    expect(res.body.products).toEqual([{ product_id: 1, qty: 5 }]);
  });
});
