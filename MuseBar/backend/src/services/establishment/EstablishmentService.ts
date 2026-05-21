/**
 * Establishment Service
 * Handles establishment business logic and operations (list, get, delete, legacy create).
 * Lives in establishment/ directory; enhanced creation uses EstablishmentCreationOrchestrator.
 */

import { pool } from '../../db/pool';
import crypto from 'crypto';
import { EstablishmentModel } from '../../models/establishment';
import { AuditTrailModel } from '../../models/auditTrail';
import { EmailService } from '../email';
import { Logger } from '../../utils/logger';
import { getEnvironmentConfig } from '../../config/environment';

export interface CreateEstablishmentRequest {
  name: string;
  phone: string;
  address: string;
  tva_number?: string;
  siret_number?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
  owner_email: string;
}

export interface CreateEstablishmentResponse {
  message: string;
  establishment: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
}

export interface GetEstablishmentsResponse {
  establishments: unknown[];
  total: number;
}

export class EstablishmentService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public async createEstablishment(
    data: CreateEstablishmentRequest,
    createdByUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CreateEstablishmentResponse> {
    try {
      this.validateCreateEstablishmentData(data);

      const existingEst = await pool.query(
        'SELECT id FROM establishments WHERE name = $1',
        [data.name]
      );

      if (existingEst.rows.length > 0) {
        throw new Error('Establishment with this name already exists');
      }

      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      EstablishmentModel.initialize(this.logger);

      const establishment = await EstablishmentModel.createEstablishment({
        name: data.name,
        email: data.owner_email,
        phone: data.phone,
        address: data.address,
        subscription_plan: data.subscription_plan || 'basic'
      });

      await pool.query(`
        UPDATE establishments SET 
          tva_number = $1,
          siret_number = $2,
          status = 'setup_required',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [data.tva_number, data.siret_number, establishment.id]);

      await this.createInvitationRecord(
        data.owner_email,
        establishment.id,
        invitationToken,
        expiresAt,
        createdByUserId,
        data.name
      );

      await AuditTrailModel.logAction({
        user_id: createdByUserId,
        action_type: 'CREATE_ESTABLISHMENT',
        resource_type: 'ESTABLISHMENT',
        resource_id: establishment.id,
        action_details: {
          establishment_name: data.name,
          owner_email: data.owner_email,
          subscription_plan: data.subscription_plan
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      await this.sendSetupInvitationEmail(
        data.owner_email,
        data.name,
        invitationToken,
        expiresAt
      );

      this.logger.info(
        'Establishment created successfully',
        {
          establishmentId: establishment.id,
          establishmentName: data.name,
          ownerEmail: data.owner_email
        },
        'ESTABLISHMENT_SERVICE'
      );

      return {
        message: 'Establishment created successfully. Setup invitation sent to business owner by email.',
        establishment: {
          id: establishment.id,
          name: establishment.name,
          email: establishment.email,
          status: 'setup_required'
        }
      };
    } catch (error) {
      this.logger.error(
        'Failed to create establishment',
        { error: error as Error, establishmentData: data },
        'ESTABLISHMENT_SERVICE'
      );
      throw error;
    }
  }

  public async getAllEstablishments(): Promise<GetEstablishmentsResponse> {
    try {
      const result = await pool.query(`
        SELECT 
          id, name, email, phone, address, tva_number, siret_number,
          subscription_plan, status, created_at
        FROM establishments 
        ORDER BY created_at DESC
      `);

      return {
        establishments: result.rows,
        total: result.rows.length
      };
    } catch (error) {
      this.logger.error(
        'Failed to fetch establishments',
        { error: error as Error },
        'ESTABLISHMENT_SERVICE'
      );
      throw error;
    }
  }

  public async getEstablishmentById(id: string): Promise<{
    establishment: unknown;
    invitations: unknown[];
  }> {
    try {
      const result = await pool.query(
        'SELECT * FROM establishments WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Establishment not found');
      }

      const invitations = await pool.query(`
        SELECT email, role, status, created_at, expires_at
        FROM user_invitations 
        WHERE establishment_id = $1
        ORDER BY created_at DESC
      `, [id]);

      return {
        establishment: result.rows[0],
        invitations: invitations.rows
      };
    } catch (error) {
      this.logger.error(
        'Failed to fetch establishment',
        { error: error as Error, establishmentId: id },
        'ESTABLISHMENT_SERVICE'
      );
      throw error;
    }
  }

  public async deleteEstablishment(id: string): Promise<void> {
    try {
      EstablishmentModel.initialize(this.logger);
      await EstablishmentModel.deleteEstablishment(id);

      this.logger.info(
        'Establishment deleted successfully',
        { establishmentId: id },
        'ESTABLISHMENT_SERVICE'
      );
    } catch (error) {
      this.logger.error(
        'Failed to delete establishment',
        { error: error as Error, establishmentId: id },
        'ESTABLISHMENT_SERVICE'
      );
      throw error;
    }
  }

  private validateCreateEstablishmentData(data: CreateEstablishmentRequest): void {
    if (!data.name || !data.owner_email || !data.phone || !data.address) {
      throw new Error('Missing required fields: name, owner_email, phone, address');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.owner_email)) {
      throw new Error('Invalid email format for owner_email');
    }
  }

  private async createInvitationRecord(
    ownerEmail: string,
    establishmentId: string,
    invitationToken: string,
    expiresAt: Date,
    inviterUserId: string,
    establishmentName: string
  ): Promise<void> {
    await pool.query(`
      INSERT INTO user_invitations (
        email, role, establishment_id, invitation_token, expires_at,
        inviter_user_id, inviter_name, establishment_name, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', CURRENT_TIMESTAMP)
    `, [
      ownerEmail,
      'establishment_admin',
      establishmentId,
      invitationToken,
      expiresAt,
      inviterUserId,
      'System Administrator',
      establishmentName
    ]);
  }

  private async sendSetupInvitationEmail(
    ownerEmail: string,
    establishmentName: string,
    invitationToken: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      const emailService = EmailService.getInstance(
        getEnvironmentConfig(),
        this.logger
      );

      const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/establishment-setup/${invitationToken}`;
      const expirationDate = expiresAt.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await emailService.sendTemplateEmail(
        'establishment_setup',
        ownerEmail,
        {
          ownerName: ownerEmail.split('@')[0],
          establishmentName: establishmentName,
          inviterName: 'System Administrator',
          setupUrl: setupUrl,
          expirationDate: expirationDate
        }
      );

      this.logger.info(
        'Setup invitation email sent successfully',
        { ownerEmail, establishmentName },
        'ESTABLISHMENT_SERVICE'
      );
    } catch (emailError) {
      this.logger.error(
        'Failed to send setup invitation email',
        {
          error: emailError as Error,
          ownerEmail,
          establishmentName
        },
        'ESTABLISHMENT_SERVICE'
      );
    }
  }
}
