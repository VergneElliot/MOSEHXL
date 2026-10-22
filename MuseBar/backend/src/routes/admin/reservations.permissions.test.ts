import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { pinActorTokenFor, withPinActor } from '../../test/pinActorTestUtils';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  list: vi.fn(),
  lookup: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../models/reservation', () => ({
  ReservationModel: {
    list: mocks.list,
    isValidStatus: (s: string) =>
      ['requested', 'confirmed', 'cancelled', 'no_show', 'seated', 'completed'].includes(s),
  },
}));

vi.mock('../../models/guestNoShowFlag', () => ({
  GuestNoShowFlagModel: {
    lookup: mocks.lookup,
  },
}));

import reservationsRouter from './reservations';

const app = express();
app.use(express.json());
app.use('/admin/reservations', reservationsRouter);

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

describe('admin reservations permission gate', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.list.mockReset();
    mocks.lookup.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.list.mockResolvedValue([]);
    mocks.lookup.mockResolvedValue(null);
  });

  it('denies GET / with the account JWT alone (no PIN actor)', async () => {
    const res = await request(app)
      .get('/admin/reservations')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('denies GET / when the PIN actor lacks access_reservations', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/reservations')
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_planning'])
    );

    expect(res.status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('allows GET / with access_reservations', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/reservations')
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_reservations'])
    );

    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(EST, expect.any(Object));
    expect(res.body).toEqual({ reservations: [] });
  });
});
