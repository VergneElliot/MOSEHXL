import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  createUserForEstablishment: vi.fn(),
  auditLogAction: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireEstablishmentAdminOrPermission:
    () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireSetupSecret: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../models/user', () => ({
  UserModel: {
    createUser: mocks.createUser,
    createUserForEstablishment: mocks.createUserForEstablishment,
    bootstrapSystemAdmin: vi.fn(),
    listUsersByEstablishment: vi.fn(),
    getUserPermissions: vi.fn(),
    userBelongsToEstablishment: vi.fn(),
    setUserPermissions: vi.fn(),
    deleteUserById: vi.fn(),
    updateUserRoleById: vi.fn(),
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.auditLogAction,
  },
}));

vi.mock('../services/legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

vi.mock('../permissions/registry', () => ({
  P: {
    access_user_management: 'access_user_management',
  },
}));

import authRegisterRouter from './authRegister';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = {
    id: 99,
    role: 'system_admin',
    is_admin: true,
    establishment_id: 'est-1',
    email: 'admin@example.com',
  };
  next();
});
app.use('/auth', authRegisterRouter);
app.use(errorHandler);

describe('authRegister password policy enforcement', () => {
  const originalBreachToggle = process.env.PASSWORD_BREACH_CHECK_ENABLED;

  beforeEach(() => {
    mocks.createUser.mockReset();
    mocks.createUserForEstablishment.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.auditLogAction.mockResolvedValue(undefined);
    process.env.PASSWORD_BREACH_CHECK_ENABLED = originalBreachToggle;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects weak passwords on POST /auth/register', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'u@example.com', password: 'weak', is_admin: false });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Password must be at least 8 characters long');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('rejects weak passwords on POST /auth/users', async () => {
    const res = await request(app)
      .post('/auth/users')
      .send({ email: 'staff@example.com', password: 'weak', role: 'staff' });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Password must be at least 8 characters long');
    expect(mocks.createUserForEstablishment).not.toHaveBeenCalled();
  });

  it('rejects breached passwords when HIBP check is enabled', async () => {
    process.env.PASSWORD_BREACH_CHECK_ENABLED = 'true';
    const hashHex = crypto.createHash('sha1').update('StrongPass1').digest('hex').toUpperCase();
    const suffix = hashHex.slice(5);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:42\n`,
    }));

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'u@example.com', password: 'StrongPass1', is_admin: false });

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message)).toContain('known data breaches');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
