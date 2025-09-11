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
      { field: 'taxId', name: 'Tax ID' },
      { field: 'siret', name: 'SIRET number' },
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
    // Tax ID validation (basic format)
    if (businessInfo.taxId && businessInfo.taxId.length < 5) {
      errors.push('Tax ID appears to be too short');
    }

    // SIRET validation (14 digits)
    if (businessInfo.siret && !/^\d{14}$/.test(businessInfo.siret)) {
      errors.push('SIRET number must be exactly 14 digits');
    }

    // French postal code validation (5 digits)
    if (businessInfo.postalCode && !/^\d{5}$/.test(businessInfo.postalCode)) {
      errors.push('Postal code must be 5 digits');
    }

    // Phone number validation
    if (businessInfo.phone && !/^[\d\s\+\-\(\)]+$/.test(businessInfo.phone)) {
      errors.push('Phone number contains invalid characters');
    }

    // Business type validation
    const validBusinessTypes = ['restaurant', 'bar', 'cafe', 'bistro', 'other'];
    if (businessInfo.businessType && !validBusinessTypes.includes(businessInfo.businessType)) {
      errors.push('Invalid business type selected');
    }
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

    // SIRET checksum validation (simplified)
    if (businessInfo.siret && businessInfo.siret.length === 14) {
      if (!this.validateSiretChecksum(businessInfo.siret)) {
        errors.push('SIRET number appears to be invalid (checksum validation failed)');
      }
    }

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
      siret: businessInfo.siret?.trim() || '',
      businessType: businessInfo.businessType?.trim() || '',
      address: businessInfo.address?.trim() || '',
      city: businessInfo.city?.trim() || '',
      postalCode: businessInfo.postalCode?.trim() || '',
      phone: businessInfo.phone?.trim() || ''
    };
  }
}
