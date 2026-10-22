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
  buildComplianceReport: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../models/timeEntry', () => ({
  TimeClockNetworkSettingsModel: {
    get: mocks.getNetwork,
  },
  TimeEntryModel: {
    getOpenEntry: mocks.getOpenEntry,
  },
  isIpAllowed: () => true,
  isValidIpOrCidr: () => true,
  normalizeAllowedIps: (ips: string[]) => ips,
}));

vi.mock('../../services/labor/laborReportService', () => ({
  buildComplianceReport: mocks.buildComplianceReport,
  buildPayrollCsv: vi.fn(),
}));

vi.mock('../../services/labor/payrollReportService', () => ({
  buildAccountantCsv: vi.fn(),
  buildPayrollSummary: vi.fn(),
}));

import timeClockRouter from './timeClock';

const app = express();
app.use(express.json());
app.use('/admin/time-clock', timeClockRouter);

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
const TO = '2026-04-30T23:59:59.999Z';

describe('admin time-clock permission gates', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getOpenEntry.mockReset();
    mocks.getNetwork.mockReset();
    mocks.buildComplianceReport.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.getNetwork.mockResolvedValue({ allowed_ips: [] });
    mocks.getOpenEntry.mockResolvedValue(null);
    mocks.buildComplianceReport.mockResolvedValue({
      from: FROM,
      to: TO,
      alerts: [],
    });
  });

  describe('open membership: GET /status', () => {
    it('allows any authenticated establishment member without a PIN actor', async () => {
      const res = await request(app)
        .get('/admin/time-clock/status')
        .set('Authorization', `Bearer ${tokenFor('staff')}`);

      expect(res.status).toBe(200);
      expect(mocks.getOpenEntry).toHaveBeenCalledWith(EST, 12);
      expect(res.body).toMatchObject({
        open_entry: null,
        on_venue_network: true,
        allowed_ips_configured: false,
      });
    });
  });

  describe('planning-gated: GET /compliance', () => {
    it('denies with the account JWT alone (no PIN actor)', async () => {
      const res = await request(app)
        .get('/admin/time-clock/compliance')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${tokenFor('staff')}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
      expect(mocks.buildComplianceReport).not.toHaveBeenCalled();
    });

    it('denies when the PIN actor lacks access_planning', async () => {
      const res = await withPinActor(
        request(app)
          .get('/admin/time-clock/compliance')
          .query({ from: FROM, to: TO })
          .set('Authorization', `Bearer ${tokenFor('staff')}`),
        pinWith(['access_documents'])
      );

      expect(res.status).toBe(403);
      expect(mocks.buildComplianceReport).not.toHaveBeenCalled();
    });

    it('allows with access_planning', async () => {
      const res = await withPinActor(
        request(app)
          .get('/admin/time-clock/compliance')
          .query({ from: FROM, to: TO })
          .set('Authorization', `Bearer ${tokenFor('staff')}`),
        pinWith(['access_planning'])
      );

      expect(res.status).toBe(200);
      expect(mocks.buildComplianceReport).toHaveBeenCalledWith(EST, FROM, TO);
      expect(res.body).toMatchObject({ alerts: [] });
    });
  });
});
