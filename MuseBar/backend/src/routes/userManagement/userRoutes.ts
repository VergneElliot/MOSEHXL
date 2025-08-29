/**
 * User Routes - Basic User CRUD Operations
 * Handles user management, profile updates, and user listings
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { pool } from '../../app';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import {
  AuthenticatedRequest,
  UserUpdateData,
  UserFilterParams,
  ApiResponse,
  TeamMember,
  ServiceInitialization
} from './types';

const router = express.Router();

// Service instances
let logger: Logger;

/**
 * Initialize user routes
 */
export function initializeUserRoutes(services: ServiceInitialization): void {
  logger = services.logger;
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

    // Build query
    let query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.establishment_id = $1
    `;
    const queryParams: any[] = [establishmentId];
    let paramCount = 1;

    // Add filters
    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    if (status) {
      paramCount++;
      query += ` AND u.is_active = $${paramCount}`;
      queryParams.push(status === 'active');
    }

    if (search) {
      paramCount++;
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add sorting
    const validSortFields = ['first_name', 'last_name', 'email', 'role', 'created_at', 'last_login_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY u.${sortField} ${order}`;

    // Add pagination
    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(Number(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users u WHERE u.establishment_id = $1';
    const countParams = [establishmentId];
    let countParamIndex = 1;

    if (role) {
      countParamIndex++;
      countQuery += ` AND u.role = $${countParamIndex}`;
      countParams.push(role);
    }

    if (status) {
      countParamIndex++;
      countQuery += ` AND u.is_active = $${countParamIndex}`;
      countParams.push(status);
    }

    if (search) {
      countParamIndex++;
      countQuery += ` AND (u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_ESTABLISHMENT_USERS',
      action_details: {
        establishmentId,
        userCount: result.rows.length,
        filters: { role, status, search }
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
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
      { userId: req.user?.id },
      'USER_ROUTES'
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
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.establishment_id,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        e.name as establishment_name
      FROM users u
      LEFT JOIN establishments e ON u.establishment_id = e.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const targetUser = result.rows[0];

    // Validate access permissions
    if (!user.is_admin && 
        user.establishment_id !== targetUser.establishment_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this user'
      });
    }

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_USER_DETAILS',
      action_details: {
        targetUserId: userId,
        establishmentId: targetUser.establishment_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: targetUser
    });
  } catch (error) {
    logger?.error(
      'Failed to get user details',
      error as Error,
      { userId: req.params.userId, requesterId: req.user?.id },
      'USER_ROUTES'
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
    const currentUserResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = currentUserResult.rows[0];

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

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (firstName !== undefined) {
      paramCount++;
      updates.push(`first_name = $${paramCount}`);
      values.push(firstName);
    }

    if (lastName !== undefined) {
      paramCount++;
      updates.push(`last_name = $${paramCount}`);
      values.push(lastName);
    }

    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email);
    }

    if (role !== undefined) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      values.push(role);
    }

    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    // Add updated_at
    paramCount++;
    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    // Add user ID for WHERE clause
    paramCount++;
    values.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const updatedUser = result.rows[0];

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'UPDATE_USER',
      action_details: {
        targetUserId: userId,
        updates: { firstName, lastName, email, role, isActive },
        establishmentId: currentUser.establishment_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

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
      { userId: req.params.userId, updates: req.body, requesterId: req.user?.id },
      'USER_ROUTES'
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
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const targetUser = userResult.rows[0];

    let result;
    if (permanent) {
      // Permanent deletion (rarely used)
      result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [userId]
      );
    } else {
      // Soft deletion (deactivation)
      result = await pool.query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [userId]
      );
    }

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: permanent ? 'DELETE_USER_PERMANENT' : 'DEACTIVATE_USER',
      action_details: {
        targetUserId: userId,
        targetUserEmail: targetUser.email,
        establishmentId: targetUser.establishment_id,
        permanent
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: permanent ? 'User deleted permanently' : 'User deactivated successfully'
    });
  } catch (error) {
    logger?.error(
      'Failed to delete/deactivate user',
      error as Error,
      { userId: req.params.userId, requesterId: req.user?.id },
      'USER_ROUTES'
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

    const result = await pool.query(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = false RETURNING *',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already active'
      });
    }

    const reactivatedUser = result.rows[0];

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'REACTIVATE_USER',
      action_details: {
        targetUserId: userId,
        targetUserEmail: reactivatedUser.email,
        establishmentId: reactivatedUser.establishment_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

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
      { userId: req.params.userId, requesterId: req.user?.id },
      'USER_ROUTES'
    );
    next(error);
  }
});

export { router as userRoutes };

