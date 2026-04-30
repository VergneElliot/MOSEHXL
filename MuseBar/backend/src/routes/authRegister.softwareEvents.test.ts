import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  userBelongsToEstablishment: vi.fn(),
  setUserPermissions: vi.fn(),
  createUserForEstablishment: vi.fn(),
  deleteUserById: vi.fn(),
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
    setUserPermissions: mocks.setUserPermissions,
    createUserForEstablishment: mocks.createUserForEstablishment,
    deleteUserById: mocks.deleteUserById,
    updateUserRoleById: mocks.updateUserRoleById,
    createUser: vi.fn(),
    bootstrapSystemAdmin: vi.fn(),
    listUsersByEstablishment: vi.fn(),
    getUserPermissions: vi.fn(),
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

import authRegisterRouter from './authRegister';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = {
    id: 22,
    role: 'establishment_admin',
    is_admin: false,
    establishment_id: 'est-1',
    email: 'admin@example.com',
  };
  next();
});
app.use('/auth', authRegisterRouter);

describe('authRegister software-event journaling', () => {
  beforeEach(() => {
    mocks.userBelongsToEstablishment.mockReset();
    mocks.setUserPermissions.mockReset();
    mocks.createUserForEstablishment.mockReset();
    mocks.deleteUserById.mockReset();
    mocks.updateUserRoleById.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.logSoftwareEventBestEffort.mockReset();

    mocks.userBelongsToEstablishment.mockResolvedValue(true);
    mocks.setUserPermissions.mockResolvedValue(undefined);
    mocks.createUserForEstablishment.mockResolvedValue({ id: 9, email: 'staff@example.com' });
    mocks.deleteUserById.mockResolvedValue(undefined);
    mocks.updateUserRoleById.mockResolvedValue(undefined);
    mocks.auditLogAction.mockResolvedValue(undefined);
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('logs software event after permissions update', async () => {
    const res = await request(app)
      .put('/auth/users/9/permissions')
      .send({ permissions: ['access_pos', 'access_settings'] });

    expect(res.status).toBe(200);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: 'est-1',
        eventType: 'USER_PERMISSIONS_UPDATED',
        userId: '22',
        eventData: expect.objectContaining({
          target_user_id: 9,
          permissions_count: 2,
          method: 'PUT',
        }),
      })
    );
  });

  it('logs software event after role update', async () => {
    const res = await request(app)
      .put('/auth/users/9/role')
      .send({ role: 'staff' });

    expect(res.status).toBe(200);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: 'est-1',
        eventType: 'USER_ROLE_UPDATED',
        userId: '22',
        eventData: expect.objectContaining({
          target_user_id: 9,
          role: 'staff',
        }),
      })
    );
  });

  it('logs software event after establishment user creation', async () => {
    const res = await request(app)
      .post('/auth/users')
      .send({ email: 'staff@example.com', password: 'secret', role: 'staff' });

    expect(res.status).toBe(201);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: 'est-1',
        eventType: 'ESTABLISHMENT_USER_CREATED',
        userId: '22',
        eventData: expect.objectContaining({
          target_user_id: 9,
          email: 'staff@example.com',
          role: 'staff',
        }),
      })
    );
  });

  it('logs software event after establishment user deletion', async () => {
    const res = await request(app)
      .delete('/auth/users/9');

    expect(res.status).toBe(200);
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: 'est-1',
        eventType: 'ESTABLISHMENT_USER_DELETED',
        userId: '22',
        eventData: expect.objectContaining({
          target_user_id: 9,
        }),
      })
    );
  });
});
