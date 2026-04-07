/**
 * Establishment Account Service
 * Main orchestrator for establishment account creation
 */

import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { Logger } from '../../utils/logger';
import { InvitationQueries } from '../../utils/database';
import { validatePassword as validatePasswordShared } from '../../utils/passwordValidation';
import { 
  EstablishmentAccountCreationRequest,
  EstablishmentAccountCreationResponse 
} from '../../routes/establishmentAccountCreation/types';
import { AccountCreationOrchestrator } from './AccountCreationOrchestrator';

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
    this.logger.info('Getting database client connection...');
    const client = await this.pool.connect();
    this.logger.info('Database client connected successfully');
    
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
          message: invitationValidation.error || 'Invalid invitation token',
          error: invitationValidation.error || 'Invalid invitation token'
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(request.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.error || 'Invalid password',
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
          message: result.error || 'Account creation failed',
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
        message: 'Internal server error during account creation',
        error: 'Internal server error during account creation'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate invitation token (uses shared InvitationQueries.getInvitationByToken).
   */
  private async validateInvitationToken(
    client: PoolClient,
    token: string
  ): Promise<
    | {
        isValid: false;
        error: string;
      }
    | {
        isValid: true;
        establishment: { id: string; name: string; email: string; status: unknown };
        token: string;
      }
  > {
    try {
      const invitation = await InvitationQueries.getInvitationByToken(client, token);
      if (!invitation) {
        return { isValid: false, error: 'Invalid or expired invitation token' };
      }
      if (!invitation.establishment_id) {
        return { isValid: false, error: 'Invitation not associated with an establishment' };
      }
      if (invitation.establishment_status === 'active') {
        return { isValid: false, error: 'Establishment setup already completed' };
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

  /** Validate password (uses shared utils/passwordValidation). */
  private validatePassword(password: string): { isValid: boolean; error?: string } {
    return validatePasswordShared(password);
  }

  /**
   * Send completion email
   */
  private async sendCompletionEmail(
    establishment: { id: string },
    user: { email: string }
  ): Promise<void> {
    try {
      // TODO: Implement email service integration
      // This will send a welcome email to the new establishment admin
      this.logger.info('Completion email would be sent', {
        establishmentId: establishment.id,
        userEmail: user.email
      });
    } catch (error) {
      this.logger.warn('Failed to send completion email', { error: error instanceof Error ? error.message : String(error) });
      // Don't fail the entire process if email fails
    }
  }

  /**
   * Validate invitation token (public method for route handlers)
   */
  public async validateInvitation(token: string): Promise<{
    isValid: boolean;
    establishment?: { id: string; name: string; email: string; status: unknown };
    error?: string;
  }> {
    const client = await this.pool.connect();
    
    try {
      const result = await this.validateInvitationToken(client, token);
      return result;
    } finally {
      client.release();
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
