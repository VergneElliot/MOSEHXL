import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  bootstrapSystemAdmin: vi.fn(),
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
    bootstrapSystemAdmin: mocks.bootstrapSystemAdmin,
    createUser: vi.fn(),
    createUserForEstablishment: vi.fn(),
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
    logAction: vi.fn(),
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
import { errorHandler } from '../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/auth', authRegisterRouter);
app.use(errorHandler);

describe('POST /auth/setup password validation', () => {
  beforeEach(() => {
    mocks.bootstrapSystemAdmin.mockReset();
  });

  it('returns 400 when password does not meet shared policy', async () => {
    const res = await request(app).post('/auth/setup').send({
      email: 'root@example.com',
      password: 'weak',
    });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Password must be at least 8 characters long');
    expect(mocks.bootstrapSystemAdmin).not.toHaveBeenCalled();
  });

  it('creates system admin when password is valid', async () => {
    mocks.bootstrapSystemAdmin.mockResolvedValue({
      id: 1,
      email: 'root@example.com',
      is_admin: true,
    });

    const res = await request(app).post('/auth/setup').send({
      email: 'root@example.com',
      password: 'StrongPass1',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Admin user created successfully');
    expect(mocks.bootstrapSystemAdmin).toHaveBeenCalledWith('root@example.com', 'StrongPass1');
  });
});
