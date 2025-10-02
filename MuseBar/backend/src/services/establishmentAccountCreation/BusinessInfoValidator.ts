/**
 * Business Info Validator
 * Enhanced validation for French business information
 */

import { BusinessInfo, BusinessInfoValidationResult } from '../../routes/establishmentAccountCreation/types';
import { Logger } from '../../utils/logger';

/**
 * Business Info Validator Class
 */
export class BusinessInfoValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate business information with enhanced French-specific rules
   */
  public validateBusinessInfo(businessInfo: BusinessInfo): BusinessInfoValidationResult {
    const errors: string[] = [];

    // Required field validation
    this.validateRequiredFields(businessInfo, errors);
    
    // Format validation
    this.validateFormats(businessInfo, errors);
    
    // French-specific validation
    this.validateFrenchBusinessRules(businessInfo, errors);

    return {
      isValid: errors.length === 0,
      errors,
      validatedData: errors.length === 0 ? businessInfo : undefined
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(businessInfo: BusinessInfo, errors: string[]): void {
    const requiredFields = [
      // Tax ID and SIRET are optional - no validation required
      { field: 'businessType', name: 'Business type' },
      { field: 'address', name: 'Address' },
      { field: 'city', name: 'City' },
      { field: 'postalCode', name: 'Postal code' }
    ];

    requiredFields.forEach(({ field, name }) => {
      const value = businessInfo[field as keyof BusinessInfo];
      if (!value || value.toString().trim().length === 0) {
        errors.push(`${name} is required`);
      }
    });
  }

  /**
   * Validate field formats
   */
  private validateFormats(businessInfo: BusinessInfo, errors: string[]): void {
    // NO RESTRICTIONS WHATSOEVER on Tax ID and SIRET - user can enter anything

    // French postal code validation (5 digits)
    if (businessInfo.postalCode && !/^\d{5}$/.test(businessInfo.postalCode)) {
      errors.push('Postal code must be 5 digits');
    }

    // Phone number validation removed as it's not in the new interface

    // Business type validation - accept any business type (no restrictions)
    // Frontend sends capitalized types like "Bar", "Restaurant", etc.
    // We accept all business types to avoid validation issues
  }

  /**
   * Validate French business rules
   */
  private validateFrenchBusinessRules(businessInfo: BusinessInfo, errors: string[]): void {
    // French postal code range validation
    if (businessInfo.postalCode) {
      const postalCode = parseInt(businessInfo.postalCode);
      if (postalCode < 1000 || postalCode > 99999) {
        errors.push('Postal code must be a valid French postal code');
      }
    }

    // SIRET checksum validation removed - no format restrictions for now

    // Address length validation
    if (businessInfo.address && businessInfo.address.length < 10) {
      errors.push('Address appears to be too short');
    }

    // City name validation
    if (businessInfo.city && businessInfo.city.length < 2) {
      errors.push('City name appears to be too short');
    }
  }

  /**
   * Validate SIRET checksum (simplified Luhn algorithm)
   */
  private validateSiretChecksum(siret: string): boolean {
    try {
      // Simplified SIRET validation - in production, use proper SIRET validation library
      const digits = siret.split('').map(Number);
      let sum = 0;
      let isEven = false;

      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = digits[i];
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
    } catch (error) {
      this.logger.warn('SIRET checksum validation failed', { siret, error });
      return false;
    }
  }

  /**
   * Sanitize business information
   */
  public sanitizeBusinessInfo(businessInfo: BusinessInfo): BusinessInfo {
    return {
      taxId: businessInfo.taxId?.trim() || '',
      siretNumber: businessInfo.siretNumber?.trim() || '',
      businessType: businessInfo.businessType?.trim() || '',
      address: businessInfo.address?.trim() || '',
      city: businessInfo.city?.trim() || '',
      postalCode: businessInfo.postalCode?.trim() || '',
      country: businessInfo.country?.trim() || '',
      companyName: businessInfo.companyName?.trim() || ''
    };
  }
}
