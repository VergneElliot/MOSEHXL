import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  userBelongsToEstablishment: vi.fn(),
  setUserPermissions: vi.fn(),
  createUserForEstablishment: vi.fn(),
  findByEmail: vi.fn(),
  deleteUserById: vi.fn(),
  updateUserRoleById: vi.fn(),
  membershipRemove: vi.fn(),
  membershipUpsert: vi.fn(),
  auditLogAction: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
  applyPermissionGrants: vi.fn(),
  deactivateStaffAccount: vi.fn(),
}));

vi.mock('../services/auth/staffAccountLifecycle', () => ({
  deactivateStaffAccount: mocks.deactivateStaffAccount,
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
    findByEmail: mocks.findByEmail,
    deleteUserById: mocks.deleteUserById,
    updateUserRoleById: mocks.updateUserRoleById,
    createUser: vi.fn(),
    bootstrapSystemAdmin: vi.fn(),
    listUsersByEstablishment: vi.fn(),
    getUserPermissions: vi.fn(),
  },
}));

vi.mock('../models/membership', () => ({
  MembershipModel: {
    remove: mocks.membershipRemove,
    upsert: mocks.membershipUpsert,
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

vi.mock('../services/auth/permissionGrantService', () => ({
  applyPermissionGrants: mocks.applyPermissionGrants,
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
    mocks.findByEmail.mockReset();
    mocks.deleteUserById.mockReset();
    mocks.updateUserRoleById.mockReset();
    mocks.membershipRemove.mockReset();
    mocks.membershipUpsert.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.logSoftwareEventBestEffort.mockReset();
    mocks.applyPermissionGrants.mockReset();
    mocks.deactivateStaffAccount.mockReset();
    mocks.deactivateStaffAccount.mockResolvedValue({
      deactivated: true,
      pin_cleared: true,
      sessions_closed: 1,
    });

    mocks.userBelongsToEstablishment.mockResolvedValue(true);
    mocks.setUserPermissions.mockResolvedValue(undefined);
    mocks.createUserForEstablishment.mockResolvedValue({ id: 9, email: 'staff@example.com' });
    mocks.findByEmail.mockResolvedValue(null);
    mocks.deleteUserById.mockResolvedValue(undefined);
    mocks.updateUserRoleById.mockResolvedValue(undefined);
    mocks.membershipRemove.mockResolvedValue(true);
    mocks.membershipUpsert.mockResolvedValue({});
    mocks.auditLogAction.mockResolvedValue(undefined);
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
    mocks.applyPermissionGrants.mockResolvedValue({
      granted: ['access_settings'],
      permissions: ['access_pos', 'access_settings'],
      pin_cleared: false,
    });
  });

  it('logs software event after permissions update', async () => {
    const res = await request(app)
      .put('/auth/users/9/permissions')
      .send({ permissions: ['access_pos', 'access_settings'] });

    expect(res.status).toBe(200);
    // access_pos is basic and implicit, so only the specific grant is counted.
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: 'est-1',
        eventType: 'USER_PERMISSIONS_UPDATED',
        userId: '22',
        eventData: expect.objectContaining({
          target_user_id: 9,
          permissions_count: 1,
          pin_cleared: false,
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
      .send({ email: 'staff@example.com', password: 'StrongPass1', role: 'staff' });

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

  it('deactivates instead of deleting, and journals the software event', async () => {
    const res = await request(app)
      .delete('/auth/users/9');

    expect(res.status).toBe(200);
    expect(mocks.deactivateStaffAccount).toHaveBeenCalledWith(9, 'est-1');
    expect(mocks.deleteUserById).not.toHaveBeenCalled();
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: 'est-1',
        eventType: 'ESTABLISHMENT_USER_DELETED',
        userId: '22',
        eventData: expect.objectContaining({
          target_user_id: 9,
          deactivated: true,
        }),
      })
    );
  });
});
