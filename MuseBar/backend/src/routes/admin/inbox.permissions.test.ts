import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { pinActorTokenFor, withPinActor } from '../../test/pinActorTestUtils';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  listInboxConversations: vi.fn(),
  resolveVenueContactEmail: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../models/inboxConversations', () => ({
  listInboxConversations: mocks.listInboxConversations,
}));

vi.mock('../../services/establishment/venueContactEmail', () => ({
  resolveVenueContactEmail: mocks.resolveVenueContactEmail,
}));

import inboxRouter from './inbox';

const app = express();
app.use(express.json());
app.use('/admin/inbox', inboxRouter);

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

describe('admin inbox permission gate', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.listInboxConversations.mockReset();
    mocks.resolveVenueContactEmail.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      if (sql.includes('FROM establishments')) {
        return {
          rows: [{ slug: 'demo', admin_inbox_autoforward: true }],
        };
      }
      return { rows: [] };
    });

    mocks.listInboxConversations.mockResolvedValue({
      conversations: [],
      total: 0,
    });
    mocks.resolveVenueContactEmail.mockResolvedValue('owner@example.com');
  });

  it('denies GET / with the account JWT alone (no PIN actor)', async () => {
    const res = await request(app)
      .get('/admin/inbox')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
    expect(mocks.listInboxConversations).not.toHaveBeenCalled();
  });

  it('denies GET / when the PIN actor lacks access_inbox', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/inbox')
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_documents'])
    );

    expect(res.status).toBe(403);
    expect(mocks.listInboxConversations).not.toHaveBeenCalled();
  });

  it('allows GET / with access_inbox', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/inbox')
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_inbox'])
    );

    expect(res.status).toBe(200);
    expect(mocks.listInboxConversations).toHaveBeenCalledWith(
      EST,
      expect.objectContaining({ archived: false })
    );
    expect(res.body).toMatchObject({
      conversations: [],
      total: 0,
      inbox_address: 'demo@mosehxl.com',
      owner_email: 'owner@example.com',
    });
  });
});
