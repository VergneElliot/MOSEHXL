/**
 * User Invitation Service
 * Handles secure user invitations, email verification, and self-service account setup
 */

import { randomBytes, createHash } from 'crypto';
import { EmailService } from './emailService';
import { Logger } from '../utils/logger';
import { DatabaseManager } from '../config/database';

/**
 * User invitation interface
 */
export interface UserInvitation {
  id: string;
  email: string;
  establishmentId?: string; // For multi-tenant (future)
  inviterUserId: string;
  inviterName: string;
  establishmentName: string;
  role: string;
  firstName?: string;
  lastName?: string;
  invitationToken: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: Date;
  acceptedAt?: Date;
}

/**
 * Account setup data
 */
export interface AccountSetupData {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
  token: string;
  expiresAt: Date;
  userId: string;
}

/**
 * User Invitation Service Class
 */
export class UserInvitationService {
  private static instance: UserInvitationService;
  private emailService: EmailService;
  private logger: Logger;
  private database: DatabaseManager;

  // In-memory storage for invitations (in production, this would be in database)
  private invitations: Map<string, UserInvitation> = new Map();
  private passwordResets: Map<string, PasswordResetRequest> = new Map();

  private constructor(emailService: EmailService, logger: Logger, database: DatabaseManager) {
    this.emailService = emailService;
    this.logger = logger;
    this.database = database;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    emailService?: EmailService,
    logger?: Logger,
    database?: DatabaseManager
  ): UserInvitationService {
    if (!UserInvitationService.instance && emailService && logger && database) {
      UserInvitationService.instance = new UserInvitationService(emailService, logger, database);
    }
    return UserInvitationService.instance;
  }

  /**
   * Send user invitation
   */
  public async sendInvitation(
    email: string,
    inviterUserId: string,
    inviterName: string,
    establishmentName: string,
    role: string = 'cashier',
    firstName?: string,
    lastName?: string,
    establishmentId?: string
  ): Promise<string> {
    try {
      // Generate secure invitation token
      const invitationToken = this.generateSecureToken();
      const invitationId = this.generateInvitationId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation record
      const invitation: UserInvitation = {
        id: invitationId,
        email,
        establishmentId,
        inviterUserId,
        inviterName,
        establishmentName,
        role,
        firstName,
        lastName,
        invitationToken,
        expiresAt,
        status: 'pending',
        createdAt: new Date(),
      };

      // Store invitation
      this.invitations.set(invitationToken, invitation);

      // Generate invitation URL
      const invitationUrl = this.generateInvitationUrl(invitationToken);

      // Send invitation email
      const trackingId = await this.emailService.sendTemplateEmail(
        'user_invitation',
        email,
        {
          recipientName: firstName ? `${firstName} ${lastName || ''}`.trim() : email,
          establishmentName,
          inviterName,
          invitationUrl,
          expirationDate: expiresAt.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }
      );

      this.logger.info(
        'User invitation sent successfully',
        {
          invitationId,
          email,
          establishmentName,
          role,
          inviterUserId,
          trackingId,
        },
        'USER_INVITATION',
        undefined,
        inviterUserId
      );

      return invitationToken;

    } catch (error) {
      this.logger.error(
        'Failed to send user invitation',
        error as Error,
        {
          email,
          establishmentName,
          role,
          inviterUserId,
        },
        'USER_INVITATION',
        undefined,
        inviterUserId
      );

      throw error;
    }
  }

  /**
   * Validate invitation token
   */
  public async validateInvitation(token: string): Promise<UserInvitation | null> {
    const invitation = this.invitations.get(token);

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      this.logger.warn(
        'Invitation token expired',
        { invitationId: invitation.id, email: invitation.email },
        'USER_INVITATION'
      );
      return null;
    }

    // Check if already accepted
    if (invitation.status !== 'pending') {
      return null;
    }

    return invitation;
  }

  /**
   * Accept invitation and set up account
   */
  public async acceptInvitation(
    token: string,
    accountSetupData: AccountSetupData
  ): Promise<{ success: boolean; userId?: string; message: string }> {
    try {
      // Validate invitation
      const invitation = await this.validateInvitation(token);
      
      if (!invitation) {
        return {
          success: false,
          message: 'Invitation token is invalid or has expired.',
        };
      }

      // Validate password confirmation
      if (accountSetupData.password !== accountSetupData.confirmPassword) {
        return {
          success: false,
          message: 'Password confirmation does not match.',
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(accountSetupData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `Password requirements not met: ${passwordValidation.issues.join(', ')}`,
        };
      }

      // Check if user already exists
      const existingUser = await this.database.query(
        'SELECT id FROM users WHERE email = $1',
        [invitation.email]
      );

      if (existingUser.length > 0) {
        return {
          success: false,
          message: 'An account with this email already exists.',
        };
      }

      // Create user account using transaction
      const userId = await this.database.transaction(async (client) => {
        // Hash password
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash(accountSetupData.password, 12);

        // Create user
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            invitation.email,
            passwordHash,
            accountSetupData.firstName,
            accountSetupData.lastName,
            invitation.role,
            true,
            true, // Email is verified through invitation process
            new Date(),
          ]
        );

        return userResult.rows[0].id;
      });

      // Mark invitation as accepted
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();

      this.logger.info(
        'User invitation accepted and account created',
        {
          invitationId: invitation.id,
          userId,
          email: invitation.email,
          role: invitation.role,
          establishmentName: invitation.establishmentName,
        },
        'USER_INVITATION',
        undefined,
        userId
      );

      // Send welcome email
      await this.sendWelcomeEmail(invitation, accountSetupData);

      return {
        success: true,
        userId,
        message: 'Account created successfully! You can now log in.',
      };

    } catch (error) {
      this.logger.error(
        'Failed to accept invitation',
        error as Error,
        { token },
        'USER_INVITATION'
      );

      return {
        success: false,
        message: 'An error occurred while creating your account. Please try again.',
      };
    }
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(email: string): Promise<boolean> {
    try {
      // Check if user exists
      const users = await this.database.query(
        'SELECT id, first_name, last_name FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (users.length === 0) {
        // Don't reveal if email exists or not for security
        this.logger.warn(
          'Password reset requested for non-existent email',
          { email },
          'USER_INVITATION'
        );
        return true; // Still return true to avoid email enumeration
      }

      const user = users[0];
      const resetToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store password reset request
      this.passwordResets.set(resetToken, {
        email,
        token: resetToken,
        expiresAt,
        userId: user.id,
      });

      // Generate reset URL
      const resetUrl = this.generatePasswordResetUrl(resetToken);

      // Send password reset email
      await this.emailService.sendTemplateEmail(
        'password_reset',
        email,
        {
          recipientName: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : email,
          resetUrl,
          expirationTime: '1 hour',
        }
      );

      this.logger.info(
        'Password reset email sent',
        { email, userId: user.id },
        'USER_INVITATION',
        undefined,
        user.id
      );

      return true;

    } catch (error) {
      this.logger.error(
        'Failed to send password reset email',
        error as Error,
        { email },
        'USER_INVITATION'
      );

      return false;
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate token
      const resetRequest = this.passwordResets.get(token);
      
      if (!resetRequest || resetRequest.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Password reset token is invalid or has expired.',
        };
      }

      // Validate password confirmation
      if (newPassword !== confirmPassword) {
        return {
          success: false,
          message: 'Password confirmation does not match.',
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `Password requirements not met: ${passwordValidation.issues.join(', ')}`,
        };
      }

      // Update password
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await this.database.query(
        'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
        [passwordHash, new Date(), resetRequest.userId]
      );

      // Remove used token
      this.passwordResets.delete(token);

      this.logger.info(
        'Password reset completed',
        { userId: resetRequest.userId, email: resetRequest.email },
        'USER_INVITATION',
        undefined,
        resetRequest.userId
      );

      return {
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.',
      };

    } catch (error) {
      this.logger.error(
        'Failed to reset password',
        error as Error,
        { token },
        'USER_INVITATION'
      );

      return {
        success: false,
        message: 'An error occurred while resetting your password. Please try again.',
      };
    }
  }

  /**
   * Send welcome email after successful account setup
   */
  private async sendWelcomeEmail(invitation: UserInvitation, accountData: AccountSetupData): Promise<void> {
    try {
      await this.emailService.sendTemplateEmail(
        'email_verification',
        invitation.email,
        {
          recipientName: `${accountData.firstName} ${accountData.lastName}`.trim(),
          establishmentName: invitation.establishmentName,
          verificationUrl: this.generateLoginUrl(),
        }
      );
    } catch (error) {
      // Don't fail the whole process if welcome email fails
      this.logger.warn(
        'Failed to send welcome email',
        { error: (error as Error).message, email: invitation.email },
        'USER_INVITATION'
      );
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (password.length < 8) {
      issues.push('Must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      issues.push('Must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      issues.push('Must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      issues.push('Must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      issues.push('Must contain at least one special character');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate invitation ID
   */
  private generateInvitationId(): string {
    return `inv_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate invitation URL
   */
  private generateInvitationUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/accept-invitation?token=${token}`;
  }

  /**
   * Generate password reset URL
   */
  private generatePasswordResetUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/reset-password?token=${token}`;
  }

  /**
   * Generate login URL
   */
  private generateLoginUrl(): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/login`;
  }

  /**
   * Get invitation statistics
   */
  public getInvitationStats(): {
    totalInvitations: number;
    pendingInvitations: number;
    acceptedInvitations: number;
    expiredInvitations: number;
  } {
    const invitations = Array.from(this.invitations.values());
    
    return {
      totalInvitations: invitations.length,
      pendingInvitations: invitations.filter(inv => inv.status === 'pending').length,
      acceptedInvitations: invitations.filter(inv => inv.status === 'accepted').length,
      expiredInvitations: invitations.filter(inv => inv.status === 'expired').length,
    };
  }

  /**
   * Cancel invitation
   */
  public async cancelInvitation(token: string, cancellerId: string): Promise<boolean> {
    const invitation = this.invitations.get(token);
    
    if (!invitation || invitation.status !== 'pending') {
      return false;
    }

    invitation.status = 'cancelled';

    this.logger.info(
      'Invitation cancelled',
      { invitationId: invitation.id, email: invitation.email, cancellerId },
      'USER_INVITATION',
      undefined,
      cancellerId
    );

    return true;
  }

  /**
   * Get pending invitations for an establishment
   */
  public getPendingInvitations(establishmentId?: string): UserInvitation[] {
    return Array.from(this.invitations.values())
      .filter(inv => 
        inv.status === 'pending' && 
        (!establishmentId || inv.establishmentId === establishmentId)
      );
  }

  /**
   * Cleanup expired invitations and password resets
   */
  public cleanupExpired(): void {
    const now = new Date();
    let cleanedInvitations = 0;
    let cleanedResets = 0;

    // Cleanup expired invitations
    for (const [token, invitation] of this.invitations.entries()) {
      if (invitation.expiresAt < now && invitation.status === 'pending') {
        invitation.status = 'expired';
        cleanedInvitations++;
      }
    }

    // Cleanup expired password resets
    for (const [token, reset] of this.passwordResets.entries()) {
      if (reset.expiresAt < now) {
        this.passwordResets.delete(token);
        cleanedResets++;
      }
    }

    if (cleanedInvitations > 0 || cleanedResets > 0) {
      this.logger.info(
        'Cleaned up expired tokens',
        { expiredInvitations: cleanedInvitations, expiredResets: cleanedResets },
        'USER_INVITATION'
      );
    }
  }
} 