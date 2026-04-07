/**
 * User Routes - Basic User CRUD Operations
 * Handles user management, profile updates, and user listings
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { Logger } from '../../utils/logger';
import {
  UserUpdateData,
  UserFilterParams,
  ServiceInitialization
} from './types';
import {
  fetchEstablishmentUsers,
  fetchUserById,
  fetchUserRowById,
  updateUserById,
  deleteOrDeactivateUser,
  reactivateUser
} from './users';
import {
  logViewEstablishmentUsers,
  logViewUserDetails,
  logUpdateUser,
  logDeactivateOrDeleteUser,
  logReactivateUser
} from './users';

const router = express.Router();

// Service instances
let logger: Logger;

/**
 * Initialize user routes
 */
export function initializeUserRoutes(services: ServiceInitialization): void {
  logger = services.logger;
  void logger;
}

/**
 * GET /establishment-users
 * Get users for establishment (Admin/Manager only)
 */
router.get('/establishment-users', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const user = req.user!;
    const {
      page = 1,
      limit = 50,
      role,
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    }: UserFilterParams = req.query as any;

    const establishmentId = req.query.establishmentId as string || user.establishment_id;

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with an establishment'
      });
    }

    // Validate user has access to this establishment
    if (!user.is_admin && user.establishment_id !== establishmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this establishment'
      });
    }

    const { rows, totalCount } = await fetchEstablishmentUsers(establishmentId, {
      page: Number(page),
      limit: Number(limit),
      role,
      status,
      search,
      sortBy,
      sortOrder: sortOrder as any
    });

    await logViewEstablishmentUsers(user.id, {
      establishmentId,
      userCount: rows.length,
      filters: { role, status, search }
    }, req.ip, req.headers['user-agent'] as string | undefined);

    res.json({
      success: true,
      data: rows,
      count: rows.length,
      totalCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to get establishment users',
      error as Error,
      'USER_ROUTES',
      undefined,
      req.user?.id
    );
    next(error);
  }
});

/**
 * GET /user/:userId
 * Get user details (Admin/Manager only)
 */
router.get('/user/:userId', requireAuth, validateParams([
  { param: 'userId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { userId } = req.params;
    const user = req.user!;

    // Get user details
    const result = await fetchUserById(userId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const targetUser = result;

    // Validate access permissions
    if (!user.is_admin && 
        user.establishment_id !== targetUser.establishment_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this user'
      });
    }

    await logViewUserDetails(user.id, { targetUserId: userId, establishmentId: targetUser.establishment_id }, req.ip, req.headers['user-agent'] as string | undefined);

    res.json({
      success: true,
      data: targetUser
    });
  } catch (error) {
    logger?.error(
      'Failed to get user details',
      error as Error,
      'USER_ROUTES',
      undefined,
      req.user?.id
    );
    next(error);
  }
});

/**
 * PUT /user/:userId
 * Update user information (Admin/Manager only)
 */
router.put('/user/:userId', requireAuth, validateParams([
  { param: 'userId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), validateBody([
  { field: 'firstName', required: false },
  { field: 'lastName', required: false },
  { field: 'email', required: false },
  { field: 'role', required: false },
  { field: 'isActive', required: false }
]), async (req: any, res: any, next: any) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive }: UserUpdateData = req.body;
    const user = req.user!;

    // Get current user data
    const currentUser = await fetchUserRowById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate access permissions
    if (!user.is_admin && 
        user.establishment_id !== currentUser.establishment_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to modify this user'
      });
    }

    // Prevent users from modifying themselves in certain ways
    if (user.id === parseInt(userId)) {
      if (role && role !== currentUser.role) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own role'
        });
      }
      if (isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }
    }

    if (
      firstName === undefined &&
      lastName === undefined &&
      email === undefined &&
      role === undefined &&
      isActive === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }
    const updatedUser = await updateUserById(userId, { firstName, lastName, email, role, isActive });

    await logUpdateUser(user.id, {
      targetUserId: userId,
      updates: { firstName, lastName, email, role, isActive },
      establishmentId: currentUser.establishment_id
    }, req.ip, req.headers['user-agent'] as string | undefined);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        isActive: updatedUser.is_active,
        updatedAt: updatedUser.updated_at
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to update user',
      error as Error,
      'USER_ROUTES',
      undefined,
      req.user?.id
    );
    next(error);
  }
});

/**
 * DELETE /user/:userId
 * Delete/deactivate user (Admin only)
 */
router.delete('/user/:userId', requireAuth, requireAdmin, validateParams([
  { param: 'userId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { userId } = req.params;
    const user = req.user!;
    const permanent = req.query.permanent === 'true';

    // Prevent self-deletion
    if (user.id === parseInt(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Get user to delete
    const targetUser = await fetchUserRowById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    await deleteOrDeactivateUser(userId, permanent);

    await logDeactivateOrDeleteUser(user.id, {
      targetUserId: userId,
      targetUserEmail: targetUser.email,
      establishmentId: targetUser.establishment_id,
      permanent
    }, req.ip, req.headers['user-agent'] as string | undefined);

    res.json({
      success: true,
      message: permanent ? 'User deleted permanently' : 'User deactivated successfully'
    });
  } catch (error) {
    logger?.error(
      'Failed to delete/deactivate user',
      error as Error,
      'USER_ROUTES',
      undefined,
      req.user?.id
    );
    next(error);
  }
});

/**
 * POST /user/:userId/reactivate
 * Reactivate deactivated user (Admin only)
 */
router.post('/user/:userId/reactivate', requireAuth, requireAdmin, validateParams([
  { param: 'userId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { userId } = req.params;
    const user = req.user!;

    const reactivatedUser = await reactivateUser(userId);
    if (!reactivatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already active'
      });
    }
    await logReactivateUser(user.id, {
      targetUserId: userId,
      targetUserEmail: reactivatedUser.email,
      establishmentId: reactivatedUser.establishment_id
    }, req.ip, req.headers['user-agent'] as string | undefined);

    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: {
        id: reactivatedUser.id,
        email: reactivatedUser.email,
        firstName: reactivatedUser.first_name,
        lastName: reactivatedUser.last_name,
        isActive: reactivatedUser.is_active
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to reactivate user',
      error as Error,
      'USER_ROUTES',
      undefined,
      req.user?.id
    );
    next(error);
  }
});

export { router as userRoutes };

