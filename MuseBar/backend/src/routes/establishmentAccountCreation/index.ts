/**
 * Establishment Account Creation Routes
 * Main route handler for establishment account creation flow
 */

import { Router, Request, Response } from 'express';
import { validateBody } from '../../middleware/validation';
import { validateInvitation } from './middleware/validateInvitation';
import { validateBusinessInfo } from './middleware/validateBusinessInfo';
import { Logger } from '../../utils/logger';
import { validatePasswordWithBreachCheck } from '../../utils/passwordValidation';
import { pool } from '../../db/pool';
import { asyncHandler } from '../../middleware/errorHandler';
import { EstablishmentAccountService } from '../../services/establishmentAccountCreation/EstablishmentAccountService';
import { 
  EstablishmentAccountCreationRequest,
} from './types';

const router = Router();
const logger = Logger.getInstance();

// Initialize service (will be injected with database pool)
let establishmentAccountService: EstablishmentAccountService;

// Extend Request interface to include validation results
declare global {
  namespace Express {
    interface Request {
      invitationValidation?: unknown;
      validatedBusinessInfo?: unknown;
    }
  }
}

/**
 * POST /complete
 * Complete establishment account creation
 */
router.post('/complete', 
  validateBody([
    { field: 'token', required: true },
    { field: 'password', required: true },
    { field: 'businessInfo', required: true }
  ]),
  validateInvitation,
  validateBusinessInfo,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Route handler started for establishment account creation');
      const { token, password } = req.body as EstablishmentAccountCreationRequest;
      const businessInfo = req.validatedBusinessInfo ?? req.body.businessInfo;
      void req.invitationValidation;

      logger.info('Extracted request data', { tokenPreview: token.substring(0, 8) + '...', businessType: businessInfo.businessType });

      const passwordValidation = await validatePasswordWithBreachCheck(password);
      if (!passwordValidation.isValid) {
        logger.warn('Password validation failed', { error: passwordValidation.error });
        return res.status(400).json({
          success: false,
          error: passwordValidation.error ?? 'Invalid password'
        });
      }

      // Initialize service if not already done
      if (!establishmentAccountService) {
        logger.info('Initializing EstablishmentAccountService');
        establishmentAccountService = new EstablishmentAccountService(pool, logger);
        logger.info('EstablishmentAccountService initialized');
      }

      logger.info('About to call completeAccountCreation');
      // Use the invitation from middleware validation
      const response = await establishmentAccountService.completeAccountCreation({
        token,
        password,
        businessInfo
      });

      logger.info('Account creation completed, sending response');
      res.json(response);
    } catch (error) {
      logger.error('Establishment account creation error', error as Error);
      throw error;
    }
  })
);

/**
 * GET /health
 * Health check endpoint for establishment account creation service
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Establishment Account Creation Service is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}));

/**
 * GET /validate/:token
 * Validate invitation token (for frontend pre-validation)
 */
router.get('/validate/:token', asyncHandler(async (req: Request, res: Response) => {
  try {
    const token = req.params.token ?? '';
    
    // Initialize service if not already done
    if (!establishmentAccountService) {
      establishmentAccountService = new EstablishmentAccountService(pool, logger);
    }

    // Validate the invitation token
    const validationResult = await establishmentAccountService.validateInvitation(token);
    
    res.json(validationResult);
  } catch (error) {
    logger.error('Token validation error', error as Error);
    throw error;
  }
}));

export default router;
