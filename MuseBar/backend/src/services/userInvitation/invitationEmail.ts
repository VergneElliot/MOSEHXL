/**
 * Invitation Email Service
 * Email sending functionality for user and establishment invitations
 */

import { Logger } from '../../utils/logger';
import { EmailService } from '../email';
import { 
  EstablishmentInvitationData, 
  UserInvitationData, 
  InvitationRecord,
  InvitationResult
} from './types';

export class InvitationEmail {
  private logger: Logger;
  private emailService: EmailService;

  constructor(logger: Logger, emailService: EmailService) {
    this.logger = logger;
    this.emailService = emailService;
  }

  /**
   * Send establishment invitation email
   */
  public async sendEstablishmentInvitationEmail(
    invitation: InvitationRecord,
    establishmentData: EstablishmentInvitationData
  ): Promise<InvitationResult> {
    try {
      const invitationUrl = `${process.env.FRONTEND_URL}/accept-establishment-invitation?token=${invitation.invitation_token}`;
      
      const emailTrackingId = await this.emailService.sendTemplateEmail(
        'establishment_invitation',
        invitation.email,
        {
          recipientName: establishmentData.name,
          establishmentName: establishmentData.name,
          inviterName: establishmentData.inviterName,
          invitationUrl,
          expirationDate: invitation.expires_at.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      );

      this.logger.info(
        'Establishment invitation email sent successfully',
        {
          invitationId: invitation.id,
          establishmentEmail: invitation.email,
          establishmentName: establishmentData.name,
          inviterUserId: establishmentData.inviterUserId,
          emailTrackingId
        },
        'INVITATION_EMAIL'
      );

      return {
        success: true,
        invitationId: invitation.id,
        message: 'Establishment invitation email sent successfully',
        emailSent: true,
        trackingId: emailTrackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send establishment invitation email',
        error as Error,
        { 
          invitationId: invitation.id,
          establishmentEmail: invitation.email 
        },
        'INVITATION_EMAIL'
      );

      return {
        success: false,
        message: 'Failed to send establishment invitation email',
        emailSent: false
      };
    }
  }

  /**
   * Send user invitation email
   */
  public async sendUserInvitationEmail(
    invitation: InvitationRecord,
    userData: UserInvitationData
  ): Promise<InvitationResult> {
    try {
      const invitationUrl = `${process.env.FRONTEND_URL}/accept-user-invitation?token=${invitation.invitation_token}`;
      
      const emailTrackingId = await this.emailService.sendTemplateEmail(
        'user_invitation',
        invitation.email,
        {
          recipientName: `${userData.firstName} ${userData.lastName}`,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          establishmentName: userData.establishmentName,
          inviterName: userData.inviterName,
          invitationUrl,
          expirationDate: invitation.expires_at.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      );

      this.logger.info(
        'User invitation email sent successfully',
        {
          invitationId: invitation.id,
          userEmail: invitation.email,
          role: userData.role,
          establishmentId: userData.establishmentId,
          inviterUserId: userData.inviterUserId,
          emailTrackingId
        },
        'INVITATION_EMAIL'
      );

      return {
        success: true,
        invitationId: invitation.id,
        message: 'User invitation email sent successfully',
        emailSent: true,
        trackingId: emailTrackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send user invitation email',
        error as Error,
        { 
          invitationId: invitation.id,
          userEmail: invitation.email 
        },
        'INVITATION_EMAIL'
      );

      return {
        success: false,
        message: 'Failed to send user invitation email',
        emailSent: false
      };
    }
  }

  /**
   * Send invitation reminder email
   */
  public async sendInvitationReminder(invitation: InvitationRecord): Promise<InvitationResult> {
    try {
      let templateName: string;
      let invitationUrl: string;
      
      if (invitation.role === 'establishment_admin') {
        templateName = 'establishment_invitation_reminder';
        invitationUrl = `${process.env.FRONTEND_URL}/accept-establishment-invitation?token=${invitation.invitation_token}`;
      } else {
        templateName = 'user_invitation_reminder';
        invitationUrl = `${process.env.FRONTEND_URL}/accept-user-invitation?token=${invitation.invitation_token}`;
      }

      const emailTrackingId = await this.emailService.sendTemplateEmail(
        templateName,
        invitation.email,
        {
          recipientName: invitation.role === 'establishment_admin' 
            ? invitation.establishment_name 
            : invitation.email,
          establishmentName: invitation.establishment_name,
          inviterName: invitation.inviter_name,
          invitationUrl,
          expirationDate: invitation.expires_at.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      );

      this.logger.info(
        'Invitation reminder email sent successfully',
        {
          invitationId: invitation.id,
          email: invitation.email,
          role: invitation.role,
          emailTrackingId
        },
        'INVITATION_EMAIL'
      );

      return {
        success: true,
        invitationId: invitation.id,
        message: 'Invitation reminder sent successfully',
        emailSent: true,
        trackingId: emailTrackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send invitation reminder email',
        error as Error,
        { 
          invitationId: invitation.id,
          email: invitation.email 
        },
        'INVITATION_EMAIL'
      );

      return {
        success: false,
        message: 'Failed to send invitation reminder',
        emailSent: false
      };
    }
  }

  /**
   * Send invitation cancellation notification
   */
  public async sendInvitationCancellationEmail(invitation: InvitationRecord): Promise<InvitationResult> {
    try {
      const emailTrackingId = await this.emailService.sendTemplateEmail(
        'invitation_cancelled',
        invitation.email,
        {
          recipientName: invitation.role === 'establishment_admin' 
            ? invitation.establishment_name 
            : invitation.email,
          establishmentName: invitation.establishment_name,
          inviterName: invitation.inviter_name,
          role: invitation.role
        }
      );

      this.logger.info(
        'Invitation cancellation email sent successfully',
        {
          invitationId: invitation.id,
          email: invitation.email,
          emailTrackingId
        },
        'INVITATION_EMAIL'
      );

      return {
        success: true,
        invitationId: invitation.id,
        message: 'Cancellation notification sent successfully',
        emailSent: true,
        trackingId: emailTrackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send invitation cancellation email',
        error as Error,
        { 
          invitationId: invitation.id,
          email: invitation.email 
        },
        'INVITATION_EMAIL'
      );

      return {
        success: false,
        message: 'Failed to send cancellation notification',
        emailSent: false
      };
    }
  }

  /**
   * Test email configuration (for testing endpoints)
   */
  public async testConfiguration(): Promise<any> {
    try {
      // Delegate to the underlying email service
      return await (this.emailService as any).testConfiguration();
    } catch (error) {
      this.logger.error(
        'Failed to test email configuration',
        error as Error,
        {},
        'INVITATION_EMAIL'
      );
      throw error;
    }
  }

  /**
   * Get email statistics (for monitoring endpoints)
   */
  public getEmailStats(): any {
    try {
      // Delegate to the underlying email service
      return (this.emailService as any).getEmailStats();
    } catch (error) {
      this.logger.error(
        'Failed to get email stats',
        error as Error,
        {},
        'INVITATION_EMAIL'
      );
      throw error;
    }
  }

  /**
   * Validate email configuration (for health checks)
   */
  public validateConfiguration(): any {
    try {
      // Delegate to the underlying email service
      return (this.emailService as any).validateConfiguration();
    } catch (error) {
      this.logger.error(
        'Failed to validate email configuration',
        error as Error,
        {},
        'INVITATION_EMAIL'
      );
      throw error;
    }
  }
}
