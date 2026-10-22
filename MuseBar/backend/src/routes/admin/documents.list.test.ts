import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { pinActorTokenFor, withPinActor } from '../../test/pinActorTestUtils';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  list: vi.fn(),
  isConfigured: vi.fn(() => false),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../models/adminDocument', () => ({
  AdminDocumentModel: { list: mocks.list },
}));

vi.mock('../../services/storage/objectStorage', () => ({
  isObjectStorageConfigured: mocks.isConfigured,
  buildEstablishmentObjectKey: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  putObject: vi.fn(),
  ObjectStorageNotConfiguredError: class extends Error {},
}));

import documentsRouter from './documents';

const app = express();
app.use(express.json());
app.use('/admin/documents', documentsRouter);

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
  return pinActorTokenFor({ id: 12, establishmentId: EST, permissions: ['access_documents'] });
}

describe('admin documents list happy path', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.list.mockReset();
    mocks.isConfigured.mockReturnValue(false);
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) return { rows: [] };
      return { rows: [] };
    });
    mocks.list.mockResolvedValue([{ id: 'doc-1', title: 'Menu' }]);
  });

  it('GET / returns documents and storageConfigured', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/documents?category=menus&q=carte')
        .set('Authorization', `Bearer ${token()}`),
      pin()
    );
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(EST, { category: 'menus', q: 'carte' });
    expect(res.body).toEqual({
      documents: [{ id: 'doc-1', title: 'Menu' }],
      storageConfigured: false,
    });
  });
});
