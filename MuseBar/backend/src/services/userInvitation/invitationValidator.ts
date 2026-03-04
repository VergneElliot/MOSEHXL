/**
 * Invitation Validator
 * Validation logic for user and establishment invitations
 */

import { pool } from '../../app';
import { Logger } from '../../utils/logger';
import { InvitationQueries } from '../../utils/database';
import { ValidationError, DatabaseError } from '../../middleware/errorHandler';
import { 
  EstablishmentInvitationData, 
  UserInvitationData, 
  InvitationValidationResult,
  InvitationRecord
} from './types';

export class InvitationValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate establishment invitation data
   */
  public async validateEstablishmentInvitation(data: EstablishmentInvitationData): Promise<InvitationValidationResult> {
    try {
      // Basic validation
      if (!data.name || !data.email || !data.inviterUserId || !data.inviterName) {
        return {
          isValid: false,
          message: 'Missing required fields: name, email, inviterUserId, or inviterName'
        };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return {
          isValid: false,
          message: 'Invalid email format'
        };
      }

      // Email uniqueness check removed - users can have multiple establishments with same email

      // Check if there's already a pending invitation for this email
      const existingInvitation = await pool.query(
        'SELECT id FROM user_invitations WHERE email = $1 AND status = $2',
        [data.email, 'pending']
      );

      if (existingInvitation.rows.length > 0) {
        return {
          isValid: false,
          message: 'A pending invitation already exists for this email'
        };
      }

      return {
        isValid: true,
        message: 'Validation passed'
      };

    } catch (error) {
      this.logger.error(
        'Error validating establishment invitation',
        error as Error,
        'INVITATION_VALIDATOR'
      );
      
      // Re-throw as appropriate error type
      if (error instanceof Error && error.message.includes('connection')) {
        throw new DatabaseError('Unable to validate invitation due to database connectivity issues');
      }
      
      throw new ValidationError('Invitation validation failed due to system error');
    }
  }

  /**
   * Validate user invitation data
   */
  public async validateUserInvitation(data: UserInvitationData): Promise<InvitationValidationResult> {
    try {
      // Basic validation
      if (!data.email || !data.firstName || !data.lastName || !data.role || 
          !data.establishmentId || !data.inviterUserId || !data.inviterName) {
        return {
          isValid: false,
          message: 'Missing required fields'
        };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return {
          isValid: false,
          message: 'Invalid email format'
        };
      }

      // Role validation
      const validRoles = ['cashier', 'manager', 'supervisor', 'establishment_admin'];
      if (!validRoles.includes(data.role)) {
        return {
          isValid: false,
          message: 'Invalid role specified'
        };
      }

      // Email uniqueness check removed - users can have multiple establishments with same email

      // Check if there's already a pending invitation for this email in this establishment
      const existingInvitation = await pool.query(
        'SELECT id FROM user_invitations WHERE email = $1 AND establishment_id = $2 AND status = $3',
        [data.email, data.establishmentId, 'pending']
      );

      if (existingInvitation.rows.length > 0) {
        return {
          isValid: false,
          message: 'A pending invitation already exists for this email in this establishment'
        };
      }

      return {
        isValid: true,
        message: 'Validation passed'
      };

    } catch (error) {
      this.logger.error(
        'Error validating user invitation',
        error as Error,
        'INVITATION_VALIDATOR'
      );
      
      return {
        isValid: false,
        message: 'Validation failed due to system error'
      };
    }
  }

  /**
   * Validate invitation token (uses shared InvitationQueries.getInvitationByToken).
   */
  public async validateInvitationToken(token: string): Promise<InvitationValidationResult> {
    try {
      if (!token) {
        return { isValid: false, message: 'Token is required' };
      }
      const invitation = await InvitationQueries.getInvitationByToken(pool, token);
      if (!invitation) {
        return { isValid: false, message: 'Invalid or expired invitation token' };
      }
      return {
        isValid: true,
        message: 'Token is valid',
        invitation: invitation as InvitationRecord
      };
    } catch (error) {
      this.logger.error(
        'Error validating invitation token',
        error as Error,
        'INVITATION_VALIDATOR'
      );
      return { isValid: false, message: 'Token validation failed due to system error' };
    }
  }

  /**
   * Validate password strength
   */
  public validatePassword(password: string): InvitationValidationResult {
    if (!password) {
      return {
        isValid: false,
        message: 'Password is required'
      };
    }

    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long'
      };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one lowercase letter'
      };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number'
      };
    }

    return {
      isValid: true,
      message: 'Password is valid'
    };
  }
}
