/**
 * User Management Routes (Simplified for current setup)
 * Basic user management endpoints for testing
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';

const router = express.Router();

/**
 * Test email configuration (Admin only)
 * POST /api/user-management/test-email
 */
router.post('/test-email', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { testEmail } = req.body;
    const user = (req as any).user;

    if (!testEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test email address is required' 
      });
    }

    // For now, just return success without actually sending email
    // This allows testing the route structure
    console.log(`Email test requested by user ${user.id} for ${testEmail}`);

    res.status(200).json({
      success: true,
      message: 'Email test endpoint working (email service not yet configured)',
      data: {
        testEmail,
        testerUserId: user.id,
        note: 'Email service needs SendGrid API key configuration'
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get user management statistics (Admin only)
 * GET /api/user-management/stats
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User management system is running',
      data: {
        status: 'operational',
        features: {
          emailService: 'pending_configuration',
          userInvitations: 'ready_for_implementation',
          passwordResets: 'ready_for_implementation'
        },
        note: 'Configure SendGrid API key to enable email features'
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Health check for user management
 * GET /api/user-management/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User management routes are active',
    timestamp: new Date().toISOString()
  });
});

export default router; 