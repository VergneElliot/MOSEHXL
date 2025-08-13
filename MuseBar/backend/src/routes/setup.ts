/**
 * Setup Routes - Handle business setup wizard API endpoints
 */

import express from 'express';
import { SetupService } from '../services/SetupService';
import { validateParams, validateBody } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';

const router = express.Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);

// GET /api/setup/validate/:token - Validate invitation token
router.get('/validate/:token', validateParams([{ param: 'token', validator: (v:any)=> typeof v === 'string' && v.length > 0 }]), async (req, res) => {
  try {
    const { token } = req.params;
    const setupService = new SetupService(logger);
    const result = await setupService.validateInvitationToken(token);

    if (!result.isValid) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error validating invitation token', error as Error, {}, 'SETUP_API');
    res.status(500).json({ 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Internal server error during validation' 
    });
  }
});

// GET /api/setup/status/:token - Check setup completion status
router.get('/status/:token', validateParams([{ param: 'token', validator: (v:any)=> typeof v === 'string' && v.length > 0 }]), async (req, res) => {
  try {
    const { token } = req.params;
    const setupService = new SetupService(logger);
    const result = await setupService.checkSetupStatus(token);

    if (result.error) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error checking setup status', error as Error, {}, 'SETUP_API');
    res.status(500).json({ 
      completed: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

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
]), async (req, res) => {
  try {
    const setupService = new SetupService(logger);
    const result = await setupService.completeBusinessSetup(
      req.body,
      req.ip,
      req.headers['user-agent']
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error completing business setup', error as Error, {}, 'SETUP_API');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to complete setup. Please try again.'
    });
  }
});

export default router;