/**
 * Setup Validator - Validation Logic
 * Handles all validation for the setup process
 */

import { PoolClient } from 'pg';
import { InvitationQueries } from '../../utils/database';
import { BusinessSetupRequest, InvitationData, UserExistsResult, SetupValidationError } from './types';
import {
  validateSetupData as vrValidateSetupData,
  validatePassword as vrValidatePassword,
  validateEmails as vrValidateEmails,
  validatePhone as vrValidatePhone,
  validateBusinessData as vrValidateBusinessData,
  validateSIRET as vrValidateSIRET,
  validateTVA as vrValidateTVA,
  validateInvitationToken as vrValidateInvitationToken,
  validateLuhnAlgorithm as vrValidateLuhnAlgorithm
} from './validator';

/**
 * Setup Validation Service
 */
export class SetupValidator {
  /**
   * Validate complete setup data
   */
  static validateSetupData(setupData: BusinessSetupRequest): SetupValidationError[] {
    return vrValidateSetupData(setupData);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): SetupValidationError[] {
    return vrValidatePassword(password);
  }

  /**
   * Validate email addresses
   */
  static validateEmails(userEmail: string, contactEmail: string): SetupValidationError[] {
    return vrValidateEmails(userEmail, contactEmail);
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): SetupValidationError[] {
    return vrValidatePhone(phone);
  }

  /**
   * Validate business data
   */
  static validateBusinessData(setupData: BusinessSetupRequest): SetupValidationError[] {
    return vrValidateBusinessData(setupData);
  }

  /**
   * Validate French SIRET number
   */
  static validateSIRET(siret: string): SetupValidationError[] {
    return vrValidateSIRET(siret);
  }

  /**
   * Validate French TVA number
   */
  static validateTVA(tva: string): SetupValidationError[] {
    return vrValidateTVA(tva);
  }

  /**
   * Validate invitation token format
   */
  static validateInvitationToken(token: string): SetupValidationError[] {
    return vrValidateInvitationToken(token);
  }

  /**
   * Validate user existence and eligibility
   */
  static async validateUserEligibility(
    client: PoolClient,
    email: string
  ): Promise<UserExistsResult> {
    const existingUser = await client.query(
      'SELECT id, establishment_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length === 0) {
      return { exists: false, hasEstablishment: false };
    }

    const user = existingUser.rows[0];
    const hasEstablishment = user.establishment_id !== null;

    return {
      exists: true,
      userId: user.id,
      hasEstablishment
    };
  }

  /**
   * Validate invitation for setup process
   */
  static async validateInvitationForSetup(
    client: PoolClient,
    invitationToken: string
  ): Promise<InvitationData> {
    // First validate token format
    const tokenErrors = this.validateInvitationToken(invitationToken);
    if (tokenErrors.length > 0) {
      throw new Error(tokenErrors[0]?.message ?? 'Invalid invitation token');
    }

    // Check invitation in database (shared InvitationQueries.getInvitationByToken)
    const invitation = await InvitationQueries.getInvitationByToken(client, invitationToken);
    if (!invitation) {
      throw new Error('Invalid or expired invitation token');
    }

    // Check if establishment is already active
    if (invitation.establishment_status === 'active') {
      throw new Error('This establishment has already been set up');
    }

    return {
      establishment_id: invitation.establishment_id,
      establishment_name: invitation.establishment_name,
      establishment_status: invitation.establishment_status,
      invitation_id: invitation.id,
      expires_at: invitation.expires_at
    };
  }

  /**
   * Luhn algorithm validation (for SIRET)
   */
  private static validateLuhnAlgorithm(number: string): boolean {
    return vrValidateLuhnAlgorithm(number);
  }

  /**
   * Validate all setup data and throw on first error
   */
  static validateSetupDataStrict(setupData: BusinessSetupRequest): void {
    const errors = this.validateSetupData(setupData);
    if (errors.length > 0) {
      throw new Error(errors[0]?.message ?? 'Invalid setup data');
    }
  }

  /**
   * Check if setup data is valid
   */
  static isSetupDataValid(setupData: BusinessSetupRequest): boolean {
    const errors = this.validateSetupData(setupData);
    return errors.length === 0;
  }
}

