/**
 * Establishment Creation Orchestrator
 * Main coordinator for establishment creation workflow - orchestrates all focused services
 */

import { pool } from '../../app';
import { Logger } from '../../utils/logger';
import { EmailService } from '../email';
import { getEnvironmentConfig } from '../../config/environment';

// Import focused services
import { EstablishmentValidator, EnhancedCreateEstablishmentRequest } from './EstablishmentValidator';
import { EstablishmentDataProcessor } from './EstablishmentDataProcessor';
import { EstablishmentInvitationManager } from './EstablishmentInvitationManager';
import { EstablishmentAuditService } from './EstablishmentAuditService';

/**
 * Enhanced establishment creation response interface
 */
export interface EnhancedCreateEstablishmentResponse {
  success: boolean;
  message: string;
  establishment: {
    id: string;
    name: string;
    email: string;
    status: string;
    schema_name: string;
    subscription_plan: string;
    /** Generic instructions only; invitation token/link are never returned in API. */
    setup_instructions?: string;
  };
  audit_log: {
    id: string;
    action: string;
    timestamp: Date;
  };
}

/**
 * Establishment Creation Orchestrator Class
 * Thin coordinator that orchestrates focused services
 */
export class EstablishmentCreationOrchestrator {
  private logger: Logger;
  private emailService: EmailService;
  private config: ReturnType<typeof getEnvironmentConfig>;

  // Focused service instances
  private validator: EstablishmentValidator;
  private dataProcessor: EstablishmentDataProcessor;
  private invitationManager: EstablishmentInvitationManager;
  private auditService: EstablishmentAuditService;

  constructor(logger: Logger) {
    this.logger = logger;
    this.config = getEnvironmentConfig();
    this.emailService = EmailService.getInstance(this.config, logger);

    // Initialize focused services
    this.validator = new EstablishmentValidator(logger);
    this.dataProcessor = new EstablishmentDataProcessor(logger);
    this.invitationManager = new EstablishmentInvitationManager(logger);
    this.auditService = new EstablishmentAuditService(logger);
  }

  /**
   * Create new establishment with enhanced workflow
   */
  public async createEstablishment(
    data: EnhancedCreateEstablishmentRequest,
    createdByUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EnhancedCreateEstablishmentResponse> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Step 1: Validate establishment data
      const validationResult = this.validator.validateEstablishmentData(data);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Step 2: Check establishment uniqueness
      await this.dataProcessor.checkEstablishmentUniqueness(client, data);

      // Step 3: Generate unique schema name
      const schemaName = this.dataProcessor.generateSchemaName();

      // Step 4: Create establishment record
      this.logger.info('Creating establishment record', { name: data.name }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');
      const establishment = await this.dataProcessor.createEstablishmentRecord(client, data, schemaName);
      this.logger.info('Establishment record created', { id: establishment.id }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');

      // Step 5: Create isolated schema and tables
      this.logger.info('Creating establishment schema', { schemaName }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');
      await this.dataProcessor.createEstablishmentSchema(client, schemaName);
      this.logger.info('Establishment schema created', { schemaName }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');

      // Step 6: Generate invitation data
      this.logger.info('Generating invitation data', { establishmentId: establishment.id, email: data.email }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');
      const invitationData = await this.invitationManager.generateInvitationData(
        client,
        establishment.id,
        data.email,
        data.name
      );
      this.logger.info('Invitation data generated', { token: invitationData.token.substring(0, 8) + '...' }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');

      // Step 7: Send establishment creation confirmation email
      this.logger.info('Sending creation confirmation email', { email: data.email }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');
      await this.sendCreationConfirmationEmail(data, establishment, invitationData);
      this.logger.info('Creation confirmation email sent', { email: data.email }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');

      // Step 8: Create audit trail
      this.logger.info('Creating audit trail', { establishmentId: establishment.id, userId: createdByUserId }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');
      const auditLog = await this.auditService.logEstablishmentCreation(
        client,
        establishment.id,
        createdByUserId,
        data,
        ipAddress,
        userAgent
      );
      this.logger.info('Audit trail created', { auditId: auditLog.id }, 'ESTABLISHMENT_CREATION_ORCHESTRATOR');

      await client.query('COMMIT');

      this.logger.info(
        'Establishment created successfully',
        { 
          establishment_id: establishment.id,
          name: data.name,
          email: data.email,
          schema_name: schemaName
        },
        'ESTABLISHMENT_CREATION_ORCHESTRATOR'
      );

      return {
        success: true,
        message: 'Establishment created successfully. Setup invitation sent to business owner.',
        establishment: {
          id: establishment.id,
          name: establishment.name,
          email: establishment.email,
          status: establishment.status,
          schema_name: establishment.schema_name,
          subscription_plan: establishment.subscription_plan,
          setup_instructions: invitationData.setup_instructions
        },
        audit_log: {
          id: auditLog.id,
          action: auditLog.action,
          timestamp: auditLog.created_at
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error(
        'Failed to create establishment',
        { 
          error: error as Error,
          errorMessage: (error as Error).message,
          errorStack: (error as Error).stack,
          establishment_data: data,
          created_by: createdByUserId
        },
        'ESTABLISHMENT_CREATION_ORCHESTRATOR'
      );
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get establishment creation statistics
   */
  public async getCreationStats(): Promise<{
    total_establishments: number;
    pending_setup: number;
    active: number;
    suspended: number;
    this_month: number;
  }> {
    const client = await pool.connect();
    
    try {
      return await this.dataProcessor.getCreationStats(client);
    } finally {
      client.release();
    }
  }

  /**
   * Send establishment creation confirmation email
   */
  private async sendCreationConfirmationEmail(
    data: EnhancedCreateEstablishmentRequest,
    establishment: any,
    invitationData: any
  ): Promise<void> {
    try {
      await this.emailService.sendTemplateEmail(
        'establishment_created',
        data.email,
        {
          establishment_name: data.name,
          business_owner_email: data.email,
          subscription_plan: data.subscription_plan || 'basic',
          invitation_link: invitationData.link,
          setup_instructions: invitationData.setup_instructions,
          support_email: process.env.SUPPORT_EMAIL || 'support@musebar.com'
        }
      );

      this.logger.info(
        'Establishment creation confirmation email sent',
        { 
          email: data.email,
          establishment_id: establishment.id
        },
        'ESTABLISHMENT_CREATION_ORCHESTRATOR'
      );

    } catch (error) {
      this.logger.error(
        'Failed to send establishment creation confirmation email',
        { 
          error: error as Error,
          email: data.email,
          establishment_id: establishment.id
        },
        'ESTABLISHMENT_CREATION_ORCHESTRATOR'
      );
      
      // Don't fail the entire operation if email fails
      // The invitation data is still created and can be resent
    }
  }
}
