/**
 * Establishment Invitation Manager
 * Handles invitation creation and setup workflow for new establishments
 */

import { PoolClient } from 'pg';
import { Logger } from '../../utils/logger';
import { randomUUID } from 'crypto';

/**
 * Invitation data interface
 */
export interface InvitationData {
  token: string;
  link: string;
  setup_instructions: string;
}

/**
 * Establishment Invitation Manager Class
 */
export class EstablishmentInvitationManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Generate invitation data for business owner
   */
  public async generateInvitationData(
    client: PoolClient,
    establishmentId: string,
    email: string,
    establishmentName: string
  ): Promise<InvitationData> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user invitation record
    await this.createUserInvitation(client, {
      email,
      establishmentId,
      establishmentName,
      token,
      expiresAt
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/setup/invitation/${token}`;

    const setup_instructions = this.generateSetupInstructions();

    this.logger.info(
      'Invitation data generated successfully',
      { 
        establishment_id: establishmentId,
        email,
        token: token.substring(0, 8) + '...' // Log partial token for security
      },
      'ESTABLISHMENT_INVITATION_MANAGER'
    );

    return { token, link, setup_instructions };
  }

  /**
   * Create user invitation record
   */
  private async createUserInvitation(
    client: PoolClient,
    data: {
      email: string;
      establishmentId: string;
      establishmentName: string;
      token: string;
      expiresAt: Date;
    }
  ): Promise<void> {
    const invitationQuery = `
      INSERT INTO user_invitations (
        email, establishment_id, inviter_user_id, inviter_name,
        establishment_name, role, invitation_token, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await client.query(invitationQuery, [
      data.email,
      data.establishmentId,
      'system', // System admin
      'MuseBar System',
      data.establishmentName,
      'establishment_admin',
      data.token,
      data.expiresAt,
      'pending'
    ]);
  }

  /**
   * Generate setup instructions
   */
  private generateSetupInstructions(): string {
    return `
      Welcome to MuseBar! Your establishment has been created successfully.
      
      To complete your setup:
      1. Click the invitation link above
      2. Create your admin account
      3. Configure your business settings
      4. Set up your menu and products
      5. Invite your team members
      
      Your invitation expires in 7 days.
    `.trim();
  }

  /**
   * Validate invitation token
   */
  public async validateInvitationToken(
    client: PoolClient,
    token: string
  ): Promise<{
    isValid: boolean;
    invitation?: any;
    error?: string;
  }> {
    try {
      const invitationQuery = `
        SELECT * FROM user_invitations 
        WHERE invitation_token = $1 
        AND status = 'pending' 
        AND expires_at > NOW()
      `;

      const result = await client.query(invitationQuery, [token]);

      if (result.rows.length === 0) {
        return {
          isValid: false,
          error: 'Invalid or expired invitation token'
        };
      }

      return {
        isValid: true,
        invitation: result.rows[0]
      };

    } catch (error) {
      this.logger.error(
        'Error validating invitation token',
        { error: error as Error, token: token.substring(0, 8) + '...' },
        'ESTABLISHMENT_INVITATION_MANAGER'
      );

      return {
        isValid: false,
        error: 'Failed to validate invitation token'
      };
    }
  }

  /**
   * Mark invitation as accepted
   */
  public async markInvitationAccepted(
    client: PoolClient,
    token: string,
    acceptedAt: Date = new Date()
  ): Promise<void> {
    const updateQuery = `
      UPDATE user_invitations 
      SET status = 'accepted', accepted_at = $1 
      WHERE invitation_token = $2
    `;

    await client.query(updateQuery, [acceptedAt, token]);

    this.logger.info(
      'Invitation marked as accepted',
      { token: token.substring(0, 8) + '...' },
      'ESTABLISHMENT_INVITATION_MANAGER'
    );
  }
}
