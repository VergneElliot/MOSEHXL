import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from './auth';
import { pinActorTokenFor, withPinActor } from '../test/pinActorTestUtils';
import { errorHandler } from '../middleware/errorHandler';

const EST = '11111111-1111-4111-8111-111111111111';
const SID = '22222222-2222-4222-8222-222222222222';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  aggregate: vi.fn(),
  insert: vi.fn(),
  listOverlapping: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../services/pinSessions/pinSessionReportAggregate', () => ({
  aggregatePinSessionReport: mocks.aggregate,
}));

vi.mock('../models/pinSessionReport', () => ({
  PinSessionReportModel: {
    insert: mocks.insert,
    listForSession: vi.fn(async () => []),
    findById: vi.fn(async () => null),
  },
}));

vi.mock('../models/staffPinSession', () => ({
  StaffPinSessionModel: {
    listOverlappingPeriod: mocks.listOverlapping,
    closeStale: vi.fn(),
    closeDuplicateOpens: vi.fn(),
    listActive: vi.fn(async () => []),
    findActive: vi.fn(),
  },
}));

vi.mock('../models/closureSettings', () => ({
  ClosureSettingsModel: {
    getClosureSettings: vi.fn(async () => ({
      daily_closure_time: '02:00',
      timezone: 'Europe/Paris',
    })),
  },
}));

vi.mock('../models/legalJournal/businessDayPeriod', () => ({
  getBusinessDayPeriod: vi.fn(() => ({
    start: { toDate: () => new Date('2026-10-27T00:00:00Z'), format: () => '2026-10-28', toISOString: () => '2026-10-27T00:00:00.000Z' },
    end: { toDate: () => new Date('2026-10-28T00:00:00Z'), toISOString: () => '2026-10-28T00:00:00.000Z' },
  })),
}));

import pinSessionsRouter from './pinSessions';

const app = express();
app.use(express.json());
app.use('/api/auth/pin/sessions', pinSessionsRouter);
app.use(errorHandler);

function tokenFor(role: 'establishment_admin' | 'staff' = 'staff') {
  return generateToken(
    {
      id: 12,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: EST,
    },
    false
  );
}

describe('pin session reports permissions', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.aggregate.mockReset();
    mocks.insert.mockReset();
    mocks.listOverlapping.mockReset();
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) return { rows: [] };
      return { rows: [] };
    });
    mocks.listOverlapping.mockResolvedValue([]);
    mocks.aggregate.mockResolvedValue({
      informational: true,
      pin_session_id: SID,
      staff_user_id: 12,
      staff_display_name: 'Test',
      period_start: '2026-10-28T10:00:00.000Z',
      period_end: '2026-10-28T12:00:00.000Z',
      session_closed: false,
      order_count: 0,
      total_amount: 0,
      payment_breakdown: {},
      vat_breakdown: {
        vat_10: { amount: 0, vat: 0, ttc: 0 },
        vat_20: { amount: 0, vat: 0, ttc: 0 },
      },
      order_ids: [],
    });
    mocks.insert.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      snapshot: mocks.aggregate.mock.results[0]?.value,
    });
  });

  it('denies report-preview without PIN actor', async () => {
    const res = await request(app)
      .get(`/api/auth/pin/sessions/${SID}/report-preview`)
      .set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
  });

  it('allows report-preview with PIN + access_pos', async () => {
    const res = await withPinActor(
      request(app)
        .get(`/api/auth/pin/sessions/${SID}/report-preview`)
        .set('Authorization', `Bearer ${tokenFor()}`),
      pinActorTokenFor({ id: 12, establishmentId: EST, permissions: ['access_pos'] })
    );
    expect(res.status).toBe(200);
    expect(res.body.data.informational).toBe(true);
  });

  it('persists a report on POST', async () => {
    const res = await withPinActor(
      request(app)
        .post(`/api/auth/pin/sessions/${SID}/reports`)
        .set('Authorization', `Bearer ${tokenFor()}`),
      pinActorTokenFor({ id: 12, establishmentId: EST, permissions: ['access_pos'] })
    );
    expect(res.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalled();
  });

  it('lists sessions by day with PIN', async () => {
    const res = await withPinActor(
      request(app)
        .get('/api/auth/pin/sessions/by-day?date=2026-10-28')
        .set('Authorization', `Bearer ${tokenFor()}`),
      pinActorTokenFor({ id: 12, establishmentId: EST, permissions: ['access_pos'] })
    );
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([]);
  });
});
