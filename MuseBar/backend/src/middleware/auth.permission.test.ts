import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAnyPermission, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { UserModel } from '../models/user';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../models/user', () => ({
  UserModel: {
    getUserPermissions: vi.fn(),
  },
}));

const getPerms = vi.mocked(UserModel.getUserPermissions);

function nextStub(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

function resStub() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('requirePermission', () => {
  beforeEach(() => {
    getPerms.mockReset();
  });

  it('returns 403 for system_admin when permission is not granted in DB', async () => {
    getPerms.mockResolvedValue([]);
    const next = nextStub();
    const res = resStub();
    const req = {
      user: { id: 1, email: 'a@a.com', is_admin: false, role: 'system_admin', establishment_id: null },
    } as unknown as Request;
    const mw = requirePermission('any_key');
    await mw(req, res, next);
    expect(getPerms).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for system_admin when permission is granted in DB', async () => {
    getPerms.mockResolvedValue(['any_key']);
    const next = nextStub();
    const res = resStub();
    const req = {
      user: { id: 1, email: 'a@a.com', is_admin: false, role: 'system_admin', establishment_id: null },
    } as unknown as Request;
    const mw = requirePermission('any_key');
    await mw(req, res, next);
    expect(getPerms).toHaveBeenCalledWith(1);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the user lacks the permission (e.g. orders_cancel for cancel-unified)', async () => {
    getPerms.mockResolvedValue([P.access_pos, P.access_menu]);
    const next = nextStub();
    const res = resStub();
    const req = {
      user: { id: 2, email: 's@a.com', is_admin: false, role: 'staff', establishment_id: 'e1' },
    } as unknown as Request;
    const mw = requirePermission(P.orders_cancel);
    await mw(req, res, next);
    expect(getPerms).toHaveBeenCalledWith(2);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the user has the permission', async () => {
    getPerms.mockResolvedValue([P.access_pos, P.orders_cancel]);
    const next = nextStub();
    const res = resStub();
    const req = {
      user: { id: 3, email: 'b@a.com', is_admin: false, role: 'staff', establishment_id: 'e1' },
    } as unknown as Request;
    const mw = requirePermission(P.orders_cancel);
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireAnyPermission', () => {
  beforeEach(() => {
    getPerms.mockReset();
  });

  it('returns 403 when the user has none of the required permissions', async () => {
    getPerms.mockResolvedValue([P.access_pos]);
    const next = nextStub();
    const res = resStub();
    const req = {
      user: { id: 4, email: 'c@a.com', is_admin: false, role: 'staff', establishment_id: 'e1' },
    } as unknown as Request;
    const mw = requireAnyPermission([P.access_settings, P.access_menu]);
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('enforces DB permissions for system_admin as well', async () => {
    getPerms.mockResolvedValue([P.access_pos]);
    const next = nextStub();
    const res = resStub();
    const req = {
      user: { id: 9, email: 'root@a.com', is_admin: true, role: 'system_admin', establishment_id: null },
    } as unknown as Request;
    const mw = requireAnyPermission([P.access_settings, P.access_menu]);
    await mw(req, res, next);
    expect(getPerms).toHaveBeenCalledWith(9);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the user has at least one of the required permissions', async () => {
    getPerms.mockResolvedValue([P.access_pos, P.access_menu]);
    const next = nextStub();
    const res = resStub();
    const req = {
      user: { id: 5, email: 'd@a.com', is_admin: false, role: 'staff', establishment_id: 'e1' },
    } as unknown as Request;
    const mw = requireAnyPermission([P.access_settings, P.access_menu]);
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
