/**
 * User Management Routes Module - Clean Exports
 * Provides a modular user management system for multi-tenant operations
 */

import express from 'express';
import { EnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import { UserInvitationService } from '../../services/userInvitationService';
import { ServiceInitialization } from './types';

// Import modular routes
import { invitationRoutes, initializeInvitationRoutes } from './invitationRoutes';
import { userRoutes, initializeUserRoutes } from './userRoutes';
import { teamRoutes, initializeTeamRoutes } from './teamRoutes';
import { roleRoutes, initializeRoleRoutes } from './roleRoutes';

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
      const userInvitationService = UserInvitationService.getInstance();
      
      const services: ServiceInitialization = {
        userInvitationService,
        logger,
        config
      };

      // Initialize all route modules
      initializeInvitationRoutes(services);
      initializeUserRoutes(services);
      initializeTeamRoutes(services);
      initializeRoleRoutes(services);

      // Mount route modules
      this.router.use('/invitations', invitationRoutes);
      this.router.use('/users', userRoutes);
      this.router.use('/team', teamRoutes);
      this.router.use('/roles', roleRoutes);

      // Health check endpoint
      this.router.get('/health', (req, res) => {
        res.json({
          success: true,
          message: 'User management service is healthy',
          timestamp: new Date().toISOString(),
          modules: {
            invitations: 'active',
            users: 'active',
            team: 'active',
            roles: 'active'
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

// Individual route exports for granular usage
export {
  invitationRoutes,
  userRoutes,
  teamRoutes,
  roleRoutes
};

