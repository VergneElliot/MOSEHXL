import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { pinActorTokenFor, withPinActor } from '../../test/pinActorTestUtils';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getOpenEntry: vi.fn(),
  getNetwork: vi.fn(),
  list: vi.fn(),
  totalsByUser: vi.fn(),
  buildComplianceReport: vi.fn(),
  buildPayrollSummary: vi.fn(),
  buildAccountantCsv: vi.fn(() => 'csv'),
  listUsers: vi.fn(),
  listClocked: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../models/timeEntry', () => ({
  TimeClockNetworkSettingsModel: { get: mocks.getNetwork },
  TimeEntryModel: {
    getOpenEntry: mocks.getOpenEntry,
    list: mocks.list,
    totalsByUser: mocks.totalsByUser,
    listCurrentlyClockedIn: mocks.listClocked,
  },
  isIpAllowed: () => true,
  isValidIpOrCidr: () => true,
  normalizeAllowedIps: (ips: string[]) => ips,
}));

vi.mock('../../models/user', () => ({
  UserModel: { listUsersByEstablishment: mocks.listUsers },
}));

vi.mock('../../services/labor/laborReportService', () => ({
  buildComplianceReport: mocks.buildComplianceReport,
  buildPayrollCsv: vi.fn(() => 'detail-csv'),
}));

vi.mock('../../services/labor/payrollReportService', () => ({
  buildAccountantCsv: mocks.buildAccountantCsv,
  buildPayrollSummary: mocks.buildPayrollSummary,
}));

import timeClockRouter from './timeClock';

const app = express();
app.use(express.json());
app.use('/admin/time-clock', timeClockRouter);

const FROM = '2026-04-01T00:00:00.000Z';
const TO = '2026-04-30T23:59:59.999Z';

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
  return pinActorTokenFor({ id: 12, establishmentId: EST, permissions: ['access_planning'] });
}

describe('admin time-clock read happy paths', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
    });
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) return { rows: [] };
      return { rows: [] };
    });
    mocks.getNetwork.mockResolvedValue({ allowed_ips: ['127.0.0.1'] });
    mocks.getOpenEntry.mockResolvedValue(null);
    mocks.list.mockResolvedValue([{ id: 1 }]);
    mocks.totalsByUser.mockResolvedValue([{ user_id: 12, minutes: 60 }]);
    mocks.buildPayrollSummary.mockResolvedValue({ rows: [] });
    mocks.buildComplianceReport.mockResolvedValue({ alerts: [] });
    mocks.buildAccountantCsv.mockReturnValue('csv');
    mocks.listUsers.mockResolvedValue([
      { id: 12, email: 'a@b.com', first_name: 'A', last_name: 'B', role: 'staff' },
    ]);
    mocks.listClocked.mockResolvedValue([]);
  });

  it('GET /entries /payroll-summary /compliance /staff /export', async () => {
    let res = await withPinActor(
      request(app)
        .get('/admin/time-clock/entries')
        .query({ from: FROM, to: TO, user_id: '12' })
        .set(auth()),
      pin()
    );
    expect(res.status).toBe(200);
    expect(res.body.entries).toEqual([{ id: 1 }]);

    res = await withPinActor(
      request(app).get('/admin/time-clock/payroll-summary').query({ from: FROM, to: TO }).set(auth()),
      pin()
    );
    expect(res.status).toBe(200);

    res = await withPinActor(
      request(app).get('/admin/time-clock/compliance').query({ from: FROM, to: TO }).set(auth()),
      pin()
    );
    expect(res.status).toBe(200);
    expect(res.body.alerts).toEqual([]);

    res = await withPinActor(request(app).get('/admin/time-clock/staff').set(auth()), pin());
    // /staff only needs requireAuth, not planning — but pin is fine
    expect(res.status).toBe(200);
    expect(res.body.staff).toHaveLength(1);

    res = await withPinActor(
      request(app)
        .get('/admin/time-clock/export')
        .query({ from: FROM, to: TO, format: 'accountant' })
        .set(auth()),
      pin()
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
  });
});
