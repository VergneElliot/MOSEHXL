import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/errorHandler';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  runWithTenant: vi.fn(async (_ctx: unknown, fn: () => Promise<unknown>) => fn()),
  getHours: vi.fn(),
  isConfigured: vi.fn(),
  getClosed: vi.fn(),
  resolveContact: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../rls/tenantContext', () => ({
  runWithTenantContext: mocks.runWithTenant,
}));

vi.mock('../../models/openingHoursSettings', () => ({
  OpeningHoursSettingsModel: {
    get: mocks.getHours,
    isConfigured: mocks.isConfigured,
  },
}));

vi.mock('../../models/reservationClosedDates', () => ({
  ReservationClosedDatesModel: {
    get: mocks.getClosed,
  },
}));

vi.mock('../../services/establishment/venueContactEmail', () => ({
  resolveVenueContactEmail: mocks.resolveContact,
}));

vi.mock('../../middleware/security/AuthEndpointRateLimit', () => ({
  createAuthRateLimitMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import reservationsRouter from './reservations';

const app = express();
app.use(express.json());
app.use('/public/reservations', reservationsRouter);
app.use(errorHandler);

describe('public reservations GET /:slug', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
    });
    mocks.runWithTenant.mockImplementation(async (_ctx: unknown, fn: () => Promise<unknown>) => fn());
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: EST, name: 'Café', email: null, timezone: 'Europe/Paris', slug: 'cafedemo' }],
    });
    mocks.resolveContact.mockResolvedValue('venue@example.com');
    mocks.getHours.mockResolvedValue({
      timezone: 'Europe/Paris',
      weekly: { mon: { closed: false, open: '11:00', close: '23:00' } },
    });
    mocks.isConfigured.mockResolvedValue(true);
    mocks.getClosed.mockResolvedValue({ dates: ['2026-12-25'] });
  });

  it('returns establishment public booking payload', async () => {
    const res = await request(app).get('/public/reservations/cafedemo');
    expect(res.status).toBe(200);
    expect(res.body.establishment).toEqual({ name: 'Café', slug: 'cafedemo' });
    expect(res.body.opening_hours_configured).toBe(true);
    expect(res.body.closed_dates).toEqual(['2026-12-25']);
    expect(res.body.timezone).toBe('Europe/Paris');
  });

  it('returns 404 for invalid slug', async () => {
    const res = await request(app).get('/public/reservations/BAD_SLUG!!');
    expect(res.status).toBe(404);
  });

  it('returns 404 when establishment is missing', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/public/reservations/unknownslug');
    expect(res.status).toBe(404);
  });
});
