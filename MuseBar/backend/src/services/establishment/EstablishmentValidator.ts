/**
 * Establishment Validator
 * Handles validation logic for establishment creation and updates
 */

import { Logger } from '../../utils/logger';

/**
 * Enhanced establishment creation request interface
 */
export interface EnhancedCreateEstablishmentRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  tva_number?: string;
  siret_number?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
  business_type?: 'restaurant' | 'bar' | 'cafe' | 'retail' | 'other';
  timezone?: string;
  language?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Establishment Validator Class
 */
export class EstablishmentValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate establishment creation data
   */
  public validateEstablishmentData(data: EnhancedCreateEstablishmentRequest): ValidationResult {
    const errors: string[] = [];

    // Validate name
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Establishment name must be at least 2 characters long');
    }

    // Validate email
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Valid email address is required');
    }

    // Validate phone (if provided)
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Phone number format is invalid');
    }

    // Validate subscription plan
    if (data.subscription_plan && !this.isValidSubscriptionPlan(data.subscription_plan)) {
      errors.push('Invalid subscription plan');
    }

    // Validate business type
    if (data.business_type && !this.isValidBusinessType(data.business_type)) {
      errors.push('Invalid business type');
    }

    // Validate timezone (if provided)
    if (data.timezone && !this.isValidTimezone(data.timezone)) {
      errors.push('Invalid timezone format');
    }

    // Validate language (if provided)
    if (data.language && !this.isValidLanguage(data.language)) {
      errors.push('Invalid language code');
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(
        'Establishment validation failed',
        { errors, data },
        'ESTABLISHMENT_VALIDATOR'
      );
    }

    return { isValid, errors };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate subscription plan
   */
  private isValidSubscriptionPlan(plan: string): boolean {
    return ['basic', 'premium', 'enterprise'].includes(plan);
  }

  /**
   * Validate business type
   */
  private isValidBusinessType(type: string): boolean {
    return ['restaurant', 'bar', 'cafe', 'retail', 'other'].includes(type);
  }

  /**
   * Validate timezone
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate language code
   */
  private isValidLanguage(language: string): boolean {
    return ['fr', 'en', 'es', 'de', 'it'].includes(language);
  }
}
