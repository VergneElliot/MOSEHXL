/**
 * Role Routes
 * Main route definitions for role management operations
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../auth';
import { validateBody, validateParams } from '../../../middleware/validation';
import { Logger } from '../../../utils/logger';
import { ServiceInitialization } from '../types';
import { RoleController } from './RoleController';

const router = express.Router();

// Service instances
let logger: Logger;

/**
 * Initialize role routes
 */
export function initializeRoleRoutes(services: ServiceInitialization): void {
  logger = services.logger;
}

/**
 * GET /roles
 * Get all available roles for establishment
 */
router.get('/roles', requireAuth, RoleController.getAllRoles);

/**
 * GET /role/:roleId
 * Get specific role details
 */
router.get('/role/:roleId', 
  requireAuth, 
  validateParams([
    { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
  ]), 
  RoleController.getRoleDetails
);

/**
 * POST /role
 * Create custom role (Admin only)
 */
router.post('/role', 
  requireAuth, 
  requireAdmin, 
  validateBody([
    { field: 'name', required: true },
    { field: 'description', required: true },
    { field: 'permissions', required: true },
    { field: 'establishmentId', required: true }
  ]), 
  RoleController.createRole
);

/**
 * PUT /role/:roleId
 * Update custom role (Admin only)
 */
router.put('/role/:roleId', 
  requireAuth, 
  requireAdmin, 
  validateParams([
    { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
  ]), 
  validateBody([
    { field: 'name', required: false },
    { field: 'description', required: false },
    { field: 'permissions', required: false }
  ]), 
  RoleController.updateRole
);

/**
 * DELETE /role/:roleId
 * Delete custom role (Admin only)
 */
router.delete('/role/:roleId', 
  requireAuth, 
  requireAdmin, 
  validateParams([
    { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
  ]), 
  RoleController.deleteRole
);

/**
 * GET /role-permissions/:roleId
 * Get permissions for a specific role
 */
router.get('/role-permissions/:roleId', 
  requireAuth, 
  validateParams([
    { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
  ]), 
  RoleController.getRolePermissions
);

export { router as roleRoutes };
