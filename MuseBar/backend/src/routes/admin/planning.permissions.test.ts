import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { pinActorTokenFor, withPinActor } from '../../test/pinActorTestUtils';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  list: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../models/staffShift', () => ({
  StaffShiftModel: {
    list: mocks.list,
  },
  isValidRecurrence: () => true,
}));

import planningRouter from './planning';

const app = express();
app.use(express.json());
app.use('/admin/planning', planningRouter);

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

const FROM = '2026-04-01T00:00:00.000Z';
const TO = '2026-04-08T00:00:00.000Z';

describe('admin planning permission gate', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.list.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.list.mockResolvedValue([]);
  });

  it('denies GET /shifts with the account JWT alone (no PIN actor)', async () => {
    const res = await request(app)
      .get('/admin/planning/shifts')
      .query({ from: FROM, to: TO })
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('denies GET /shifts when the PIN actor lacks access_planning', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/planning/shifts')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_documents'])
    );

    expect(res.status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('allows GET /shifts with access_planning', async () => {
    const res = await withPinActor(
      request(app)
        .get('/admin/planning/shifts')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${tokenFor('staff')}`),
      pinWith(['access_planning'])
    );

    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(
      EST,
      expect.objectContaining({ from: FROM, to: TO })
    );
    expect(res.body).toEqual({ shifts: [] });
  });
});
