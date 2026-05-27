/**
 * Setup Routes - Handle business setup wizard API endpoints
 */

import express from 'express';
import { SetupService } from '../services/setup/SetupService';
import { validateParams, validateBody } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = express.Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);

// GET /api/setup/validate/:token - Validate invitation token
router.get('/validate/:token', validateParams([{ param: 'token', validator: (v: string)=> typeof v === 'string' && v.length > 0 }]), asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;
    const setupService = SetupService.getInstance();
    const result = await setupService.validateInvitation(token);

    if (!result.isValid) {
      throw new ValidationError(
        typeof result.error === 'string' ? result.error : 'Invalid invitation token',
        { result: result as unknown as Record<string, unknown> }
      );
    }

    res.json(result);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error validating invitation token', { error: error as Error }, 'SETUP_API');
    throw new AppError(
      error instanceof Error ? error.message : 'Internal server error during validation',
      500,
      'SETUP_VALIDATE_FAILED'
    );
  }
}));

// GET /api/setup/status/:token - Check setup completion status
router.get('/status/:token', validateParams([{ param: 'token', validator: (v: string)=> typeof v === 'string' && v.length > 0 }]), asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;
    const setupService = SetupService.getInstance();
    const result = await setupService.checkSetupStatus(token);

    if (result.error) {
      throw new NotFoundError(typeof result.error === 'string' ? result.error : 'Setup status');
    }

    res.json(result);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error checking setup status', { error: error as Error }, 'SETUP_API');
    throw new AppError(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      'SETUP_STATUS_FAILED'
    );
  }
}));

// POST /api/setup/complete - Complete business setup
router.post('/complete', validateBody([
  { field: 'first_name', required: true },
  { field: 'last_name', required: true },
  { field: 'email', required: true },
  { field: 'password', required: true },
  { field: 'confirm_password', required: true },
  { field: 'business_name', required: true },
  { field: 'contact_email', required: true },
  { field: 'phone', required: true },
  { field: 'address', required: true },
  { field: 'invitation_token', required: true }
]), asyncHandler(async (req, res) => {
  try {
    const setupService = SetupService.getInstance();
    const result = await setupService.completeBusinessSetup(
      req.body,
      req.ip,
      req.headers['user-agent']
    );

    if (!result.success) {
      throw new ValidationError(
        typeof result.message === 'string' ? result.message : 'Failed to complete setup',
        { result: result as unknown as Record<string, unknown> }
      );
    }

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error completing business setup', { error: error as Error }, 'SETUP_API');
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to complete setup. Please try again.',
      500,
      'SETUP_COMPLETE_FAILED'
    );
  }
}));

export default router;