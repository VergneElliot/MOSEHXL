/**
 * User Invitation Service Module
 * Clean exports and main orchestrator for invitation functionality
 */

// Import all classes
import { InvitationValidator } from './invitationValidator';
import { InvitationCreator } from './invitationCreator';
import { InvitationEmail } from './invitationEmail';
import { InvitationAcceptance } from './invitationAcceptance';

// Export classes
export { InvitationValidator, InvitationCreator, InvitationEmail, InvitationAcceptance };

// Export types
export type {
  InvitationType,
  InvitationStatus,
  UserRole,
  SubscriptionPlan,
  EstablishmentInvitationData,
  UserInvitationData,
  InvitationResult,
  InvitationRecord,
  InvitationAcceptanceData,
  InvitationValidationResult
} from './types';

// Import dependencies
import { Logger } from '../../utils/logger';
import { EmailService } from '../email';
import { EnvironmentConfig } from '../../config/environment';

/**
 * Main User Invitation Service - Legacy compatibility wrapper
 * This class maintains the original API while delegating to modular components
 */
export class UserInvitationService {
  private static instance: UserInvitationService;
  private validator: InvitationValidator;
  private creator: InvitationCreator;
  private emailService: InvitationEmail;
  private acceptance: InvitationAcceptance;
  private logger: Logger;

  private constructor(config: EnvironmentConfig, logger: Logger) {
    this.logger = logger;
    
    // Initialize modular components
    this.validator = new InvitationValidator(logger);
    this.creator = new InvitationCreator(logger);
    const emailService = EmailService.getInstance(config, logger);
    this.emailService = new InvitationEmail(logger, emailService);
    this.acceptance = new InvitationAcceptance(logger);

    this.logger.info(
      'User Invitation Service initialized with modular architecture',
      { 
        components: ['validator', 'creator', 'emailService', 'acceptance'] 
      },
      'USER_INVITATION_SERVICE'
    );
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config: EnvironmentConfig, logger: Logger): UserInvitationService {
    if (!UserInvitationService.instance) {
      UserInvitationService.instance = new UserInvitationService(config, logger);
    }
    return UserInvitationService.instance;
  }

  /**
   * Send establishment invitation (System Admin only)
   */
  public async sendEstablishmentInvitation(data: any): Promise<any> {
    try {
      // Validate invitation data
      const validation = await this.validator.validateEstablishmentInvitation(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          emailSent: false
        };
      }

      // Create invitation record
      const createResult = await this.creator.createEstablishmentInvitation(data);
      if (!createResult.success) {
        return createResult;
      }

      // Get the created invitation
      const invitation = await this.creator.getInvitationById(createResult.invitationId!);
      if (!invitation) {
        return {
          success: false,
          message: 'Failed to retrieve created invitation',
          emailSent: false
        };
      }

      // Send email
      const emailResult = await this.emailService.sendEstablishmentInvitationEmail(invitation, data);
      
      return {
        success: emailResult.success,
        invitationId: createResult.invitationId,
        message: emailResult.message,
        emailSent: emailResult.emailSent,
        trackingId: emailResult.trackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send establishment invitation',
        error as Error,
        { establishmentData: data },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: false,
        message: 'Failed to send establishment invitation',
        emailSent: false
      };
    }
  }

  /**
   * Send user invitation (Establishment Admin only)
   */
  public async sendUserInvitation(data: any): Promise<any> {
    try {
      // Validate invitation data
      const validation = await this.validator.validateUserInvitation(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          emailSent: false
        };
      }

      // Create invitation record
      const createResult = await this.creator.createUserInvitation(data);
      if (!createResult.success) {
        return createResult;
      }

      // Get the created invitation
      const invitation = await this.creator.getInvitationById(createResult.invitationId!);
      if (!invitation) {
        return {
          success: false,
          message: 'Failed to retrieve created invitation',
          emailSent: false
        };
      }

      // Send email
      const emailResult = await this.emailService.sendUserInvitationEmail(invitation, data);
      
      return {
        success: emailResult.success,
        invitationId: createResult.invitationId,
        message: emailResult.message,
        emailSent: emailResult.emailSent,
        trackingId: emailResult.trackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send user invitation',
        error as Error,
        { userData: data },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: false,
        message: 'Failed to send user invitation',
        emailSent: false
      };
    }
  }

  /**
   * Accept establishment invitation
   */
  public async acceptEstablishmentInvitation(token: string, password: string): Promise<any> {
    try {
      // Validate token
      const validation = await this.validator.validateInvitationToken(token);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          emailSent: false
        };
      }

      // Validate password
      const passwordValidation = this.validator.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
          emailSent: false
        };
      }

      // Accept invitation
      return await this.acceptance.acceptEstablishmentInvitation({ token, password });

    } catch (error) {
      this.logger.error(
        'Failed to accept establishment invitation',
        error as Error,
        { token },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: false,
        message: 'Failed to accept invitation',
        emailSent: false
      };
    }
  }

  /**
   * Accept user invitation
   */
  public async acceptUserInvitation(token: string, password: string, firstName?: string, lastName?: string): Promise<any> {
    try {
      // Validate token
      const validation = await this.validator.validateInvitationToken(token);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          emailSent: false
        };
      }

      // Validate password
      const passwordValidation = this.validator.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
          emailSent: false
        };
      }

      // Accept invitation
      return await this.acceptance.acceptUserInvitation({ 
        token, 
        password, 
        firstName, 
        lastName 
      });

    } catch (error) {
      this.logger.error(
        'Failed to accept user invitation',
        error as Error,
        { token },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: false,
        message: 'Failed to accept invitation',
        emailSent: false
      };
    }
  }

  /**
   * Get invitation by token
   */
  public async getInvitationByToken(token: string): Promise<any | null> {
    return await this.creator.getInvitationByToken(token);
  }

  /**
   * Get pending invitations for establishment
   */
  public async getPendingInvitations(establishmentId: string): Promise<any[]> {
    return await this.creator.getPendingInvitations(establishmentId);
  }

  /**
   * Cancel invitation
   */
  public async cancelInvitation(invitationId: string, userId: string): Promise<boolean> {
    return await this.creator.cancelInvitation(invitationId, userId);
  }

  /**
   * Clean up expired invitations
   */
  public async cleanupExpiredInvitations(): Promise<number> {
    return await this.creator.cleanupExpiredInvitations();
  }
}

// Default export for backward compatibility
export default UserInvitationService;
