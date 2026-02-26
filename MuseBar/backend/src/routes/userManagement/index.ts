/**
 * User Management Routes Module - Clean Exports
 * Provides a modular user management system for multi-tenant operations
 */

import express from 'express';
import { EnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import { UserInvitationService } from '../../services/userInvitationService';
import { ServiceInitialization } from './types';

// Import modular routes.
// Only invitationRoutes is mounted — user CRUD, team stats, and role management
// are handled by /api/auth/users (establishment-scoped routes in auth.ts).
import { invitationRoutes, initializeInvitationRoutes } from './invitationRoutes';

// Types export
export type {
  AuthenticatedRequest,
  EstablishmentInvitationData,
  UserInvitationData,
  InvitationAcceptanceData,
  ApiResponse,
  PaginationParams,
  UserFilterParams,
  InvitationFilterParams,
  UserUpdateData,
  RolePermissions,
  Role,
  TeamMember,
  TeamStats,
  EmailTestResult,
  ServiceInitialization,
  AuditLogEntry,
  ValidationError,
  RouteConfig,
  RouteGroup
} from './types';

/**
 * Main User Management Router
 */
class UserManagementRouter {
  private router: express.Router;
  private initialized: boolean = false;

  constructor() {
    this.router = express.Router();
  }

  /**
   * Initialize all user management routes
   */
  public initialize(config: EnvironmentConfig, logger: Logger): express.Router {
    if (this.initialized) {
      return this.router;
    }

    try {
      // Initialize services
      const userInvitationService = UserInvitationService.getInstance(config, logger);
      
      const services: ServiceInitialization = {
        userInvitationService,
        logger,
        config
      };

      // Initialize and mount only the invitation module.
      // User CRUD, team, and roles are served by /api/auth/users (see auth.ts).
      initializeInvitationRoutes(services);
      this.router.use('/invitations', invitationRoutes);

      this.router.get('/health', (req, res) => {
        res.json({
          success: true,
          message: 'User management service is healthy',
          timestamp: new Date().toISOString(),
          modules: {
            invitations: 'active'
          }
        });
      });

      this.initialized = true;
      logger.info('User management routes initialized successfully');
      
      return this.router;
    } catch (error) {
      logger.error('Failed to initialize user management routes', error as Error);
      throw error;
    }
  }

  /**
   * Get the router instance
   */
  public getRouter(): express.Router {
    if (!this.initialized) {
      throw new Error('UserManagementRouter must be initialized before use');
    }
    return this.router;
  }
}

// Export singleton instance
const userManagementRouter = new UserManagementRouter();

/**
 * Legacy initialization function for backward compatibility
 */
export function initializeUserManagementRoutes(config: EnvironmentConfig, logger: Logger): void {
  userManagementRouter.initialize(config, logger);
}

/**
 * Get initialized user management router
 */
export function getUserManagementRouter(): express.Router {
  return userManagementRouter.getRouter();
}

/**
 * Main export - backward compatible router initialization
 */
export default function createUserManagementRouter(config: EnvironmentConfig, logger: Logger): express.Router {
  return userManagementRouter.initialize(config, logger);
}

export { invitationRoutes };

