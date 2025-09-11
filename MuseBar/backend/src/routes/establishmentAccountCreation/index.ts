/**
 * Establishment Account Creation Routes
 * Main route handler for establishment account creation flow
 */

import { Router, Request, Response, NextFunction } from 'express';
import { validateBody } from '../../middleware/validation';
import { validateInvitation } from './middleware/validateInvitation';
import { validateBusinessInfo } from './middleware/validateBusinessInfo';
import { Logger } from '../../utils/logger';
import { EstablishmentAccountService } from '../../services/establishmentAccountCreation/EstablishmentAccountService';
import { 
  EstablishmentAccountCreationRequest,
  EstablishmentAccountCreationResponse 
} from './types';

const router = Router();
const logger = Logger.getInstance();

// Initialize service (will be injected with database pool)
let establishmentAccountService: EstablishmentAccountService;

// Extend Request interface to include validation results
declare global {
  namespace Express {
    interface Request {
      invitationValidation?: any;
      validatedBusinessInfo?: any;
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body as EstablishmentAccountCreationRequest;
      const invitation = req.invitationValidation;
      const businessInfo = req.validatedBusinessInfo;

      // Password validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        });
      }

      // Initialize service if not already done
      if (!establishmentAccountService) {
        const pool = req.app.locals.db;
        establishmentAccountService = new EstablishmentAccountService(pool, logger);
      }

      // Process account creation
      const response = await establishmentAccountService.completeAccountCreation({
        token,
        password,
        businessInfo
      });

      res.json(response);
    } catch (error) {
      logger.error('Establishment account creation error', error as Error);
      next(error);
    }
  }
);

/**
 * GET /validate/:token
 * Validate invitation token (for frontend pre-validation)
 */
router.get('/validate/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    
    // TODO: Implement token validation service
    // This will be implemented in Phase 1, Step 2
    
    res.json({
      success: true,
      message: 'Token validation endpoint ready',
      token
    });
  } catch (error) {
    logger.error('Token validation error', error as Error);
    next(error);
  }
});

export default router;
