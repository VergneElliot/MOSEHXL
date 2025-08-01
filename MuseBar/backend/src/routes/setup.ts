/**
 * Setup Routes - Handle business setup wizard API endpoints
 */

import express from 'express';
import { SetupService } from '../services/SetupService';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = Logger.getInstance();

// GET /api/setup/validate/:token - Validate invitation token
router.get('/validate/:token', async (req, res) => {
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
      error: 'Internal server error during validation' 
    });
  }
});

// GET /api/setup/status/:token - Check setup completion status
router.get('/status/:token', async (req, res) => {
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
      error: 'Internal server error' 
    });
  }
});

// POST /api/setup/complete - Complete business setup
router.post('/complete', async (req, res) => {
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
      message: 'Failed to complete setup. Please try again.'
    });
  }
});

export default router;