import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  upsertHappyHourSettings: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
}));

vi.mock('./auth', () => ({
  requireAuth: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  getEstablishmentId: () => 'est-1',
  requireAnyPermission:
    () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requirePermission:
    () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../models/happyHourSettings', () => ({
  HappyHourSettingsModel: {
    upsertHappyHourSettings: mocks.upsertHappyHourSettings,
    getHappyHourSettings: vi.fn(),
  },
  defaultHappyHour: {
    isEnabled: true,
    startTime: '17:00',
    endTime: '19:00',
    manualOverride: 'auto',
    discountType: 'percentage',
    discountValue: 20,
  },
}));

vi.mock('../services/legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
}));

vi.mock('../permissions/registry', () => ({
  P: {
    access_pos: 'access_pos',
    access_settings: 'access_settings',
  },
}));

import settingsRouter from './settings';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = {
    id: 22,
    role: 'staff',
    establishment_id: 'est-1',
  };
  next();
});
app.use('/settings', settingsRouter);

describe('settings software-event journaling', () => {
  beforeEach(() => {
    mocks.upsertHappyHourSettings.mockReset();
    mocks.logSoftwareEventBestEffort.mockReset();
    mocks.upsertHappyHourSettings.mockResolvedValue(undefined);
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('logs software-event journal after successful happy-hour settings update', async () => {
    const payload = {
      isEnabled: false,
      startTime: '18:00',
      endTime: '20:00',
      manualOverride: 'on',
      discountType: 'percentage',
      discountValue: 15,
    };

    const res = await request(app).put('/settings/happy-hour').send(payload);

    expect(res.status).toBe(200);
    expect(mocks.upsertHappyHourSettings).toHaveBeenCalledWith('est-1', payload);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      eventType: 'HAPPY_HOUR_SETTINGS_UPDATED',
      userId: '22',
      eventData: payload,
    });
  });
});
