import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  userBelongsToEstablishment: vi.fn(),
  updateUserRoleById: vi.fn(),
  auditLogAction: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
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
    updateUserRoleById: mocks.updateUserRoleById,
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
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
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
app.use(errorHandler);

describe('authRegister establishment_admin role grant guard', () => {
  beforeEach(() => {
    requestUser.id = 22;
    requestUser.role = 'establishment_admin';
    requestUser.is_admin = false;
    requestUser.establishment_id = 'est-1';
    requestUser.email = 'admin@example.com';

    mocks.userBelongsToEstablishment.mockReset();
    mocks.updateUserRoleById.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.logSoftwareEventBestEffort.mockReset();

    mocks.userBelongsToEstablishment.mockResolvedValue(true);
    mocks.updateUserRoleById.mockResolvedValue(true);
    mocks.auditLogAction.mockResolvedValue(undefined);
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('rejects establishment_admin grant for non-system-admin requester', async () => {
    requestUser.is_admin = false;

    const res = await request(app)
      .put('/auth/users/9/role')
      .send({ role: 'establishment_admin' });

    expect(res.status).toBe(403);
    expect(res.body.error?.message).toBe('Only system administrators can grant establishment_admin role');
    expect(mocks.updateUserRoleById).not.toHaveBeenCalled();
    expect(mocks.auditLogAction).not.toHaveBeenCalled();
    expect(mocks.logSoftwareEventBestEffort).not.toHaveBeenCalled();
  });

  it('allows establishment_admin grant for system-admin requester', async () => {
    requestUser.is_admin = true;

    const res = await request(app)
      .put('/auth/users/9/role')
      .send({ role: 'establishment_admin' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 9, role: 'establishment_admin' });
    expect(mocks.updateUserRoleById).toHaveBeenCalledWith(9, 'establishment_admin');
    expect(mocks.auditLogAction).toHaveBeenCalledTimes(1);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledTimes(1);
  });
});
