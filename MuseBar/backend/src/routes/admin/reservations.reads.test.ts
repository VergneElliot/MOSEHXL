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
  isConfigured: vi.fn(),
  getClosed: vi.fn(),
  setDateClosed: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../models/reservation', () => ({
  ReservationModel: {
    list: mocks.list,
    isValidStatus: () => true,
  },
}));

vi.mock('../../models/guestNoShowFlag', () => ({
  GuestNoShowFlagModel: { lookup: mocks.lookup },
}));

vi.mock('../../models/openingHoursSettings', () => ({
  OpeningHoursSettingsModel: { isConfigured: mocks.isConfigured },
}));

vi.mock('../../models/reservationClosedDates', () => ({
  ReservationClosedDatesModel: {
    get: mocks.getClosed,
    setDateClosed: mocks.setDateClosed,
  },
}));

import reservationsRouter from './reservations';

const app = express();
app.use(express.json());
app.use('/admin/reservations', reservationsRouter);

function auth() {
  return {
    Authorization: `Bearer ${generateToken(
      {
        id: 12,
        email: 'staff@example.com',
        is_admin: false,
        role: 'staff',
        establishment_id: EST,
      },
      false
    )}`,
  };
}

function pin() {
  return pinActorTokenFor({ id: 12, establishmentId: EST, permissions: ['access_reservations'] });
}

describe('admin reservations read/write happy paths', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
    });
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) return { rows: [] };
      if (sql.includes('FROM establishments')) {
        return { rows: [{ slug: 'cafedemo', name: 'Café' }] };
      }
      return { rows: [] };
    });
    mocks.list.mockResolvedValue([
      {
        id: 1,
        customer_email: 'a@b.com',
        customer_phone: null,
      },
    ]);
    mocks.lookup.mockResolvedValue({ no_show_count: 0 });
    mocks.isConfigured.mockResolvedValue(true);
    mocks.getClosed.mockResolvedValue({ dates: ['2026-12-25'] });
    mocks.setDateClosed.mockResolvedValue({ dates: ['2026-12-25', '2026-12-26'] });
    process.env.FRONTEND_URL = 'https://app.example.com';
  });

  it('GET /public-link /closed-dates and PUT closed-dates', async () => {
    let res = await withPinActor(
      request(app).get('/admin/reservations/public-link').set(auth()),
      pin()
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      slug: 'cafedemo',
      url: 'https://app.example.com/reserve/cafedemo',
      opening_hours_configured: true,
    });

    res = await withPinActor(
      request(app).get('/admin/reservations/closed-dates').set(auth()),
      pin()
    );
    expect(res.status).toBe(200);
    expect(res.body.dates).toEqual(['2026-12-25']);

    res = await withPinActor(
      request(app)
        .put('/admin/reservations/closed-dates/2026-12-26')
        .set(auth())
        .send({ closed: true }),
      pin()
    );
    expect(res.status).toBe(200);
    expect(mocks.setDateClosed).toHaveBeenCalledWith(EST, '2026-12-26', true);
  });

  it('GET / enriches guest reliability', async () => {
    const res = await withPinActor(request(app).get('/admin/reservations').set(auth()), pin());
    expect(res.status).toBe(200);
    expect(res.body.reservations[0].guest_reliability).toEqual({ no_show_count: 0 });
  });
});
