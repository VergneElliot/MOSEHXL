/**
 * Setup Validator - Validation Logic
 * Handles all validation for the setup process
 */

import { PoolClient } from 'pg';
import {
  BusinessSetupRequest,
  InvitationValidation,
  InvitationData,
  UserExistsResult,
  SetupValidationError
} from './types';

/**
 * Setup Validation Service
 */
export class SetupValidator {
  /**
   * Validate complete setup data
   */
  static validateSetupData(setupData: BusinessSetupRequest): SetupValidationError[] {
    const errors: SetupValidationError[] = [];

    // Required field validation
    const requiredFields = [
      { field: 'first_name', value: setupData.first_name, name: 'First name' },
      { field: 'last_name', value: setupData.last_name, name: 'Last name' },
      { field: 'email', value: setupData.email, name: 'Email' },
      { field: 'password', value: setupData.password, name: 'Password' },
      { field: 'business_name', value: setupData.business_name, name: 'Business name' },
      { field: 'contact_email', value: setupData.contact_email, name: 'Contact email' },
      { field: 'phone', value: setupData.phone, name: 'Phone' },
      { field: 'address', value: setupData.address, name: 'Address' },
      { field: 'invitation_token', value: setupData.invitation_token, name: 'Invitation token' }
    ];

    for (const field of requiredFields) {
      if (!field.value || field.value.trim() === '') {
        errors.push({
          field: field.field,
          message: `${field.name} is required`
        });
      }
    }

    // Password confirmation validation
    if (setupData.password !== setupData.confirm_password) {
      errors.push({
        field: 'confirm_password',
        message: 'Passwords do not match'
      });
    }

    // Password strength validation
    const passwordErrors = this.validatePassword(setupData.password);
    errors.push(...passwordErrors);

    // Email format validation
    const emailErrors = this.validateEmails(setupData.email, setupData.contact_email);
    errors.push(...emailErrors);

    // Phone validation
    const phoneErrors = this.validatePhone(setupData.phone);
    errors.push(...phoneErrors);

    // Business validation
    const businessErrors = this.validateBusinessData(setupData);
    errors.push(...businessErrors);

    return errors;
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): SetupValidationError[] {
    const errors: SetupValidationError[] = [];

    if (!password) {
      return errors; // Already handled by required field validation
    }

    if (password.length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter'
      });
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter'
      });
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number'
      });
    }

    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one special character'
      });
    }

    return errors;
  }

  /**
   * Validate email addresses
   */
  static validateEmails(userEmail: string, contactEmail: string): SetupValidationError[] {
    const errors: SetupValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (userEmail && !emailRegex.test(userEmail)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format'
      });
    }

    if (contactEmail && !emailRegex.test(contactEmail)) {
      errors.push({
        field: 'contact_email',
        message: 'Invalid contact email format'
      });
    }

    return errors;
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): SetupValidationError[] {
    const errors: SetupValidationError[] = [];

    if (!phone) {
      return errors; // Already handled by required field validation
    }

    // French phone number format validation
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      errors.push({
        field: 'phone',
        message: 'Invalid French phone number format'
      });
    }

    return errors;
  }

  /**
   * Validate business data
   */
  static validateBusinessData(setupData: BusinessSetupRequest): SetupValidationError[] {
    const errors: SetupValidationError[] = [];

    // Business name length validation
    if (setupData.business_name && setupData.business_name.length > 255) {
      errors.push({
        field: 'business_name',
        message: 'Business name must be less than 255 characters'
      });
    }

    // SIRET validation (if provided)
    if (setupData.siret_number) {
      const siretErrors = this.validateSIRET(setupData.siret_number);
      errors.push(...siretErrors);
    }

    // TVA number validation (if provided)
    if (setupData.tva_number) {
      const tvaErrors = this.validateTVA(setupData.tva_number);
      errors.push(...tvaErrors);
    }

    // Address validation
    if (setupData.address && setupData.address.length > 500) {
      errors.push({
        field: 'address',
        message: 'Address must be less than 500 characters'
      });
    }

    return errors;
  }

  /**
   * Validate French SIRET number
   */
  static validateSIRET(siret: string): SetupValidationError[] {
    const errors: SetupValidationError[] = [];

    if (!siret) {
      return errors;
    }

    // Remove spaces and check length
    const cleanSiret = siret.replace(/\s/g, '');
    if (cleanSiret.length !== 14) {
      errors.push({
        field: 'siret_number',
        message: 'SIRET number must be exactly 14 digits'
      });
      return errors;
    }

    // Check if all characters are digits
    if (!/^\d{14}$/.test(cleanSiret)) {
      errors.push({
        field: 'siret_number',
        message: 'SIRET number must contain only digits'
      });
      return errors;
    }

    // Luhn algorithm validation for SIRET
    const isValid = this.validateLuhnAlgorithm(cleanSiret);
    if (!isValid) {
      errors.push({
        field: 'siret_number',
        message: 'Invalid SIRET number format'
      });
    }

    return errors;
  }

  /**
   * Validate French TVA number
   */
  static validateTVA(tva: string): SetupValidationError[] {
    const errors: SetupValidationError[] = [];

    if (!tva) {
      return errors;
    }

    // French TVA format: FR + 2 digits + 9 digits SIREN
    const tvaRegex = /^FR[0-9A-Z]{2}[0-9]{9}$/;
    if (!tvaRegex.test(tva.toUpperCase().replace(/\s/g, ''))) {
      errors.push({
        field: 'tva_number',
        message: 'Invalid French TVA number format (should be FR + 2 characters + 9 digits)'
      });
    }

    return errors;
  }

  /**
   * Validate invitation token format
   */
  static validateInvitationToken(token: string): SetupValidationError[] {
    const errors: SetupValidationError[] = [];

    if (!token) {
      errors.push({
        field: 'invitation_token',
        message: 'Invitation token is required'
      });
      return errors;
    }

    // Token should be a UUID or similar format
    const tokenRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!tokenRegex.test(token)) {
      errors.push({
        field: 'invitation_token',
        message: 'Invalid invitation token format'
      });
    }

    return errors;
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
      throw new Error(tokenErrors[0].message);
    }

    // Check invitation in database
    const invitationQuery = await client.query(`
      SELECT ui.*, e.id as establishment_id, e.name as establishment_name, e.status as establishment_status
      FROM user_invitations ui
      LEFT JOIN establishments e ON ui.establishment_id = e.id
      WHERE ui.invitation_token = $1 
        AND ui.status = 'pending'
        AND ui.expires_at > CURRENT_TIMESTAMP
    `, [invitationToken]);

    if (invitationQuery.rows.length === 0) {
      throw new Error('Invalid or expired invitation token');
    }

    const invitation = invitationQuery.rows[0];

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
    let sum = 0;
    let isEven = false;

    // Process digits from right to left
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate all setup data and throw on first error
   */
  static validateSetupDataStrict(setupData: BusinessSetupRequest): void {
    const errors = this.validateSetupData(setupData);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
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

