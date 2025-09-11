/**
 * Establishment Account Service
 * Main orchestrator for establishment account creation
 */

import { Pool } from 'pg';
import { Logger } from '../../utils/logger';
import { 
  EstablishmentAccountCreationRequest,
  EstablishmentAccountCreationResponse 
} from '../../routes/establishmentAccountCreation/types';
import { AccountCreationOrchestrator, AccountCreationResult } from './AccountCreationOrchestrator';

/**
 * Establishment Account Service Class
 */
export class EstablishmentAccountService {
  private logger: Logger;
  private orchestrator: AccountCreationOrchestrator;
  private pool: Pool;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
    this.orchestrator = new AccountCreationOrchestrator(logger);
  }

  /**
   * Complete establishment account creation
   */
  public async completeAccountCreation(
    request: EstablishmentAccountCreationRequest
  ): Promise<EstablishmentAccountCreationResponse> {
    const client = await this.pool.connect();
    
    try {
      this.logger.info('Processing establishment account creation request', {
        token: request.token.substring(0, 8) + '...',
        businessType: request.businessInfo.businessType
      });

      // Validate invitation token
      const invitationValidation = await this.validateInvitationToken(client, request.token);
      if (!invitationValidation.isValid) {
        return {
          success: false,
          error: invitationValidation.error || 'Invalid invitation token'
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(request.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.error || 'Invalid password'
        };
      }

      // Create establishment account
      const result = await this.orchestrator.createEstablishmentAccount(
        client,
        invitationValidation,
        request.password,
        request.businessInfo
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Account creation failed'
        };
      }

      // Send completion email
      await this.sendCompletionEmail(result.establishment!, result.user!);

      return {
        success: true,
        message: 'Establishment account created successfully',
        data: {
          user: result.user!,
          establishment: result.establishment!,
          token: result.token!
        }
      };

    } catch (error) {
      this.logger.error('Establishment account creation service error', error as Error);
      return {
        success: false,
        error: 'Internal server error during account creation'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate invitation token
   */
  private async validateInvitationToken(client: any, token: string): Promise<any> {
    try {
      const query = `
        SELECT ui.*, e.id as establishment_id, e.name as establishment_name, 
               e.email as establishment_email, e.status as establishment_status
        FROM user_invitations ui
        LEFT JOIN establishments e ON ui.establishment_id = e.id
        WHERE ui.invitation_token = $1 
          AND ui.status = 'pending'
          AND ui.expires_at > CURRENT_TIMESTAMP
      `;

      const result = await client.query(query, [token]);

      if (result.rows.length === 0) {
        return {
          isValid: false,
          error: 'Invalid or expired invitation token'
        };
      }

      const invitation = result.rows[0];

      if (!invitation.establishment_id) {
        return {
          isValid: false,
          error: 'Invitation not associated with an establishment'
        };
      }

      if (invitation.establishment_status === 'active') {
        return {
          isValid: false,
          error: 'Establishment setup already completed'
        };
      }

      return {
        isValid: true,
        establishment: {
          id: invitation.establishment_id,
          name: invitation.establishment_name,
          email: invitation.establishment_email,
          status: invitation.establishment_status
        },
        token
      };
    } catch (error) {
      this.logger.error('Invitation token validation error', error as Error);
      return {
        isValid: false,
        error: 'Database error during token validation'
      };
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): { isValid: boolean; error?: string } {
    if (password.length < 8) {
      return {
        isValid: false,
        error: 'Password must be at least 8 characters long'
      };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      };
    }

    return { isValid: true };
  }

  /**
   * Send completion email
   */
  private async sendCompletionEmail(establishment: any, user: any): Promise<void> {
    try {
      // TODO: Implement email service integration
      // This will send a welcome email to the new establishment admin
      this.logger.info('Completion email would be sent', {
        establishmentId: establishment.id,
        userEmail: user.email
      });
    } catch (error) {
      this.logger.warn('Failed to send completion email', error as Error);
      // Don't fail the entire process if email fails
    }
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): { status: string; components: string[] } {
    return {
      status: 'healthy',
      components: [
        'EstablishmentAccountService',
        'AccountCreationOrchestrator',
        'BusinessInfoValidator'
      ]
    };
  }
}
