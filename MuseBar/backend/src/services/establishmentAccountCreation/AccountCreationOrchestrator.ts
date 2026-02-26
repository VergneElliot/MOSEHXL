/**
 * Account Creation Orchestrator
 * Orchestrates the complete establishment account creation process
 */

import { PoolClient } from 'pg';
import { Logger } from '../../utils/logger';
import { BusinessInfo } from '../../routes/establishmentAccountCreation/types';
import { BusinessInfoValidator } from './BusinessInfoValidator';
import { UserAccountOperations } from './database/UserAccountOperations';
import { EstablishmentOperations } from './database/EstablishmentOperations';
import { SchemaOperations } from './database/SchemaOperations';
import { InvitationOperations } from './database/InvitationOperations';
import { EmailService } from '../email/EmailService';
import { EnvironmentConfig, getEnvironmentConfig } from '../../config/environment';

/**
 * Account Creation Result
 */
export interface AccountCreationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    establishment_id: string;
  };
  establishment?: {
    id: string;
    name: string;
    status: string;
  };
  token?: string;
  error?: string;
}

/**
 * Account Creation Orchestrator Class
 */
export class AccountCreationOrchestrator {
  private logger: Logger;
  private businessInfoValidator: BusinessInfoValidator;
  private userAccountOperations: UserAccountOperations;
  private establishmentOperations: EstablishmentOperations;
  private schemaOperations: SchemaOperations;
  private invitationOperations: InvitationOperations;
  private emailService: EmailService;
  private config: EnvironmentConfig;

  constructor(logger: Logger) {
    this.logger = logger;
    this.config = getEnvironmentConfig();
    this.businessInfoValidator = new BusinessInfoValidator(logger);
    this.userAccountOperations = new UserAccountOperations(logger, this.config.security.jwtSecret);
    this.establishmentOperations = new EstablishmentOperations(logger);
    this.schemaOperations = new SchemaOperations(logger);
    this.invitationOperations = new InvitationOperations(logger);
    this.emailService = EmailService.getInstance(this.config, logger);
  }

  /**
   * Orchestrate complete account creation process
   */
  public async createEstablishmentAccount(
    client: PoolClient,
    invitationData: any,
    password: string,
    businessInfo: BusinessInfo,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AccountCreationResult> {
    try {
      this.logger.info('Starting establishment account creation', {
        establishmentId: invitationData.establishment.id,
        establishmentName: invitationData.establishment.name
      });

      // Validate business information
      const validation = this.businessInfoValidator.validateBusinessInfo(businessInfo);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Business information validation failed: ${validation.errors?.join(', ') || 'Unknown validation error'}`
        };
      }

      const sanitizedBusinessInfo = this.establishmentOperations.sanitizeBusinessInfo(businessInfo);

      // Start database transaction
      await client.query('BEGIN');

      try {
        // Step 1: Create user account
        const userAccountData = {
          email: invitationData.establishment.email,
          password: password,
          establishmentId: invitationData.establishment.id,
          role: 'establishment_admin'
        };

        const createdUser = await this.userAccountOperations.createEstablishmentAdmin(
          client,
          userAccountData,
          ipAddress,
          userAgent
        );

        // Step 2: Update establishment with business info
        const establishmentUpdateData = {
          establishmentId: invitationData.establishment.id,
          businessInfo: sanitizedBusinessInfo,
          status: 'active'
        };

        const updatedEstablishment = await this.establishmentOperations.updateEstablishmentWithBusinessInfo(
          client,
          establishmentUpdateData,
          createdUser.id,
          ipAddress,
          userAgent
        );

        // Step 3: Create establishment schema for data isolation
        const schemaCreationData = {
          establishmentId: invitationData.establishment.id,
          establishmentName: sanitizedBusinessInfo.companyName
        };

        const createdSchema = await this.schemaOperations.createEstablishmentSchema(
          client,
          schemaCreationData,
          createdUser.id,
          ipAddress,
          userAgent
        );

        // Step 4: Mark invitation as completed
        this.logger.info('About to mark invitation as completed', { 
          token: invitationData.token.substring(0, 8) + '...',
          establishmentId: invitationData.establishment.id 
        });
        
        const invitationCompletionData = {
          token: invitationData.token,
          establishmentId: invitationData.establishment.id,
          userEmail: invitationData.establishment.email
        };

        await this.invitationOperations.completeInvitation(
          client,
          invitationCompletionData,
          createdUser.id,
          ipAddress,
          userAgent
        );
        
        this.logger.info('Invitation completion finished successfully');

        // Commit transaction
        await client.query('COMMIT');

        this.logger.info('Establishment account creation completed successfully', {
          establishmentId: invitationData.establishment.id,
          userId: createdUser.id,
          schemaName: createdSchema.schemaName
        });

        // Send setup completion email (truly non-blocking)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        setImmediate(async () => {
          try {
            await this.emailService.sendTemplateEmail(
              'establishment_setup',
              createdUser.email,
              {
                ownerName: sanitizedBusinessInfo.companyName,
                establishmentName: sanitizedBusinessInfo.companyName,
                loginUrl: `${frontendUrl}/login`,
                supportUrl: `${frontendUrl}/support`,
                dashboardUrl: `${frontendUrl}/dashboard`,
                setupDate: new Date().toLocaleDateString('en-US'),
              }
            );
            this.logger.info('Establishment setup completion email sent successfully', { 
              email: createdUser.email,
              establishmentName: sanitizedBusinessInfo.companyName 
            });
          } catch (emailError) {
            this.logger.error('Failed to send establishment setup completion email', emailError as Error);
          }
        });

        return {
          success: true,
          user: {
            id: createdUser.id,
            email: createdUser.email,
            role: createdUser.role,
            establishment_id: createdUser.establishmentId
          },
          establishment: {
            id: updatedEstablishment.id,
            name: updatedEstablishment.name,
            status: updatedEstablishment.status
          },
          token: createdUser.token
        };

      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      this.logger.error('Establishment account creation failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

}
