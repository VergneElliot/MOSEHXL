import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  userBelongsToEstablishment: vi.fn(),
  unlockUserAccount: vi.fn(),
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
    userBelongsToEstablishment: mocks.userBelongsToEstablishment,
    unlockUserAccount: mocks.unlockUserAccount,
    updateUserRoleById: vi.fn(),
    createUser: vi.fn(),
    createUserForEstablishment: vi.fn(),
    bootstrapSystemAdmin: vi.fn(),
    listUsersByEstablishment: vi.fn(),
    getUserPermissions: vi.fn(),
    setUserPermissions: vi.fn(),
    deleteUserById: vi.fn(),
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

const requestUser = {
  id: 22,
  role: 'establishment_admin',
  is_admin: false,
  establishment_id: 'est-1',
  email: 'admin@example.com',
};

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = requestUser;
  next();
});
app.use('/auth', authRegisterRouter);

describe('authRegister account unlock endpoint', () => {
  beforeEach(() => {
    mocks.userBelongsToEstablishment.mockReset();
    mocks.unlockUserAccount.mockReset();
    mocks.auditLogAction.mockReset();

    mocks.userBelongsToEstablishment.mockResolvedValue(true);
    mocks.unlockUserAccount.mockResolvedValue(true);
    mocks.auditLogAction.mockResolvedValue(undefined);
  });

  it('unlocks user account in the same establishment', async () => {
    const res = await request(app)
      .put('/auth/users/9/unlock')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 9, unlocked: true });
    expect(mocks.unlockUserAccount).toHaveBeenCalledWith(9);
    expect(mocks.auditLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'ACCOUNT_UNLOCKED',
        resource_id: '9',
      })
    );
  });

  it('returns 403 when target user is outside requester establishment', async () => {
    mocks.userBelongsToEstablishment.mockResolvedValueOnce(false);

    const res = await request(app)
      .put('/auth/users/9/unlock')
      .send({});

    expect(res.status).toBe(403);
    expect(mocks.unlockUserAccount).not.toHaveBeenCalled();
  });
});
