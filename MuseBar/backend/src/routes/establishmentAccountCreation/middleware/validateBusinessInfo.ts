/**
 * Business Info Validation Middleware
 * Validates business information for establishment account creation
 */

import { Request, Response, NextFunction } from 'express';
import { BusinessInfo, BusinessInfoValidationResult } from '../types';
import { Logger } from '../../../utils/logger';

/**
 * Validate business information middleware
 */
export const validateBusinessInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { businessInfo } = req.body;
    const logger = Logger.getInstance();

    if (!businessInfo) {
      res.status(400).json({
        success: false,
        error: 'Business information is required'
      });
      return;
    }

    const validation = validateBusinessInfoData(businessInfo, logger);
    
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Business information validation failed',
        details: validation.errors
      });
      return;
    }

    // Attach validated data to request
    req.validatedBusinessInfo = validation.validatedData!;
    next();
  } catch (error) {
    const logger = Logger.getInstance();
    logger.error('Business info validation error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during business info validation'
    });
  }
};

/**
 * Validate business information data
 */
function validateBusinessInfoData(
  businessInfo: BusinessInfo,
  logger: Logger
): BusinessInfoValidationResult {
  const errors: string[] = [];

  // Required field validation
  // Tax ID is optional - no validation required

  // SIRET number is optional - no validation required

  if (!businessInfo.businessType || businessInfo.businessType.trim().length === 0) {
    errors.push('Business type is required');
  }

  if (!businessInfo.address || businessInfo.address.trim().length === 0) {
    errors.push('Address is required');
  }

  if (!businessInfo.city || businessInfo.city.trim().length === 0) {
    errors.push('City is required');
  }

  if (!businessInfo.postalCode || businessInfo.postalCode.trim().length === 0) {
    errors.push('Postal code is required');
  }

  // NO RESTRICTIONS WHATSOEVER on Tax ID and SIRET - user can enter anything

  if (businessInfo.postalCode && !/^\d{5}$/.test(businessInfo.postalCode)) {
    errors.push('Postal code must be 5 digits');
  }

  // Phone validation removed as it's not in the new interface

  return {
    isValid: errors.length === 0,
    errors,
    validatedData: errors.length === 0 ? businessInfo : undefined
  };
}
