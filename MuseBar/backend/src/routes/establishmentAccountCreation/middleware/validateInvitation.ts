/**
 * Invitation Validation Middleware
 * Validates invitation tokens for establishment account creation
 */

import { Request, Response, NextFunction } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../../../app';
import { InvitationQueries } from '../../../utils/database';
import { InvitationValidationResult } from '../types';
import { Logger } from '../../../utils/logger';

/**
 * Validate invitation token middleware
 */
export const validateInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;
    const logger = Logger.getInstance();
    
    logger.info('validateInvitation middleware started', { tokenPreview: token?.substring(0, 8) + '...' });

    if (!token) {
      logger.warn('No token provided in request body');
      res.status(400).json({
        success: false,
        error: 'Invitation token is required'
      });
      return;
    }

    logger.info('Getting database connection from pool...');
    const client = await pool.connect();
    logger.info('Database client connected successfully');

    try {
      logger.info('About to validate invitation token...');
      const validation = await validateInvitationToken(client, token, logger);
      logger.info('Invitation token validation completed', { isValid: validation.isValid });
      
      if (!validation.isValid) {
        logger.warn('Invitation validation failed', { error: validation.error });
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }

      // Attach validation result to request
      req.invitationValidation = validation;
      logger.info('Calling next() to proceed to route handler');
      next();
    } finally {
      logger.info('Releasing database client connection');
      client.release();
    }
  } catch (error) {
    const logger = Logger.getInstance();
    logger.error('Invitation validation error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during invitation validation'
    });
  }
};

/**
 * Validate invitation token (uses shared InvitationQueries.getInvitationByToken).
 */
async function validateInvitationToken(
  client: PoolClient,
  token: string,
  logger: Logger
): Promise<InvitationValidationResult> {
  try {
    logger.info('Starting database query for invitation validation');
    const invitation = await InvitationQueries.getInvitationByToken(client, token);
    logger.info('SQL query completed', { found: !!invitation });

    if (!invitation) {
      return { isValid: false, token, error: 'Invalid or expired invitation token' };
    }
    if (!invitation.establishment_id) {
      return { isValid: false, token, error: 'Invitation not associated with an establishment' };
    }
    if (invitation.establishment_status === 'active') {
      return { isValid: false, token, error: 'Establishment setup already completed' };
    }
    return {
      isValid: true,
      token,
      establishment: {
        id: invitation.establishment_id,
        name: invitation.establishment_name,
        email: invitation.establishment_email,
        status: invitation.establishment_status
      }
    };
  } catch (error) {
    logger.error('Database error during invitation validation', error as Error);
    return { isValid: false, token, error: 'Database error during validation' };
  }
}
