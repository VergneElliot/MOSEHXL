import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { pinActorTokenFor, withPinActor } from '../../test/pinActorTestUtils';
import { DOCUMENT_CATEGORIES } from '../../services/admin/documentCategories';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

import documentsRouter from './documents';

const app = express();
app.use(express.json());
app.use('/admin/documents', documentsRouter);

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

describe('admin documents permission gate', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
  });

  it('denies GET /categories with the account JWT alone (no PIN actor)', async () => {
    const res = await request(app)
      .get('/admin/documents/categories')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
  });

  it('denies GET /categories when the PIN actor lacks access_documents', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/documents/categories')
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_inbox'])
    );

    expect(res.status).toBe(403);
  });

  it('allows GET /categories with access_documents', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/documents/categories')
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_documents'])
    );

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual(DOCUMENT_CATEGORIES);
  });
});
